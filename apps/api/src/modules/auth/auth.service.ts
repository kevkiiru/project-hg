import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import {
  OtpChannel,
  OtpPurpose,
  RoleName,
  UserStatus,
} from '@hiregari/types';
import { DB, type Db } from '../../db/db.module';
import {
  customerProfiles,
  otpChallenges,
  roleAssignments,
  sessions,
  users,
} from '../../db/schema/identity';
import { config } from '../../core/config/config';
import { logger } from '../../core/logger';
import {
  generateOtp,
  generateToken,
  hashOtp,
  hashPassword,
  hashToken,
  safeEqual,
  verifyPassword,
} from '../../core/crypto';
import { AppError, ErrorCode, rateLimited, unauthorized, unprocessable } from '../../core/http/errors';
import { RateLimiter } from './rate-limiter';
import { normalizeKePhone } from './phone';
import { EMAIL, SMS } from '../../integrations/integrations.module';
import type { AuthUser } from '../../core/http/types';
import type { SmsPort, EmailPort } from '../../integrations/ports';

export interface SessionResult {
  token: string;
  csrfToken: string;
  expiresAt: Date;
  user: AuthUser;
}

@Injectable()
export class AuthService {
  private limiter = new RateLimiter();

  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(SMS) private readonly sms: SmsPort,
    @Inject(EMAIL) private readonly email: EmailPort,
  ) {}

  normalizePhone(input?: string | null) {
    if (!input) return null;
    return normalizeKePhone(input);
  }

  private async sendOtpCode(channel: OtpChannel, to: string, code: string, purpose: OtpPurpose) {
    const body =
      purpose === 'LOGIN'
        ? `Your Hiregari verification code is ${code}. It expires in ${Math.round(
            config().OTP_TTL_SECONDS / 60,
          )} minutes. Never share it.`
        : `Your Hiregari code is ${code}.`;
    if (channel === 'SMS') await this.sms.send(to, body, { template: 'otp' });
    else await this.email.send(to, 'Your Hiregari code', `<p>Your code is <strong>${code}</strong></p>`, body);
  }

  async requestOtp(
    input: { channel: OtpChannel; to: string; purpose: OtpPurpose },
    meta: { ip?: string } = {},
  ) {
    const cfg = config();
    let to = input.to.trim();
    if (input.channel === 'SMS') {
      const phone = normalizeKePhone(to);
      if (!phone) throw unprocessable('INVALID_PHONE', 'Enter a Kenyan phone number like 07XXXXXXXX.');
      to = phone;
    }
    const limit = this.limiter.check(`otp:${to}`, cfg.OTP_RATE_LIMIT_PER_HOUR, 3_600_000);
    if (!limit.allowed) {
      throw rateLimited(`Too many codes requested. Try again in ${limit.retryAfter} seconds.`);
    }
    if (meta.ip) {
      const ipLimit = this.limiter.check(`otp-ip:${meta.ip}`, 20, 3_600_000);
      if (!ipLimit.allowed) throw rateLimited('Too many requests from this network. Try again later.');
    }

    const code = generateOtp(6);
    const expiresAt = new Date(Date.now() + cfg.OTP_TTL_SECONDS * 1000);
    const existingUser =
      input.channel === 'SMS'
        ? await this.db.select().from(users).where(eq(users.phoneE164, to)).limit(1)
        : await this.db
            .select()
            .from(users)
            .where(eq(users.emailNormalized, to.toLowerCase()))
            .limit(1);

    await this.db.insert(otpChallenges).values({
      userId: existingUser[0]?.id ?? null,
      channel: input.channel,
      purpose: input.purpose,
      to,
      codeHash: hashOtp(code),
      maxAttempts: cfg.OTP_MAX_ATTEMPTS,
      expiresAt,
      ip: meta.ip,
    });

    await this.sendOtpCode(input.channel, to, code, input.purpose);
    return { sent: true, challengeExpiresAt: expiresAt };
  }

  async verifyOtp(input: { challengeId: string; code: string }): Promise<SessionResult> {
    const challenge = await this.db
      .select()
      .from(otpChallenges)
      .where(eq(otpChallenges.id, input.challengeId))
      .limit(1);
    if (!challenge[0]) throw unauthorized('This verification code is no longer valid.', ErrorCode.UNAUTHENTICATED);
    const c = challenge[0];

    if (c.consumedAt) throw unprocessable('OTP_CONSUMED', 'This code has already been used. Request a new one.');
    if (c.expiresAt < new Date()) throw unprocessable('OTP_EXPIRED', 'This code has expired. Request a new one.');
    if (c.attempts >= c.maxAttempts) throw unprocessable('OTP_LOCKED', 'Too many attempts. Request a new code.');
    if (!safeEqual(hashOtp(input.code), c.codeHash)) {
      await this.db
        .update(otpChallenges)
        .set({ attempts: c.attempts + 1 })
        .where(eq(otpChallenges.id, c.id));
      throw unprocessable('OTP_INCORRECT', 'That code is incorrect. Check and try again.');
    }

    await this.db
      .update(otpChallenges)
      .set({ consumedAt: new Date() })
      .where(eq(otpChallenges.id, c.id));

    let user = c.userId
      ? (await this.db.select().from(users).where(eq(users.id, c.userId)).limit(1))[0]
      : c.channel === 'SMS'
        ? (await this.db.select().from(users).where(eq(users.phoneE164, c.to)).limit(1))[0]
        : (await this.db.select().from(users).where(eq(users.emailNormalized, c.to.toLowerCase())).limit(1))[0];

    if (!user) {
      // First phone/email login provisions the account; identity details are
      // completed in the profile step (data minimization).
      user = (
        await this.db
          .insert(users)
          .values({
            phoneE164: c.channel === 'SMS' ? c.to : null,
            email: c.channel === 'EMAIL' ? c.to : null,
            emailNormalized: c.channel === 'EMAIL' ? c.to.toLowerCase() : null,
            firstName: '',
            lastName: '',
            status: UserStatus.ACTIVE,
            phoneVerifiedAt: c.channel === 'SMS' ? new Date() : null,
            emailVerifiedAt: c.channel === 'EMAIL' ? new Date() : null,
          })
          .returning()
      )[0]!;
      await this.db.insert(customerProfiles).values({
        userId: user.id,
        legalFirstName: '',
        legalLastName: '',
      });
      await this.db.insert(roleAssignments).values({
        userId: user.id,
        role: RoleName.CUSTOMER,
        scopeType: 'GLOBAL',
      });
    } else {
      await this.db
        .update(users)
        .set(
          c.channel === 'SMS'
            ? { phoneVerifiedAt: new Date(), lastLoginAt: new Date() }
            : { emailVerifiedAt: new Date(), lastLoginAt: new Date() },
        )
        .where(eq(users.id, user.id));
    }

    if (user.status === 'SUSPENDED') {
      throw new AppError(403, 'ACCOUNT_SUSPENDED', 'This account is suspended. Contact support.');
    }
    return this.createSession(user.id);
  }

  async register(
    input: {
      firstName: string;
      lastName: string;
      email?: string;
      phone?: string;
      password?: string;
    },
    meta: { ip?: string } = {},
  ) {
    const phone = input.phone ? normalizeKePhone(input.phone) : null;
    if (input.phone && !phone) {
      throw unprocessable('INVALID_PHONE', 'Enter a Kenyan phone number like 07XXXXXXXX.');
    }
    const email = input.email?.toLowerCase().trim();
    const clash = await this.db
      .select({ id: users.id, phone: users.phoneE164, email: users.emailNormalized })
      .from(users)
      .where(phone ? eq(users.phoneE164, phone) : eq(users.emailNormalized, email ?? ''))
      .limit(1);
    if (clash[0]) {
      throw new AppError(409, 'ACCOUNT_EXISTS', 'An account with these details already exists. Try signing in.');
    }

    const user = (
      await this.db
        .insert(users)
        .values({
          firstName: input.firstName,
          lastName: input.lastName,
          email: email ?? null,
          emailNormalized: email ?? null,
          phoneE164: phone,
          passwordHash: input.password ? hashPassword(input.password) : null,
          status: UserStatus.REGISTERED,
          phoneVerifiedAt: null,
        })
        .returning()
    )[0]!;
    await this.db.insert(customerProfiles).values({
      userId: user.id,
      legalFirstName: input.firstName,
      legalLastName: input.lastName,
    });
    await this.db.insert(roleAssignments).values({
      userId: user.id,
      role: RoleName.CUSTOMER,
      scopeType: 'GLOBAL',
    });

    if (phone) await this.requestOtp({ channel: 'SMS', to: phone, purpose: OtpPurpose.VERIFY_PHONE }, meta);
    else if (email) await this.requestOtp({ channel: 'EMAIL', to: email, purpose: OtpPurpose.VERIFY_EMAIL }, meta);

    return { userId: user.id, verificationRequired: true };
  }

  async passwordLogin(identifier: string, password: string): Promise<SessionResult> {
    const phone = normalizeKePhone(identifier);
    const email = identifier.toLowerCase().trim();
    const found = phone
      ? await this.db.select().from(users).where(eq(users.phoneE164, phone)).limit(1)
      : await this.db.select().from(users).where(eq(users.emailNormalized, email)).limit(1);
    const user = found[0];
    if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
      if (user) {
        await this.db
          .update(users)
          .set({ failedLoginCount: user.failedLoginCount + 1 })
          .where(eq(users.id, user.id));
      }
      throw unauthorized('Incorrect sign-in details. Please try again or use a one-time code.');
    }
    if (user.status === 'SUSPENDED') {
      throw new AppError(403, 'ACCOUNT_SUSPENDED', 'This account is suspended. Contact support.');
    }
    await this.db
      .update(users)
      .set({ failedLoginCount: 0, lastLoginAt: new Date(), lockedUntil: null })
      .where(eq(users.id, user.id));
    return this.createSession(user.id);
  }

  async createSession(userId: string): Promise<SessionResult> {
    const token = generateToken(32);
    const csrfToken = generateToken(24);
    const expiresAt = new Date(Date.now() + config().SESSION_TTL_HOURS * 3_600_000);
    const user = (await this.db.select().from(users).where(eq(users.id, userId)).limit(1))[0]!;
    await this.db.insert(sessions).values({
      userId,
      tokenHash: hashToken(token),
      csrfSecret: csrfToken,
      expiresAt,
    });
    const authUser = await this.loadAuthUser(userId);
    return { token, csrfToken, expiresAt, user: authUser! };
  }

  async loadAuthUser(userId: string): Promise<AuthUser | null> {
    const user = (await this.db.select().from(users).where(eq(users.id, userId)).limit(1))[0];
    if (!user) return null;
    const roles = await this.db.select().from(roleAssignments).where(eq(roleAssignments.userId, userId));
    return {
      id: user.id,
      email: user.email,
      phoneE164: user.phoneE164,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
      roles: roles.map((r) => ({ role: r.role as RoleName, scopeType: r.scopeType, scopeId: r.scopeId })),
      mfaVerifiedAt: null,
      sessionId: '',
      csrfSecret: null,
    };
  }

  async resolveSessionToken(token: string): Promise<{ session: any; user: AuthUser } | null> {
    const session = (
      await this.db
        .select()
        .from(sessions)
        .where(eq(sessions.tokenHash, hashToken(token)))
        .limit(1)
    )[0];
    if (!session || session.revokedAt || session.expiresAt < new Date()) return null;
    const user = await this.loadAuthUser(session.userId);
    if (!user) return null;
    user.sessionId = session.id;
    user.csrfSecret = session.csrfSecret;
    user.mfaVerifiedAt = session.mfaVerifiedAt;
    await this.db.update(sessions).set({ lastUsedAt: new Date() }).where(eq(sessions.id, session.id));
    return { session, user };
  }

  async revokeSession(token: string) {
    await this.db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(eq(sessions.tokenHash, hashToken(token)));
  }

  async latestDevOtp(to: string) {
    if (config().NODE_ENV === 'production') throw new AppError(404, ErrorCode.NOT_FOUND, 'Not found');
    const row = (
      await this.db
        .select()
        .from(otpChallenges)
        .where(eq(otpChallenges.to, to))
        .orderBy(otpChallenges.createdAt)
        .limit(1)
    )[0];
    // Code itself is one-way hashed; dev mock SMS retains plaintext.
    logger.debug('dev otp lookup', { to });
    return row ? { challengeId: row.id, expiresAt: row.expiresAt } : null;
  }
}

export { randomUUID };
