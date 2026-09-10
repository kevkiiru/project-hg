import { Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import { BlockReason, Permission } from '@hiregari/types';
import { CurrentUser, Public, RequirePermission, ZodBody } from '../../core/http/decorators';
import type { AuthUser } from '../../core/http/types';
import { AvailabilityService } from './availability.service';

const blockSchema = z.object({
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
  reason: z.nativeEnum(BlockReason).default(BlockReason.MANUAL),
  note: z.string().max(500).optional(),
});

@Controller('api/v1')
export class AvailabilityController {
  constructor(private readonly availability: AvailabilityService) {}

  @Public()
  @Get('vehicles/:id/availability')
  calendar(
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const now = new Date();
    const fromDate = from ? new Date(from) : now;
    const toDate = to ? new Date(to) : new Date(now.getTime() + 90 * 86_400_000);
    return this.availability.calendar(id, fromDate, toDate);
  }

  @Get('vehicles/:id/blocks')
  @RequirePermission(Permission.AVAILABILITY_MANAGE_OWN)
  list(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.availability.listBlocksForVehicle(user.id, id);
  }

  @Post('vehicles/:id/blocks')
  @RequirePermission(Permission.AVAILABILITY_MANAGE_OWN)
  add(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @ZodBody(blockSchema) body: any,
  ) {
    return this.availability.addBlock(user.id, id, body);
  }

  @Delete('availability/blocks/:blockId')
  @RequirePermission(Permission.AVAILABILITY_MANAGE_OWN)
  remove(@CurrentUser() user: AuthUser, @Param('blockId') blockId: string) {
    return this.availability.deleteBlock(user.id, blockId);
  }
}
