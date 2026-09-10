import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { Permission } from '@hiregari/types';
import { CurrentUser, Public, RequirePermission, ZodBody } from '../../core/http/decorators';
import type { AuthUser } from '../../core/http/types';
import { AnalyticsService } from './analytics.service';

const track = z.object({
  event: z.string().min(2).max(60),
  distinctId: z.string().min(4).max(80).optional(),
  props: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});

@Controller('api/v1/analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Public()
  @Post('events')
  event(@CurrentUser() user: AuthUser | undefined, @ZodBody(track) body: z.infer<typeof track>) {
    return this.analytics.track(user?.id ?? null, body.distinctId ?? `anon-${randomUUID().slice(0, 12)}`, body.event, body.props);
  }

  @RequirePermission(Permission.ANALYTICS_VIEW)
  @Get('dashboard')
  dashboard(@Query('from') from?: string, @Query('to') to?: string) {
    return this.analytics.dashboard(from, to);
  }
}
