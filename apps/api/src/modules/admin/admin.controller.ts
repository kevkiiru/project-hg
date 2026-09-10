import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import { Permission, UserStatus } from '@hiregari/types';
import { CurrentUser, RequirePermission, ZodBody, ZodQueryParams } from '../../core/http/decorators';
import type { AuthUser } from '../../core/http/types';
import { AdminService } from './admin.service';
import { HostsService } from '../hosts/hosts.service';
import { VehiclesService } from '../vehicles/vehicles.service';
import { DriverVerificationService } from '../verification/driver-verification.service';

const usersQuery = z.object({
  search: z.string().max(120).optional(),
  status: z.string().max(30).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});
const status = z.object({ status: z.nativeEnum(UserStatus), reason: z.string().max(500).optional() });
const decide = z.object({ decision: z.enum(['VERIFIED', 'REJECTED', 'SUSPENDED', 'APPROVED', 'MANUAL_REVIEW']), reason: z.string().max(1000).optional() });

@Controller('api/v1/admin')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly hosts: HostsService,
    private readonly vehicles: VehiclesService,
    private readonly drivers: DriverVerificationService,
  ) {}

  @RequirePermission(Permission.ADMIN_USERS_READ)
  @Get('overview')
  overview() {
    return this.admin.overview();
  }

  @RequirePermission(Permission.ADMIN_USERS_READ)
  @Get('users')
  users(@ZodQueryParams(usersQuery) q: z.infer<typeof usersQuery>) {
    return this.admin.listUsers(q);
  }

  @RequirePermission(Permission.ADMIN_USERS_MANAGE)
  @Post('users/:id/status')
  setStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @ZodBody(status) body: z.infer<typeof status>,
  ) {
    return this.admin.setUserStatus(user.id, id, body.status, body.reason);
  }

  @RequirePermission(Permission.ADMIN_HOSTS_READ)
  @Get('hosts/pending')
  pendingHosts() {
    return this.admin.pendingHosts();
  }

  @RequirePermission(Permission.ADMIN_HOSTS_VERIFY)
  @Post('hosts/:id/decide')
  decideHost(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @ZodBody(decide) body: z.infer<typeof decide>,
  ) {
    const d = body.decision === 'APPROVED' ? 'VERIFIED' : body.decision;
    return this.hosts.decide(user.id, id, d as 'VERIFIED' | 'REJECTED' | 'SUSPENDED', body.reason);
  }

  @RequirePermission(Permission.ADMIN_VEHICLES_READ)
  @Get('vehicles/pending')
  pendingVehicles() {
    return this.admin.pendingVehicles();
  }

  @RequirePermission(Permission.ADMIN_VEHICLES_APPROVE)
  @Post('vehicles/:id/decide')
  decideVehicle(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @ZodBody(decide) body: z.infer<typeof decide>,
  ) {
    const d = body.decision === 'VERIFIED' ? 'APPROVED' : body.decision;
    return this.vehicles.adminDecide(user.id, id, d as 'APPROVED' | 'REJECTED' | 'SUSPENDED', body.reason);
  }

  @RequirePermission(Permission.ADMIN_DRIVER_READ)
  @Get('driver-verifications/pending')
  pendingDrivers() {
    return this.admin.pendingDriverVerifications();
  }

  @RequirePermission(Permission.ADMIN_DRIVER_VERIFY)
  @Post('driver-verifications/:id/decide')
  decideDriver(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @ZodBody(decide) body: z.infer<typeof decide>,
  ) {
    return this.drivers.decide(
      user.id,
      id,
      body.decision === 'APPROVED' ? 'VERIFIED' : (body.decision as 'VERIFIED' | 'REJECTED' | 'MANUAL_REVIEW'),
      body.reason,
    );
  }
}
