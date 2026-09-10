import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import { PayoutStatus, Permission } from '@hiregari/types';
import { CurrentUser, RequirePermission, ZodBody } from '../../core/http/decorators';
import type { AuthUser } from '../../core/http/types';
import { PayoutsService } from './payouts.service';

const markPaid = z.object({ providerRef: z.string().min(3).max(200) });
const markFailed = z.object({ reason: z.string().min(2).max(500) });

@Controller('api/v1/host/payouts')
export class HostPayoutsController {
  constructor(private readonly payouts: PayoutsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.payouts.listForHost(user.id);
  }

  @Get('preview')
  preview(@CurrentUser() user: AuthUser) {
    return this.payouts.previewForHost(user.id);
  }

  @Get(':reference')
  detail(@CurrentUser() user: AuthUser, @Param('reference') reference: string) {
    return this.payouts.detailForHost(user.id, reference);
  }
}

@Controller('api/v1/admin/payouts')
export class AdminPayoutsController {
  constructor(private readonly payouts: PayoutsService) {}

  @RequirePermission(Permission.ADMIN_PAYOUTS_READ)
  @Get()
  list(@Query('status') status?: PayoutStatus) {
    return this.payouts.listAll(status);
  }

  @RequirePermission(Permission.ADMIN_PAYOUTS_READ)
  @Get(':reference')
  detail(@Param('reference') reference: string) {
    return this.payouts.detail(reference);
  }

  @RequirePermission(Permission.ADMIN_PAYOUTS_APPROVE)
  @Post('create-due')
  createDue(@CurrentUser() user: AuthUser) {
    return this.payouts.createDueBatches(user.id);
  }

  @RequirePermission(Permission.ADMIN_PAYOUTS_APPROVE)
  @Post(':reference/mark-paid')
  markPaid(
    @CurrentUser() user: AuthUser,
    @Param('reference') reference: string,
    @ZodBody(markPaid) body: z.infer<typeof markPaid>,
  ) {
    return this.payouts.markPaid(user.id, reference, body.providerRef);
  }

  @RequirePermission(Permission.ADMIN_PAYOUTS_APPROVE)
  @Post(':reference/mark-failed')
  markFailed(
    @CurrentUser() user: AuthUser,
    @Param('reference') reference: string,
    @ZodBody(markFailed) body: z.infer<typeof markFailed>,
  ) {
    return this.payouts.markFailed(user.id, reference, body.reason);
  }
}
