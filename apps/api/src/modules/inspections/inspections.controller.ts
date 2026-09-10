import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { z } from 'zod';
import { ActorType, Permission, RoleName } from '@hiregari/types';
import { CurrentUser, RequirePermission, ZodBody } from '../../core/http/decorators';
import type { AuthUser } from '../../core/http/types';
import { hasRole, isHostSide } from '../../core/http/types';
import { InspectionsService, type InspectionDto } from './inspections.service';

const dto = z.object({
  odometerKm: z.number().nonnegative().max(1_000_000).optional(),
  fuelLevel: z.number().min(0).max(100).optional(),
  exteriorNotes: z.string().max(4000).optional(),
  interiorNotes: z.string().max(4000).optional(),
  notes: z.string().max(4000).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  photoKeys: z.array(z.string().min(1)).max(30).optional(),
  angles: z.array(z.string().max(60)).max(30).optional(),
  actualReturnedAt: z.string().datetime().optional(),
});

@Controller('api/v1/bookings/:reference/inspections')
export class InspectionsController {
  constructor(private readonly inspections: InspectionsService) {}

  @Get()
  get(@CurrentUser() user: AuthUser, @Param('reference') reference: string) {
    const actorType = isHostSide(user) ? ActorType.HOST : ActorType.CUSTOMER;
    return this.inspections.getForBooking(reference, user.id, actorType);
  }

  @RequirePermission(Permission.INSPECTION_SUBMIT)
  @Post('pickup')
  pickup(
    @CurrentUser() user: AuthUser,
    @Param('reference') reference: string,
    @ZodBody(dto) body: InspectionDto & { actualReturnedAt?: string },
  ) {
    return this.inspections.submitPickup(user.id, reference, body);
  }

  @RequirePermission(Permission.INSPECTION_SUBMIT)
  @Post('return')
  ret(
    @CurrentUser() user: AuthUser,
    @Param('reference') reference: string,
    @ZodBody(dto) body: InspectionDto & { actualReturnedAt?: string },
  ) {
    return this.inspections.submitReturn(user.id, reference, body);
  }

  @Post('pickup/sign')
  signPickup(@CurrentUser() user: AuthUser, @Param('reference') reference: string) {
    return this.inspections.renterSignPickup(user.id, reference);
  }

  @Post('return/sign')
  signReturn(@CurrentUser() user: AuthUser, @Param('reference') reference: string) {
    return this.inspections.renterSignReturn(user.id, reference);
  }
}
