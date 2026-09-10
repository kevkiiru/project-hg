import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import { Permission, SupportStatus } from '@hiregari/types';
import { CurrentUser, Public, RequirePermission, ZodBody } from '../../core/http/decorators';
import type { AuthUser } from '../../core/http/types';
import { SupportService } from './support.service';

const create = z.object({
  category: z.string().min(2).max(60),
  subject: z.string().min(3).max(200),
  body: z.string().min(10).max(4000),
  email: z.string().email().optional(),
  bookingRef: z.string().optional(),
});
const reply = z.object({ body: z.string().min(1).max(4000) });

@Controller('api/v1/support')
export class SupportController {
  constructor(private readonly support: SupportService) {}

  @Public()
  @Post('requests')
  create(@CurrentUser() user: AuthUser | undefined, @ZodBody(create) body: z.infer<typeof create>) {
    return this.support.create(user?.id ?? null, body);
  }

  @Get('requests')
  mine(@CurrentUser() user: AuthUser) {
    return this.support.listMine(user.id);
  }

  @Post('requests/:reference/reply')
  reply(@CurrentUser() user: AuthUser, @Param('reference') reference: string, @ZodBody(reply) body: z.infer<typeof reply>) {
    return this.support.append(user.id, reference, body.body, 'USER');
  }
}

@Controller('api/v1/admin/support')
export class AdminSupportController {
  constructor(private readonly support: SupportService) {}

  @RequirePermission(Permission.ADMIN_USERS_READ)
  @Get('requests')
  list(@Query('status') status?: SupportStatus) {
    return this.support.listAll(status);
  }

  @RequirePermission(Permission.ADMIN_USERS_READ)
  @Post('requests/:reference/reply')
  reply(@CurrentUser() user: AuthUser, @Param('reference') reference: string, @ZodBody(reply) body: z.infer<typeof reply>) {
    return this.support.append(user.id, reference, body.body, 'AGENT');
  }

  @RequirePermission(Permission.ADMIN_USERS_READ)
  @Post('requests/:reference/status')
  status(@Param('reference') reference: string, @ZodBody(z.object({ status: z.nativeEnum(SupportStatus) })) body: z.infer<typeof reply> & { status: SupportStatus }) {
    return this.support.setStatus(reference, body.status);
  }
}
