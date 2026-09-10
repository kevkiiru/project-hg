import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DB, type Db } from '../../db/db.module';
import {
  addresses,
  consentRecords,
  customerProfiles,
  hostProfiles,
  roleAssignments,
  users,
} from '../../db/schema';
import { notFound } from '../../core/http/errors';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class UsersService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly audit: AuditService,
  ) {}

  async getAccount(userId: string) {
    const user = (await this.db.select().from(users).where(eq(users.id, userId)).limit(1))[0];
    if (!user) throw notFound('User');
    const [profile, host, roles] = await Promise.all([
      this.db.select().from(customerProfiles).where(eq(customerProfiles.userId, userId)).limit(1),
      this.db.select().from(hostProfiles).where(eq(hostProfiles.userId, userId)).limit(1),
      this.db.select().from(roleAssignments).where(eq(roleAssignments.userId, userId)),
    ]);
    const addressRows = await this.db
      .select()
      .from(addresses)
      .where(and(eq(addresses.entityType, 'CUSTOMER_PROFILE'), eq(addresses.entityId, profile[0]?.id ?? '')));
    return {
      user: this.sanitizeUser(user),
      customerProfile: profile[0] ?? null,
      hostProfile: host[0] ?? null,
      roles: roles.map((r) => ({ role: r.role, scopeType: r.scopeType, scopeId: r.scopeId })),
      addresses: addressRows,
    };
  }

  async updateUser(userId: string, patch: { firstName?: string; lastName?: string; avatarObjectKey?: string }) {
    await this.db.update(users).set(patch).where(eq(users.id, userId));
    return this.getAccount(userId);
  }

  async updateCustomerProfile(
    userId: string,
    patch: {
      legalFirstName?: string;
      legalLastName?: string;
      dob?: string;
      nationality?: string;
      countryOfResidence?: string;
      photoObjectKey?: string;
    },
  ) {
    const profile = (
      await this.db.select().from(customerProfiles).where(eq(customerProfiles.userId, userId)).limit(1)
    )[0];
    if (!profile) throw notFound('Customer profile');
    const set: any = { ...patch };
    if (patch.dob) set.dob = new Date(patch.dob);
    await this.db.transaction(async (tx) => {
      await tx.update(customerProfiles).set(set).where(eq(customerProfiles.id, profile.id));
      await tx
        .update(users)
        .set({
          firstName: patch.legalFirstName ?? undefined,
          lastName: patch.legalLastName ?? undefined,
          avatarObjectKey: patch.photoObjectKey ?? undefined,
        })
        .where(eq(users.id, userId));
    });
    return this.getAccount(userId);
  }

  async recordConsent(userId: string, purpose: string, granted: boolean, version = 'v1', ip?: string) {
    await this.db.insert(consentRecords).values({ userId, purpose, granted, version, ip });
    return { ok: true };
  }

  async addAddress(
    userId: string,
    address: {
      county?: string;
      city?: string;
      neighbourhood?: string;
      street?: string;
      landmark?: string;
      lat?: number;
      lng?: number;
      label?: string;
    },
  ) {
    const profile = (
      await this.db.select().from(customerProfiles).where(eq(customerProfiles.userId, userId)).limit(1)
    )[0]!;
    const row = (
      await this.db
        .insert(addresses)
        .values({
          entityType: 'CUSTOMER_PROFILE',
          entityId: profile.id,
          label: address.label,
          county: address.county,
          city: address.city,
          neighbourhood: address.neighbourhood,
          street: address.street,
          landmark: address.landmark,
          lat: address.lat,
          lng: address.lng,
        })
        .returning()
    )[0];
    return row;
  }

  /** DPA 2019: account deletion/anonymization workflow. Financial/audit
   * records are retained under legal hold (configurable retention, BLED-020). */
  async requestDeletion(userId: string, reason: string, requestId?: string) {
    const suffix = `deleted-${Date.now()}`;
    await this.db
      .update(users)
      .set({
        status: 'DELETED',
        deletedAt: new Date(),
        anonymizedAt: new Date(),
        email: null,
        emailNormalized: `anon+${suffix}@anonymized.local`,
        phoneE164: null,
        googleSubject: null,
        appleSubject: null,
        passwordHash: null,
        mfaSecretEnc: null,
        firstName: 'Deleted',
        lastName: 'User',
        avatarObjectKey: null,
        metadata: { deletionReason: reason },
      })
      .where(eq(users.id, userId));
    await this.audit.record({
      actorId: userId,
      action: 'USER.ANONYMIZE',
      entityType: 'USER',
      entityId: userId,
      reason,
      requestId,
    });
    return { ok: true, state: 'ANONYMIZED' };
  }

  sanitizeUser(user: any) {
    const { passwordHash, mfaSecretEnc, ...safe } = user;
    void passwordHash;
    void mfaSecretEnc;
    return safe;
  }
}
