import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { Dto } from '@hiregari/types';
import { ZodBody, CurrentUser, Public } from '../../core/http/decorators';
import type { AuthUser } from '../../core/http/types';
import { config } from '../../core/config/config';
import { AppError, ErrorCode } from '../../core/http/errors';
import { AuthService } from './auth.service';

const registerSchema = z
  .object({
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    password: z.string().min(10).regex(/[A-Z]/).regex(/[0-9]/).optional(),
    agreeTerms: z.literal(true),
    agreePrivacy: z.literal(true),
  })
  .refine((d) => d.email || d.phone, { message: 'Provide an email or Kenyan phone number.', path: ['phone'] });

const loginSchema = z.object({
  identifier: z.string().trim().min(3),
  password: z.string().min(1),
});

function setSessionCookies(res: Response, token: string, csrf: string, expiresAt: Date) {
  const secure = config().NODE_ENV === 'production';
  res.cookie('hg_session', token, {
    httpOnly: true,
    secure,
    sameSite: secure ? 'strict' : 'lax',
    expires: expiresAt,
    path: '/',
  });
  res.cookie('hg_csrf', csrf, {
    httpOnly: false,
    secure,
    sameSite: secure ? 'strict' : 'lax',
    expires: expiresAt,
    path: '/',
  });
}

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  async register(@ZodBody(registerSchema) body: any, @Req() req: Request) {
    return this.auth.register(body, { ip: req.ip });
  }

  @Public()
  @Post('otp/request')
  async requestOtp(@ZodBody(Dto.otpRequest) body: any, @Req() req: Request) {
    return this.auth.requestOtp(body, { ip: req.ip });
  }

  @Public()
  @Post('otp/verify')
  async verifyOtp(@ZodBody(Dto.otpVerify) body: any, @Res({ passthrough: true }) res: Response) {
    const session = await this.auth.verifyOtp(body);
    setSessionCookies(res, session.token, session.csrfToken, session.expiresAt);
    return { user: session.user, expiresAt: session.expiresAt };
  }

  @Public()
  @Post('login')
  async login(@ZodBody(loginSchema) body: any, @Res({ passthrough: true }) res: Response) {
    const session = await this.auth.passwordLogin(body.identifier, body.password);
    setSessionCookies(res, session.token, session.csrfToken, session.expiresAt);
    return { user: session.user, expiresAt: session.expiresAt };
  }

  @Public()
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = (req as any).cookies?.hg_session as string | undefined;
    const authHeader = req.headers.authorization;
    const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    if (token) await this.auth.revokeSession(token);
    if (bearer) await this.auth.revokeSession(bearer);
    res.clearCookie('hg_session', { path: '/' });
    res.clearCookie('hg_csrf', { path: '/' });
    return { ok: true };
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return { user };
  }

  @Public()
  @Get('google')
  google() {
    throw new AppError(
      501,
      ErrorCode.FEATURE_DISABLED,
      'Google sign-in is configured for launch but not enabled in this environment.',
    );
  }
}
