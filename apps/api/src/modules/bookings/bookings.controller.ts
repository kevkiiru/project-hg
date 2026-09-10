import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import { ActorType, BookingMode, BookingStatus, Permission, RoleName } from '@hiregari/types';
import { CurrentUser, RequirePermission, RequireRole, ZodBody } from '../../core/http/decorators';
import type { AuthUser } from '../../core/http/types';
import { hasRole, isHostSide } from '../../core/http/types';
import { BookingsService } from './bookings.service';

const create = z.object({
  quoteId: z.string().uuid(),
  mode: z.nativeEnum(BookingMode).optional(),
});
const respond = z.object({ accept: z.boolean(), reason: z.string().max(500).optional() });
const cancel = z.object({ reason: z.string().min(2).max(500) });
const extension = z.object({ newReturnAt: z.string().datetime() });

@Controller('api/v1/bookings')
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @RequirePermission(Permission.BOOKING_CREATE)
  @Post()
  create(@CurrentUser() user: AuthUser, @ZodBody(create) body: z.infer<typeof create>) {
    return this.bookings.create(user.id, body.quoteId, body.mode);
  }

  @Get('mine')
  mine(@CurrentUser() user: AuthUser, @Query('status') status?: BookingStatus) {
    return this.bookings.listForCustomer(user.id, status);
  }

  @Get(':reference')
  async get(@CurrentUser() user: AuthUser, @Param('reference') reference: string) {
    const actorType = isHostSide(user) ? ActorType.HOST : ActorType.CUSTOMER;
    return this.bookings.getByReference(reference, user.id, actorType);
  }

  @Post(':reference/cancel')
  cancel(
    @CurrentUser() user: AuthUser,
    @Param('reference') reference: string,
    @ZodBody(cancel) body: z.infer<typeof cancel>,
  ) {
    const isHost = isHostSide(user);
    return this.bookings.cancel(
      user.id,
      reference,
      body.reason,
      isHost ? ActorType.HOST : ActorType.CUSTOMER,
    );
  }

  @Post(':reference/extension-quote')
  extension(
    @CurrentUser() user: AuthUser,
    @Param('reference') reference: string,
    @ZodBody(extension) body: z.infer<typeof extension>,
  ) {
    return this.bookings.extensionQuote(user.id, reference, body.newReturnAt);
  }
}

@Controller('api/v1/host/bookings')
export class HostBookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @RequirePermission(Permission.BOOKING_HOST_READ)
  @Get()
  list(@CurrentUser() user: AuthUser, @Query('status') status?: BookingStatus) {
    return this.bookings.listForHost(user.id, status);
  }

  @RequirePermission(Permission.BOOKING_HOST_RESPOND)
  @Post(':reference/respond')
  respond(
    @CurrentUser() user: AuthUser,
    @Param('reference') reference: string,
    @ZodBody(respond) body: z.infer<typeof respond>,
  ) {
    return this.bookings.hostRespond(user.id, reference, body.accept, body.reason);
  }
}
