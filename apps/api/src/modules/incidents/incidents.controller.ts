import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import { IncidentCategory, Permission } from '@hiregari/types';
import { CurrentUser, RequirePermission, ZodBody } from '../../core/http/decorators';
import type { AuthUser } from '../../core/http/types';
import { IncidentsService } from './incidents.service';

const report = z.object({
  category: z.nativeEnum(IncidentCategory),
  description: z.string().min(10).max(4000),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  photoKeys: z.array(z.string().min(1)).max(20).optional(),
  policeRef: z.string().max(100).optional(),
  contactPhone: z.string().max(30).optional(),
});

@Controller('api/v1/bookings/:reference/incidents')
export class IncidentsController {
  constructor(private readonly incidents: IncidentsService) {}

  @Post()
  report(
    @CurrentUser() user: AuthUser,
    @Param('reference') reference: string,
    @ZodBody(report) body: z.infer<typeof report>,
  ) {
    return this.incidents.report(user.id, reference, body);
  }

  @Get()
  list(@CurrentUser() user: AuthUser, @Param('reference') reference: string) {
    return this.incidents.listForBooking(user.id, reference);
  }
}

@Controller('api/v1/admin/incidents')
export class AdminIncidentsController {
  constructor(private readonly incidents: IncidentsService) {}

  @RequirePermission(Permission.ADMIN_INCIDENTS_HANDLE)
  @Get()
  list(@Query('status') status?: string) {
    return this.incidents.listAll(status);
  }

  @RequirePermission(Permission.ADMIN_INCIDENTS_HANDLE)
  @Post(':reference/acknowledge')
  acknowledge(@CurrentUser() user: AuthUser, @Param('reference') reference: string) {
    return this.incidents.acknowledge(user.id, reference);
  }

  @RequirePermission(Permission.ADMIN_INCIDENTS_HANDLE)
  @Post(':reference/resolve')
  resolve(@CurrentUser() user: AuthUser, @Param('reference') reference: string) {
    return this.incidents.resolve(user.id, reference);
  }
}
