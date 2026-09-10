import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { z } from 'zod';
import { ActorType, AdminRoles, Permission, RoleName } from '@hiregari/types';
import { CurrentUser, RequirePermission, ZodBody } from '../../core/http/decorators';
import type { AuthUser } from '../../core/http/types';
import { hasRole, isHostSide } from '../../core/http/types';
import { DamageService, type DamageReportDto } from './damage.service';

const report = z.object({
  category: z.string().min(1).max(80),
  description: z.string().min(2).max(4000),
  estimatedAmountCents: z.number().int().nonnegative().optional(),
  photoKeys: z.array(z.string().min(1)).max(20).optional(),
});
const propose = z.object({ amountCents: z.number().int().positive(), note: z.string().max(2000).default('') });
const close = z.object({ note: z.string().max(2000).default('') });
const dispute = z.object({ description: z.string().min(5).max(4000) });
const decide = z.object({ amountCents: z.number().int().nonnegative(), note: z.string().max(2000).default('') });
const resolve = z.object({ resolution: z.string().min(5).max(4000) });
const note = z.object({ body: z.string().min(1).max(4000) });

@Controller('api/v1/bookings/:reference')
export class DamageController {
  constructor(private readonly damage: DamageService) {}

  @Post('damage')
  report(
    @CurrentUser() user: AuthUser,
    @Param('reference') reference: string,
    @ZodBody(report) body: DamageReportDto,
  ) {
    return this.damage.report(user.id, reference, body);
  }

  @Get('damage')
  list(@CurrentUser() user: AuthUser, @Param('reference') reference: string) {
    return this.damage.listForBooking(reference, user.id);
  }

  @Get('disputes')
  disputes(@CurrentUser() user: AuthUser, @Param('reference') reference: string) {
    return this.damage.listDisputesForBooking(reference, user.id);
  }
}

@Controller('api/v1/damage')
export class DamageActionsController {
  constructor(private readonly damage: DamageService) {}

  @Post(':id/accept')
  accept(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.damage.renterAccept(user.id, id);
  }

  @Post(':id/dispute')
  dispute(@CurrentUser() user: AuthUser, @Param('id') id: string, @ZodBody(dispute) body: z.infer<typeof dispute>) {
    return this.damage.renterDispute(user.id, id, body.description);
  }
}

@Controller('api/v1/host/damage')
export class HostDamageController {
  constructor(private readonly damage: DamageService) {}

  @RequirePermission(Permission.INSPECTION_SUBMIT)
  @Post(':id/propose')
  propose(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @ZodBody(propose) body: z.infer<typeof propose>,
  ) {
    return this.damage.hostPropose(user.id, id, body.amountCents, body.note);
  }

  @RequirePermission(Permission.INSPECTION_SUBMIT)
  @Post(':id/close')
  close(@CurrentUser() user: AuthUser, @Param('id') id: string, @ZodBody(close) body: z.infer<typeof close>) {
    return this.damage.hostCloseNoCharge(user.id, id, body.note);
  }
}

@Controller('api/v1/admin')
export class AdminDamageController {
  constructor(private readonly damage: DamageService) {}

  @RequirePermission(Permission.ADMIN_DISPUTES_HANDLE)
  @Get('damage/open')
  open() {
    return this.damage.listOpenForAdmin();
  }

  @RequirePermission(Permission.ADMIN_DISPUTES_HANDLE)
  @Post('damage/:id/decide')
  decide(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @ZodBody(decide) body: z.infer<typeof decide>,
  ) {
    return this.damage.adminDecide(user.id, id, body.amountCents, body.note);
  }

  @RequirePermission(Permission.ADMIN_DISPUTES_HANDLE)
  @Post('disputes/:reference/resolve')
  resolve(
    @CurrentUser() user: AuthUser,
    @Param('reference') reference: string,
    @ZodBody(resolve) body: z.infer<typeof resolve>,
  ) {
    return this.damage.adminResolveDispute(user.id, reference, body.resolution);
  }

  @Post('disputes/:reference/messages')
  message(
    @CurrentUser() user: AuthUser,
    @Param('reference') reference: string,
    @ZodBody(note) body: z.infer<typeof note>,
  ) {
    const actor = hasRole(user, ...AdminRoles)
      ? ActorType.ADMIN
      : isHostSide(user)
        ? ActorType.HOST
        : ActorType.CUSTOMER;
    return this.damage.addDisputeMessage(user.id, reference, body.body, actor);
  }
}
