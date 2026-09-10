import { Controller, Get, Inject, Param } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { CurrentUser } from '../../core/http/decorators';
import type { AuthUser } from '../../core/http/types';
import { DB, type Db } from '../../db/db.module';
import { bookings } from '../../db/schema/commerce';
import { hostProfiles } from '../../db/schema/hosts';
import { forbidden, notFound } from '../../core/http/errors';
import { DepositsService } from './deposits.service';

@Controller('api/v1')
export class DepositsController {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly depositsService: DepositsService,
  ) {}

  @Get('bookings/:reference/deposit')
  async forBooking(@CurrentUser() user: AuthUser, @Param('reference') reference: string) {
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
    return this.depositsService.getForBooking(booking.id);
  }
}
void and;
