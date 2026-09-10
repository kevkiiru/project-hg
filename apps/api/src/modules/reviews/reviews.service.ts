import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import {
  BookingStatus,
  ModerationStatus,
  ReportStatus,
  ReviewSubject,
} from '@hiregari/types';
import { DB, type Db } from '../../db/db.module';
import { reviewReports, reviews } from '../../db/schema/trust';
import { bookings } from '../../db/schema/commerce';
import { vehicles } from '../../db/schema/catalogue';
import { hostProfiles } from '../../db/schema/hosts';
import { users } from '../../db/schema/identity';
import { conflict, forbidden, notFound, unprocessable } from '../../core/http/errors';

export interface ReviewDto {
  subject: ReviewSubject;
  rating: number;
  dimensions?: Record<string, number>;
  comment?: string;
}

@Injectable()
export class ReviewsService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async create(customerId: string, bookingRef: string, dto: ReviewDto) {
    const booking = (
      await this.db.select().from(bookings).where(eq(bookings.reference, bookingRef)).limit(1)
    )[0];
    if (!booking) throw notFound('Booking');
    if (booking.customerId !== customerId) throw forbidden();
    if (booking.status !== BookingStatus.COMPLETED) {
      throw unprocessable('BOOKING_NOT_COMPLETE', 'Reviews are only available after the booking is completed.');
    }
    if (!Number.isInteger(dto.rating) || dto.rating < 1 || dto.rating > 5) {
      throw unprocessable('BAD_RATING', 'Rating must be an integer 1–5.');
    }
    const subjectId =
      dto.subject === ReviewSubject.VEHICLE
        ? booking.vehicleId
        : dto.subject === ReviewSubject.HOST
          ? booking.hostProfileId
          : booking.customerId; // RENTER reviews (host-side)
    if (dto.subject === ReviewSubject.RENTER && booking.customerId === customerId) {
      throw unprocessable('BAD_SUBJECT', 'You cannot review yourself.');
    }
    try {
      const row = (
        await this.db
          .insert(reviews)
          .values({
            bookingId: booking.id,
            reviewerId: customerId,
            subject: dto.subject,
            subjectId,
            rating: dto.rating,
            dimensions: this.sanitizeDimensions(dto.dimensions),
            comment: dto.comment?.slice(0, 2000) ?? null,
            moderationStatus: ModerationStatus.APPROVED,
          })
          .returning()
      )[0]!;
      await this.recompute(dto.subject, subjectId);
      return row;
    } catch (e: any) {
      if (e?.code === '23505') throw conflict('REVIEW_EXISTS', 'You already reviewed this booking.');
      throw e;
    }
  }

  private sanitizeDimensions(d?: Record<string, number>) {
    if (!d) return {};
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(d)) {
      if (typeof v === 'number' && v >= 1 && v <= 5) out[k.slice(0, 40)] = Math.round(v);
    }
    return out;
  }

  async hostReply(hostUserId: string, reviewId: string, reply: string) {
    const review = (await this.db.select().from(reviews).where(eq(reviews.id, reviewId)).limit(1))[0];
    if (!review) throw notFound('Review');
    const host = (
      await this.db.select().from(hostProfiles).where(eq(hostProfiles.userId, hostUserId)).limit(1)
    )[0];
    const booking = await this.db.select().from(bookings).where(eq(bookings.id, review.bookingId)).limit(1);
    if (!host || !booking[0] || booking[0].hostProfileId !== host.id) throw forbidden();
    return (
      await this.db
        .update(reviews)
        .set({ hostReply: reply.slice(0, 2000), hostReplyAt: new Date() })
        .where(eq(reviews.id, reviewId))
        .returning()
    )[0];
  }

  async report(reporterId: string, reviewId: string, reason: string) {
    const review = (await this.db.select().from(reviews).where(eq(reviews.id, reviewId)).limit(1))[0];
    if (!review) throw notFound('Review');
    return (
      await this.db
        .insert(reviewReports)
        .values({ reviewId, reporterId, reason: reason.slice(0, 1000), status: ReportStatus.OPEN })
        .returning()
    )[0];
  }

  async moderate(adminId: string, reviewId: string, hide: boolean) {
    void adminId;
    const review = (await this.db.select().from(reviews).where(eq(reviews.id, reviewId)).limit(1))[0];
    if (!review) throw notFound('Review');
    const updated = (
      await this.db
        .update(reviews)
        .set({
          visible: !hide,
          moderationStatus: hide ? ModerationStatus.HIDDEN : ModerationStatus.APPROVED,
        })
        .where(eq(reviews.id, reviewId))
        .returning()
    )[0]!;
    await this.recompute(updated.subject, updated.subjectId);
    await this.db
      .update(reviewReports)
      .set({ status: ReportStatus.RESOLVED, resolvedAt: new Date() })
      .where(and(eq(reviewReports.reviewId, reviewId), eq(reviewReports.status, ReportStatus.OPEN)));
    return updated;
  }

  async forVehicle(vehicleId: string, limit = 20) {
    return this.listBySubject(ReviewSubject.VEHICLE, vehicleId, limit);
  }

  async forHost(hostProfileId: string, limit = 20) {
    return this.listBySubject(ReviewSubject.HOST, hostProfileId, limit);
  }

  private async listBySubject(subject: ReviewSubject, subjectId: string, limit: number) {
    const rows = await this.db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        dimensions: reviews.dimensions,
        comment: reviews.comment,
        hostReply: reviews.hostReply,
        hostReplyAt: reviews.hostReplyAt,
        createdAt: reviews.createdAt,
        reviewerFirstName: users.firstName,
      })
      .from(reviews)
      .innerJoin(users, eq(users.id, reviews.reviewerId))
      .where(
        and(
          eq(reviews.subject, subject),
          eq(reviews.subjectId, subjectId),
          eq(reviews.visible, true),
          eq(reviews.moderationStatus, ModerationStatus.APPROVED),
        ),
      )
      .orderBy(desc(reviews.createdAt))
      .limit(limit);
    const agg = await this.db
      .select({
        average: sql<string>`round(avg(${reviews.rating})::numeric, 2)`,
        count: sql<string>`count(*)`,
      })
      .from(reviews)
      .where(
        and(
          eq(reviews.subject, subject),
          eq(reviews.subjectId, subjectId),
          eq(reviews.visible, true),
          eq(reviews.moderationStatus, ModerationStatus.APPROVED),
        ),
      );
    return {
      reviews: rows.map((r) => ({ ...r, reviewerName: r.reviewerFirstName ?? '' })),
      average: Number(agg[0]?.average ?? 0),
      count: Number(agg[0]?.count ?? 0),
    };
  }

  /** Recompute denormalised rating aggregates (single source of truth stays in reviews table). */
  async recompute(subject: ReviewSubject, subjectId: string) {
    const agg = await this.db
      .select({
        average: sql<string>`coalesce(round(avg(${reviews.rating})::numeric, 2), '0')`,
        count: sql<string>`count(*)`,
      })
      .from(reviews)
      .where(
        and(
          eq(reviews.subject, subject),
          eq(reviews.subjectId, subjectId),
          eq(reviews.visible, true),
          eq(reviews.moderationStatus, ModerationStatus.APPROVED),
        ),
      );
    const average = Number(agg[0]?.average ?? 0);
    const count = Number(agg[0]?.count ?? 0);
    if (subject === ReviewSubject.VEHICLE) {
      await this.db
        .update(vehicles)
        .set({ ratingAverage: average, ratingCount: count })
        .where(eq(vehicles.id, subjectId));
    } else if (subject === ReviewSubject.HOST) {
      await this.db
        .update(hostProfiles)
        .set({ ratingAverage: average, ratingCount: count })
        .where(eq(hostProfiles.id, subjectId));
    }
  }
}
