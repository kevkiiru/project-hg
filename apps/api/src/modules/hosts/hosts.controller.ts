import { Controller, Get, Post, Put } from '@nestjs/common';
import { z } from 'zod';
import { HostType, Permission } from '@hiregari/types';
import { CurrentUser, RequirePermission, ZodBody } from '../../core/http/decorators';
import type { AuthUser } from '../../core/http/types';
import { HostsService } from './hosts.service';

const onboarding = z.object({
  type: z.nativeEnum(HostType),
  brandName: z.string().trim().min(1).max(120).optional(),
  bio: z.string().max(2000).optional(),
  business: z
    .object({
      name: z.string().trim().min(1).max(160),
      registrationNumber: z.string().max(80).optional(),
      kraPin: z.string().max(40).optional(),
      phone: z.string().optional(),
      email: z.string().email().optional(),
      authorizedRepresentativeName: z.string().max(120).optional(),
    })
    .optional(),
});

const documentSchema = z.object({
  owner: z.enum(['HOST', 'BUSINESS']),
  documentType: z.string().min(2),
  objectKey: z.string().min(4),
  fileName: z.string().min(1),
  contentType: z.string().min(3),
  issuedAt: z.string().datetime({ offset: true }).optional(),
  expiresAt: z.string().datetime({ offset: true }).optional(),
});

const staffSchema = z.object({
  identifier: z.string().email(),
  staffRole: z.string().min(2).max(60),
  permissions: z.array(z.string()).default([]),
});

@Controller('api/v1/host')
export class HostsController {
  constructor(private readonly hosts: HostsService) {}

  @Get('me')
  @RequirePermission(Permission.HOST_READ_SELF)
  me(@CurrentUser() user: AuthUser) {
    return this.hosts.getProfile(user.id);
  }

  @Post('onboarding')
  @RequirePermission(Permission.HOST_ONBOARD_SUBMIT)
  onboard(@CurrentUser() user: AuthUser, @ZodBody(onboarding) body: any) {
    return this.hosts.onboard(user.id, body);
  }

  @Post('documents')
  @RequirePermission(Permission.HOST_ONBOARD_SUBMIT)
  addDocument(@CurrentUser() user: AuthUser, @ZodBody(documentSchema) body: any) {
    return this.hosts.addDocument(user.id, body);
  }

  @Post('submit-verification')
  @RequirePermission(Permission.HOST_ONBOARD_SUBMIT)
  submit(@CurrentUser() user: AuthUser) {
    return this.hosts.submit(user.id);
  }

  @Put('staff')
  @RequirePermission(Permission.STAFF_MANAGE)
  addStaff(@CurrentUser() user: AuthUser, @ZodBody(staffSchema) body: any) {
    return this.hosts.addStaffMember(user.id, body);
  }
}
