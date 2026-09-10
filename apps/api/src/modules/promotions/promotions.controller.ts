import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { z } from 'zod';
import { PromoKind, Permission } from '@hiregari/types';
import { RequirePermission, ZodBody } from '../../core/http/decorators';
import { PromotionsService, type PromoUpsert } from './promotions.service';

const create = z.object({
  code: z.string().min(4).max(32),
  description: z.string().max(500).optional(),
  kind: z.nativeEnum(PromoKind),
  percentBps: z.number().int().positive().max(10_000).optional(),
  amountCents: z.number().int().positive().optional(),
  maxDiscountCents: z.number().int().positive().optional(),
  minBookingCents: z.number().int().nonnegative().optional(),
  scope: z.enum(['GLOBAL', 'HOST', 'VEHICLE']).optional(),
  scopeId: z.string().uuid().optional(),
  fundedBy: z.string().max(20).optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  maxRedemptions: z.number().int().positive().optional(),
  perUserOnce: z.boolean().optional(),
  active: z.boolean().optional(),
});

@Controller('api/v1/admin/promotions')
export class PromotionsController {
  constructor(private readonly promos: PromotionsService) {}

  @RequirePermission(Permission.ADMIN_PROMOTIONS_MANAGE)
  @Get()
  list() {
    return this.promos.list();
  }

  @RequirePermission(Permission.ADMIN_PROMOTIONS_MANAGE)
  @Post()
  create(@ZodBody(create) body: PromoUpsert) {
    return this.promos.create(body);
  }

  @RequirePermission(Permission.ADMIN_PROMOTIONS_MANAGE)
  @Patch(':id')
  update(@Param('id') id: string, @ZodBody(create.partial()) body: Partial<PromoUpsert>) {
    return this.promos.update(id, body);
  }

  @RequirePermission(Permission.ADMIN_PROMOTIONS_MANAGE)
  @Get(':id/redemptions')
  redemptions(@Param('id') id: string) {
    return this.promos.redemptions(id);
  }
}
