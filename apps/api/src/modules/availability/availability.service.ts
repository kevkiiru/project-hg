import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { BlockReason, HoldStatus } from '@hiregari/types';
import { DB, type Db } from '../../db/db.module';
import { availabilityBlocks } from '../../db/schema/catalogue';
import { bookingHolds, bookings } from '../../db/schema/commerce';
import { conflict, forbidden, notFound, unprocessable } from '../../core/http/errors';
import { config } from '../../core/config/config';
import { VehiclesService } from '../vehicles/vehicles.service';

@Injectable()
export class AvailabilityService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly vehicles: VehiclesService,
  ) {}

  // ── Blocks ────────────────────────────────────────────────────────────────
  async listBlocksForVehicle(userId: string, vehicleId: string) {
    await this.vehicles.requireOwnedVehicle(userId, vehicleId);
    return this.db
      .select()
      .from(availabilityBlocks)
      .where(eq(availabilityBlocks.vehicleId, vehicleId))
      .orderBy(availabilityBlocks.startsAt);
  }

  async addBlock(
    userId: string,
    vehicleId: string,
    dto: { startsAt: string; endsAt: string; reason: BlockReason; note?: string },
  ) {
    await this.vehicles.requireOwnedVehicle(userId, vehicleId);
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    if (endsAt <= startsAt) throw unprocessable('INVALID_RANGE', 'End must be after start.');
    try {
      const row = (
        await this.db
          .insert(availabilityBlocks)
          .values({
            vehicleId,
            startsAt,
            endsAt,
            reason: dto.reason,
            note: dto.note ?? null,
            createdById: userId,
          })
          .returning()
      )[0]!;
      return row;
    } catch (e: any) {
      if (e?.code === '23P01') {
        throw conflict('BLOCK_OVERLAP', 'This block overlaps an existing block for that vehicle.');
      }
      throw e;
    }
  }

  async deleteBlock(userId: string, blockId: string) {
    const block = (
      await this.db.select().from(availabilityBlocks).where(eq(availabilityBlocks.id, blockId)).limit(1)
    )[0];
    if (!block) throw notFound('Block');
    await this.vehicles.requireOwnedVehicle(userId, block.vehicleId);
    await this.db.delete(availabilityBlocks).where(eq(availabilityBlocks.id, blockId));
    return { ok: true };
  }

  // ── Holds (checkout reservations) ─────────────────────────────────────────
  async sweepExpiredHolds(tx?: any) {
    const run = tx ?? this.db;
    await run
      .update(bookingHolds)
      .set({ status: HoldStatus.EXPIRED })
      .where(and(eq(bookingHolds.status, HoldStatus.ACTIVE), sql`${bookingHolds.expiresAt} < now()`));
  }

  async takeHold(
    tx: any,
    params: {
      vehicleId: string;
      userId: string;
      startsAt: Date;
      endsAt: Date;
      ttlMinutes?: number;
      quoteId?: string;
      bookingId?: string;
    },
  ) {
    await this.sweepExpiredHolds(tx);
    const ttl = params.ttlMinutes ?? config().HOLD_TTL_MINUTES;
    const expiresAt = new Date(Date.now() + ttl * 60_000);
    try {
      const hold = (
        await tx
          .insert(bookingHolds)
          .values({
            vehicleId: params.vehicleId,
            userId: params.userId,
            quoteId: params.quoteId ?? null,
            bookingId: params.bookingId ?? null,
            startsAt: params.startsAt,
            endsAt: params.endsAt,
            expiresAt,
            status: HoldStatus.ACTIVE,
          })
          .returning()
      )[0]!;
      return hold;
    } catch (e: any) {
      if (e?.code === '23P01' || e?.code === '23505') {
        throw conflict('VEHICLE_NOT_AVAILABLE', 'This vehicle is being booked by someone else right now.');
      }
      throw e;
    }
  }

  async convertHold(tx: any, holdId: string, bookingId: string) {
    await tx
      .update(bookingHolds)
      .set({ status: HoldStatus.CONVERTED, bookingId })
      .where(eq(bookingHolds.id, holdId));
  }

  async releaseHoldForBooking(bookingId: string) {
    await this.db
      .update(bookingHolds)
      .set({ status: HoldStatus.EXPIRED })
      .where(eq(bookingHolds.bookingId, bookingId));
  }

  // ── Calendar ──────────────────────────────────────────────────────────────
  async calendar(vehicleId: string, from: Date, to: Date) {
    const [occupied, blocked] = await Promise.all([
      this.db
        .select({
          startsAt: bookings.scheduledPickupAt,
          endsAt: bookings.scheduledReturnAt,
          status: bookings.status,
        })
        .from(bookings)
        .where(
          and(
            eq(bookings.vehicleId, vehicleId),
            sql`${bookings.scheduledPickupAt} < ${to}`,
            sql`${bookings.scheduledReturnAt} > ${from}`,
          ),
        ),
      this.db
        .select()
        .from(availabilityBlocks)
        .where(
          and(
            eq(availabilityBlocks.vehicleId, vehicleId),
            sql`${availabilityBlocks.startsAt} < ${to}`,
            sql`${availabilityBlocks.endsAt} > ${from}`,
          ),
        ),
    ]);
    return { occupied, blocked };
  }

  async assertNoFutureConflicts(vehicleId: string, from: Date, to: Date) {
    const ids = await this.vehicles.conflictingVehicleIds(from, to);
    if (ids.has(vehicleId)) {
      throw forbidden('The new dates overlap with an existing booking or block.');
    }
  }
}
