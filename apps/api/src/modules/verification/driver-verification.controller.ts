import { Body, Controller, Get, Post } from '@nestjs/common';
import { z } from 'zod';
import { KycIdType } from '@hiregari/types';
import { ZodBody, CurrentUser } from '../../core/http/decorators';
import type { AuthUser } from '../../core/http/types';
import { DriverVerificationService } from './driver-verification.service';

const docKey = z.object({
  documentType: z.string().min(2),
  objectKey: z.string().min(4),
  fileName: z.string().min(1),
  contentType: z.string().min(3),
});

const submission = z.object({
  legalFirstName: z.string().trim().min(1).max(100),
  legalLastName: z.string().trim().min(1).max(100),
  dob: z.string().datetime({ offset: true }),
  nationality: z.string().trim().length(2),
  idType: z.nativeEnum(KycIdType),
  idNumber: z.string().trim().min(3).max(60),
  licenceNumber: z.string().trim().min(3).max(60),
  licenceCountry: z.string().trim().length(2),
  licenceIssuedAt: z.string().datetime({ offset: true }).optional(),
  licenceExpiresAt: z.string().datetime({ offset: true }),
  selfieObjectKey: z.string().optional(),
  documentKeys: z.array(docKey).optional(),
});

@Controller('api/v1/driver-verifications')
export class DriverVerificationController {
  constructor(private readonly svc: DriverVerificationService) {}

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.svc.getByUser(user.id);
  }

  @Post()
  submit(@CurrentUser() user: AuthUser, @ZodBody(submission) body: any) {
    return this.svc.submit(user.id, body);
  }
}
