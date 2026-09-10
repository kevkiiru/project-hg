import { Body, Controller, Get, Inject, Param, Post } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { ActorType, Permission, RoleName } from '@hiregari/types';
import { CurrentUser, RequirePermission, ZodBody } from '../../core/http/decorators';
import type { AuthUser } from '../../core/http/types';
import { DB, type Db } from '../../db/db.module';
import { bookings } from '../../db/schema/commerce';
import { hostProfiles } from '../../db/schema/hosts';
import { payments } from '../../db/schema/money';
import { forbidden, notFound } from '../../core/http/errors';
import { RefundsService } from './refunds.service';

const manual = z.object({
  bookingRef: z.string().min(4),
  paymentReference: z.string().min(4),
  amountCents: z.number().int().positive(),
  reason: z.string().min(3).max(1000),
});

@Controller('api/v1')
export class RefundsController {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly refunds: RefundsService,
  ) {}

  @Get('bookings/:reference/refunds')
  async list(@CurrentUser() user: AuthUser, @Param('reference') reference: string) {
    const booking = (
      await this.db.select().from(bookings).where(eq(bookings.reference, reference)).limit(1)
    )[0];
    if (!booking) throw notFound('Booking');
    if (booking.customerId !== user.id) {
      const host = (
        await this.db.select().from(hostProfiles).where(eq(hostProfiles.userId, user.id)).limit(1)
      )[0];
      if (!host || host.id !== booking.hostProfileId) throw forbidden();
    }
    return this.refunds.listForBooking(booking.id);
  }

  @RequirePermission(Permission.ADMIN_REFUNDS_CREATE)
  @Post('admin/refunds')
  async manualRefund(@CurrentUser() user: AuthUser, @ZodBody(manual) body: z.infer<typeof manual>) {
    const booking = (
      await this.db.select().from(bookings).where(eq(bookings.reference, body.bookingRef)).limit(1)
    )[0];
    if (!booking) throw notFound('Booking');
    const payment = (
      await this.db
        .select()
        .from(payments)
        .where(and(eq(payments.reference, body.paymentReference), eq(payments.bookingId, booking.id)))
        .limit(1)
    )[0];
    if (!payment) throw notFound('Payment');
    return this.refunds.create({
      bookingId: booking.id,
      paymentId: payment.id,
      amountCents: body.amountCents,
      reason: body.reason,
      actorType: ActorType.ADMIN,
      actorId: user.id,
      idempotencyKey: `manual:${user.id}:${payment.id}:${body.amountCents}`,
    });
  }
}

@Controller('api/v1/admin/refunds')
export class AdminRefundsController {
  constructor(private readonly refunds: RefundsService) {}

  @RequirePermission(Permission.ADMIN_REFUNDS_CREATE)
  @Get()
  list() {
    return this.refunds.listAll();
  }
}
