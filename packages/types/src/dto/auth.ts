import { z } from 'zod';
import { e164Phone } from './common';

export const otpPurpose = z.enum(['LOGIN', 'VERIFY_PHONE', 'VERIFY_LOGIN']);

export const otpRequest = z.object({
  channel: z.enum(['SMS', 'EMAIL']).default('SMS'),
  to: z.string().trim().min(3),
  purpose: otpPurpose.default('LOGIN'),
});
export type OtpRequest = z.infer<typeof otpRequest>;

export const otpVerify = z.object({
  challengeId: z.string().uuid(),
  code: z.string().regex(/^\d{4,6}$/),
});
export type OtpVerify = z.infer<typeof otpVerify>;

export const register = z.object({
  phone: e164Phone.optional(),
  email: z.string().email().optional(),
  password: z
    .string()
    .min(10)
    .regex(/[A-Z]/)
    .regex(/[0-9]/)
    .optional(),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  agreeTerms: z.literal(true, { errorMap: () => ({ message: 'You must accept the terms' }) }),
  agreePrivacy: z.literal(true),
});
export type Register = z.infer<typeof register>;

export const loginPassword = z.object({
  identifier: z.string().trim().min(3),
  password: z.string().min(1),
});
export type LoginPassword = z.infer<typeof loginPassword>;
