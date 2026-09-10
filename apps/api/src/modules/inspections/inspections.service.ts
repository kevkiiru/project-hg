import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import {
  ActorType,
  BookingStatus,
  InspectionType,
} from '@hiregari/types';
import { DB, type Db } from '../../db/db.module';
import {
  inspectionPhotos,
  pickupInspections,
  returnInspections,
} from '../../db/schema/operations';
import { bookings, bookingStatusHistory } from '../../db/schema/commerce';
import { hostProfiles } from '../../db/schema/hosts';
import { conflict, forbidden, notFound, unprocessable } from '../../core/http/errors';
import { assertBookingTransition } from '../../domain/machines';
import { BookingsService } from '../bookings/bookings.service';
import { DepositsService } from '../deposits/deposits.service';
import { NotificationsService } from '../notifications/notifications.service';
import { config } from '../../core/config/config';

export interface InspectionDto {
  odometerKm?: number;
  fuelLevel?: number;
  exteriorNotes?: string;
  interiorNotes?: string;
  notes?: string;
  lat?: number;
  lng?: number;
  photoKeys?: string[];
  angles?: string[];
}

@Injectable()
export class InspectionsService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly bookingsService: BookingsService,
    private readonly deposits: DepositsService,
    private readonly notifications: NotificationsService,
  ) {}

  // ── Pickup ──────────────────────────────────────────────────────────────
  async submitPickup(hostUserId: string, reference: string, dto: InspectionDto) {
    const { booking } = await this.bookingsService.requireHostBooking(hostUserId, reference);
    if (!([BookingStatus.CONFIRMED, BookingStatus.PICKUP_PENDING] as BookingStatus[]).includes(booking.status as BookingStatus)) {
      throw unprocessable('BAD_STAGE', 'Pickup inspection is only possible for a confirmed booking.');
    }
    const existing = (
      await this.db.select().from(pickupInspections).where(eq(pickupInspections.bookingId, booking.id)).limit(1)
    )[0];
    let inspectionId = existing?.id;
    await this.db.transaction(async (tx) => {
      if (existing) {
        await tx
          .update(pickupInspections)
          .set({
            odometerKm: dto.odometerKm ?? existing.odometerKm,
            fuelLevel: dto.fuelLevel ?? existing.fuelLevel,
            exteriorNotes: dto.exteriorNotes ?? existing.exteriorNotes,
            interiorNotes: dto.interiorNotes ?? existing.interiorNotes,
            notes: dto.notes ?? existing.notes,
            lat: dto.lat ?? existing.lat,
            lng: dto.lng ?? existing.lng,
            hostSignedAt: new Date(),
            hostSignedById: hostUserId,
          })
          .where(eq(pickupInspections.id, existing.id));
        inspectionId = existing.id;
      } else {
        const row = (
          await tx
            .insert(pickupInspections)
            .values({
              bookingId: booking.id,
              submittedById: hostUserId,
              odometerKm: dto.odometerKm ?? null,
              fuelLevel: this.fuelOrNull(dto.fuelLevel),
              exteriorNotes: dto.exteriorNotes ?? null,
              interiorNotes: dto.interiorNotes ?? null,
              notes: dto.notes ?? null,
              lat: dto.lat ?? null,
              lng: dto.lng ?? null,
              hostSignedAt: new Date(),
              hostSignedById: hostUserId,
            })
            .returning()
        )[0]!;
        inspectionId = row.id;
      }
      if ((dto.photoKeys ?? []).length) {
        await tx.insert(inspectionPhotos).values(
          dto.photoKeys!.map((key, i) => ({
            inspectionType: InspectionType.PICKUP as any,
            pickupInspectionId: inspectionId,
            bookingId: booking.id,
            objectKey: key,
            angle: dto.angles?.[i] ?? null,
            uploadedById: hostUserId,
          })),
        );
      }
    });
    await this.maybeActivate(booking.id);
    await this.notifications
      .notify({
        userId: booking.customerId,
        type: 'PICKUP_INSPECTION_READY',
        title: 'Sign your pickup inspection',
        body: `${booking.reference}: the host completed the handover inspection. Review and sign to collect the car.`,
        channels: ['IN_APP' as any, 'SMS' as any],
      })
      .catch(() => undefined);
    return this.getForBooking(reference, hostUserId, ActorType.HOST);
  }

  async renterSignPickup(customerId: string, reference: string) {
    const { booking } = await this.bookingsService.requireAccessible(reference, customerId, ActorType.CUSTOMER);
    const inspection = (
      await this.db.select().from(pickupInspections).where(eq(pickupInspections.bookingId, booking.id)).limit(1)
    )[0];
    if (!inspection) throw unprocessable('NO_INSPECTION', 'The host has not submitted the pickup inspection yet.');
    if (inspection.hostSignedAt == null) throw conflict('HOST_NOT_SIGNED', 'Waiting for the host signature.');
    if (!inspection.renterSignedAt) {
      await this.db
        .update(pickupInspections)
        .set({ renterSignedAt: new Date(), renterSignedById: customerId })
        .where(eq(pickupInspections.id, inspection.id));
    }
    await this.maybeActivate(booking.id);
    return this.getForBooking(reference, customerId, ActorType.CUSTOMER);
  }

  private async maybeActivate(bookingId: string) {
    const inspection = (
      await this.db.select().from(pickupInspections).where(eq(pickupInspections.bookingId, bookingId)).limit(1)
    )[0];
    const booking = await this.bookingsService.getById(bookingId);
    if (!booking || !inspection || booking.status === BookingStatus.ACTIVE) return;
    if (inspection.hostSignedAt && inspection.renterSignedAt) {
      assertBookingTransition(booking.status as BookingStatus, BookingStatus.ACTIVE);
      await this.db.transaction(async (tx) => {
        await tx
          .update(bookings)
          .set({ status: BookingStatus.ACTIVE, pickedUpAt: inspection.hostSignedAt })
          .where(eq(bookings.id, bookingId));
        await tx.insert(bookingStatusHistory).values({
          bookingId,
          fromStatus: booking.status,
          toStatus: BookingStatus.ACTIVE,
          actorType: ActorType.SYSTEM,
          reason: 'pickup-signed-by-both',
        });
      });
    }
  }

  // ── Return ──────────────────────────────────────────────────────────────
  async submitReturn(hostUserId: string, reference: string, dto: InspectionDto & { actualReturnedAt?: string }) {
    const { booking } = await this.bookingsService.requireHostBooking(hostUserId, reference);
    if (booking.status !== BookingStatus.ACTIVE) {
      throw unprocessable('BAD_STAGE', 'Return inspection is only possible while the booking is active.');
    }
    const pickup = (
      await this.db.select().from(pickupInspections).where(eq(pickupInspections.bookingId, booking.id)).limit(1)
    )[0];
    if (!pickup?.renterSignedAt) throw unprocessable('NO_PICKUP', 'The pickup inspection was never signed.');
    const actualReturnedAt = new Date(dto.actualReturnedAt ?? new Date().toISOString());
    const lateMinutes =
      actualReturnedAt > booking.scheduledReturnAt
        ? Math.max(0, Math.round((actualReturnedAt.getTime() - booking.scheduledReturnAt.getTime()) / 60000))
        : 0;
    const distanceKm =
      dto.odometerKm != null && pickup.odometerKm != null
        ? Math.max(0, dto.odometerKm - pickup.odometerKm)
        : null;

    let inspectionId: string;
    const existing = (
      await this.db.select().from(returnInspections).where(eq(returnInspections.bookingId, booking.id)).limit(1)
    )[0];
    if (existing) {
      inspectionId = existing.id;
      await this.db
        .update(returnInspections)
        .set({
          odometerKm: dto.odometerKm ?? existing.odometerKm,
          fuelLevel: dto.fuelLevel ?? existing.fuelLevel,
          notes: dto.notes ?? existing.notes,
          actualReturnedAt,
          distanceKm,
          lateMinutes,
          lat: dto.lat ?? existing.lat,
          lng: dto.lng ?? existing.lng,
          hostSignedAt: new Date(),
          hostSignedById: hostUserId,
        })
        .where(eq(returnInspections.id, existing.id));
    } else {
      const row = (
        await this.db
          .insert(returnInspections)
          .values({
            bookingId: booking.id,
            submittedById: hostUserId,
            odometerKm: dto.odometerKm ?? null,
            fuelLevel: this.fuelOrNull(dto.fuelLevel),
            notes: dto.notes ?? null,
            actualReturnedAt,
            distanceKm,
            lateMinutes,
            lat: dto.lat ?? null,
            lng: dto.lng ?? null,
            hostSignedAt: new Date(),
            hostSignedById: hostUserId,
          })
          .returning()
      )[0]!;
      inspectionId = row.id;
    }
    if ((dto.photoKeys ?? []).length) {
      await this.db.insert(inspectionPhotos).values(
        dto.photoKeys!.map((key, i) => ({
          inspectionType: InspectionType.RETURN as any,
          returnInspectionId: inspectionId,
          bookingId: booking.id,
          objectKey: key,
          angle: dto.angles?.[i] ?? null,
          uploadedById: hostUserId,
        })),
      );
    }
    await this.maybeComplete(booking.id);
    await this.notifications
      .notify({
        userId: booking.customerId,
        type: 'RETURN_INSPECTION_READY',
        title: 'Sign your return inspection',
        body: `${booking.reference}: review the return inspection and sign it to release the deposit schedule.`,
        channels: ['IN_APP' as any, 'SMS' as any],
      })
      .catch(() => undefined);
    return this.getForBooking(reference, hostUserId, ActorType.HOST);
  }

  async renterSignReturn(customerId: string, reference: string) {
    const { booking } = await this.bookingsService.requireAccessible(reference, customerId, ActorType.CUSTOMER);
    const inspection = (
      await this.db.select().from(returnInspections).where(eq(returnInspections.bookingId, booking.id)).limit(1)
    )[0];
    if (!inspection) throw unprocessable('NO_INSPECTION', 'The host has not submitted the return inspection yet.');
    if (!inspection.renterSignedAt) {
      await this.db
        .update(returnInspections)
        .set({ renterSignedAt: new Date(), renterSignedById: customerId })
        .where(eq(returnInspections.id, inspection.id));
    }
    await this.maybeComplete(booking.id);
    return this.getForBooking(reference, customerId, ActorType.CUSTOMER);
  }

  private async maybeComplete(bookingId: string) {
    const inspection = (
      await this.db.select().from(returnInspections).where(eq(returnInspections.bookingId, bookingId)).limit(1)
    )[0];
    const booking = await this.bookingsService.getById(bookingId);
    if (!booking || !inspection) return;
    if ((booking.status as BookingStatus) === BookingStatus.COMPLETED) return; // idempotent
    if (!inspection.hostSignedAt) return;

    if (!inspection.renterSignedAt) {
      // Host-signed only → RETURN_PENDING awaiting renter acknowledgement
      if (booking.status === BookingStatus.ACTIVE) {
        assertBookingTransition(booking.status as BookingStatus, BookingStatus.RETURN_PENDING);
        await this.db.transaction(async (tx) => {
          await tx
            .update(bookings)
            .set({ status: BookingStatus.RETURN_PENDING, returnedAt: inspection.actualReturnedAt })
            .where(eq(bookings.id, bookingId));
          await tx.insert(bookingStatusHistory).values({
            bookingId,
            fromStatus: BookingStatus.ACTIVE,
            toStatus: BookingStatus.RETURN_PENDING,
            actorType: ActorType.HOST,
            reason: 'return-host-signed',
          });
        });
      }
      return;
    }

    assertBookingTransition(booking.status as BookingStatus, BookingStatus.COMPLETED);
    await this.db.transaction(async (tx) => {
      await tx
        .update(bookings)
        .set({ status: BookingStatus.COMPLETED, returnedAt: inspection.actualReturnedAt })
        .where(eq(bookings.id, bookingId));
      await tx.insert(bookingStatusHistory).values({
        bookingId,
        fromStatus: booking.status,
        toStatus: BookingStatus.COMPLETED,
        actorType: ActorType.SYSTEM,
        reason: 'return-signed-by-both',
      });
    });
    // Schedule deposit release window
    const deposit = await this.deposits.getForBooking(bookingId);
    if (deposit) {
      await this.deposits.scheduleRelease(
        deposit.id,
        new Date(Date.now() + config().DEPOSIT_RELEASE_HOURS * 3_600_000),
      );
    }
    await this.notifications
      .notify({
        userId: booking.customerId,
        type: 'BOOKING_COMPLETED',
        title: 'Booking completed',
        body: `${booking.reference} is complete. You can now review the vehicle and host.`,
        channels: ['IN_APP' as any],
      })
      .catch(() => undefined);
  }

  // ── Reads ───────────────────────────────────────────────────────────────
  async getForBooking(reference: string, userId: string, actorType: ActorType) {
    const { booking } = await this.bookingsService.requireAccessible(reference, userId, actorType);
    const [pickup, ret, photos] = await Promise.all([
      this.db.select().from(pickupInspections).where(eq(pickupInspections.bookingId, booking.id)).limit(1),
      this.db.select().from(returnInspections).where(eq(returnInspections.bookingId, booking.id)).limit(1),
      this.db.select().from(inspectionPhotos).where(eq(inspectionPhotos.bookingId, booking.id)),
    ]);
    return {
      bookingRef: booking.reference,
      status: booking.status,
      pickup: pickup[0] ?? null,
      return: ret[0] ?? null,
      photos,
    };
  }

  private fuelOrNull(level?: number) {
    if (level == null) return null;
    if (level < 0 || level > 100) throw unprocessable('BAD_FUEL', 'Fuel level must be 0–100.');
    return Math.round(level);
  }

  // guard re-used by damage module
  async assertParticipant(bookingRef: string, userId: string) {
    const booking = await this.bookingsService.getByRef(bookingRef);
    if (!booking) throw notFound('Booking');
    if (booking.customerId === userId) return { booking, actorType: ActorType.CUSTOMER };
    const host = (
      await this.db.select().from(hostProfiles).where(eq(hostProfiles.userId, userId)).limit(1)
    )[0];
    if (host && host.id === booking.hostProfileId) return { booking, actorType: ActorType.HOST };
    throw forbidden();
  }

  // avoid unused-import churn in some build configs
  private _and = and;
}
