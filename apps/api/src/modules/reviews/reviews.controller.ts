import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import { ReviewSubject, Permission } from '@hiregari/types';
import { CurrentUser, Public, RequirePermission, ZodBody } from '../../core/http/decorators';
import type { AuthUser } from '../../core/http/types';
import { ReviewsService, type ReviewDto } from './reviews.service';

const create = z.object({
  subject: z.nativeEnum(ReviewSubject),
  rating: z.number().int().min(1).max(5),
  dimensions: z.record(z.string(), z.number().min(1).max(5)).optional(),
  comment: z.string().max(2000).optional(),
});
const reply = z.object({ reply: z.string().min(2).max(2000) });
const report = z.object({ reason: z.string().min(3).max(1000) });
const moderate = z.object({ hide: z.boolean() });

@Controller('api/v1')
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Public()
  @Get('vehicles/:id/reviews')
  forVehicle(@Param('id') id: string) {
    return this.reviews.forVehicle(id);
  }

  @Public()
  @Get('hosts/:id/reviews')
  forHost(@Param('id') id: string) {
    return this.reviews.forHost(id);
  }

  @RequirePermission(Permission.REVIEW_CREATE)
  @Post('bookings/:reference/reviews')
  create(
    @CurrentUser() user: AuthUser,
    @Param('reference') reference: string,
    @ZodBody(create) body: ReviewDto,
  ) {
    return this.reviews.create(user.id, reference, body);
  }

  @Post('reviews/:id/reply')
  reply(@CurrentUser() user: AuthUser, @Param('id') id: string, @ZodBody(reply) body: z.infer<typeof reply>) {
    return this.reviews.hostReply(user.id, id, body.reply);
  }

  @Post('reviews/:id/report')
  report(@CurrentUser() user: AuthUser, @Param('id') id: string, @ZodBody(report) body: z.infer<typeof report>) {
    return this.reviews.report(user.id, id, body.reason);
  }
}

@Controller('api/v1/admin/reviews')
export class AdminReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @RequirePermission(Permission.ADMIN_REVIEWS_MODERATE)
  @Post(':id/moderate')
  moderate(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @ZodBody(moderate) body: z.infer<typeof moderate>,
  ) {
    return this.reviews.moderate(user.id, id, body.hide);
  }
}
