import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, inArray, ne, sql } from 'drizzle-orm';
import {
  ActorType,
  BookingMode,
  BookingStatus,
  CancellationTier,
  HoldStatus,
  PaymentStatus,
  PaymentPurpose,
  QuoteStatus,
  VehicleStatus,
  bookingReference,
} from '@hiregari/types';
import { DB, type Db } from '../../db/db.module';
import {
  bookingExtraSelections,
  bookingHolds,
  bookingPriceItems,
  bookingPriceSnapshots,
  bookingStatusHistory,
  bookings,
  quoteItems,
  quotes,
} from '../../db/schema/commerce';
import { vehicles, vehicleImages } from '../../db/schema/catalogue';
import { users } from '../../db/schema/identity';
import { hostProfiles } from '../../db/schema/hosts';
import { payments, refunds } from '../../db/schema/money';
import { conflict, forbidden, gone, notFound, unprocessable } from '../../core/http/errors';
import { assertBookingTransition, BOOKING_OCCUPYING } from '../../domain/machines';
import { calculateCancellation, placeholderPolicies } from '../../domain/cancellation';
import { QuotesService } from '../quotes/quotes.service';
import { AvailabilityService } from '../availability/availability.service';
import { VehiclesService } from '../vehicles/vehicles.service';
import { DriverVerificationService } from '../verification/driver-verification.service';
import { DepositsService } from '../deposits/deposits.service';
import { RefundsService } from '../refunds/refunds.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import { MessagingService } from '../messaging/messaging.service';
import { eventBus } from '../../core/events/event-bus';
import { config } from '../../core/config/config';
import { randomUUID } from 'node:crypto';

@Injectable()
export class BookingsService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly quotesService: QuotesService,
    private readonly availability: AvailabilityService,
    private readonly vehiclesService: VehiclesService,
    private readonly driverVerification: DriverVerificationService,
    private readonly deposits: DepositsService,
    private readonly refundsService: RefundsService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
    private readonly messaging: MessagingService,
  ) {}

  // ── Creation ──────────────────────────────────────────────────────────────
  async create(userId: string, quoteId: string, requestedMode?: BookingMode) {
    await this.quotesService.assertStillValid(quoteId);
    const quote = (await this.db.select().from(quotes).where(eq(quotes.id, quoteId)).limit(1))[0];
    if (!quote) throw notFound('Quote');
    if (quote.userId !== userId) throw forbidden();

    // Driver verification gate (spec: verify before driving; enforced at booking)
    await this.driverVerification.assertCanDrive(userId);

    const vehicle = (
      await this.db.select().from(vehicles).where(eq(vehicles.id, quote.vehicleId)).limit(1)
    )[0]!;
    const host = (
      await this.db.select().from(hostProfiles).where(eq(hostProfiles.id, vehicle.hostProfileId)).limit(1)
    )[0]!;

    const mode =
      requestedMode ?? (vehicle.instantBookEnabled ? BookingMode.INSTANT : BookingMode.REQUEST);

    try {
      const result = await this.db.transaction(async (tx) => {
        // Serialize against concurrent checkouts for the same vehicle.
        await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${vehicle.id}))`);
        // Re-validate eligibility inside the lock.
        await this.vehiclesService.assertBookable(vehicle.id, quote.pickupAt, quote.returnAt);

        // Idempotent on quote → one booking per quote.
        const existing = await tx
          .select()
          .from(bookings)
          .where(eq(bookings.quoteId, quote.id))
          .limit(1);
        if (existing[0]) return { booking: existing[0], alreadyExisted: true };

        const initialStatus =
          mode === BookingMode.INSTANT ? BookingStatus.PAYMENT_PENDING : BookingStatus.PENDING_HOST;
        const reference = bookingReference();

        const booking = (
          await tx
            .insert(bookings)
            .values({
              reference,
              quoteId: quote.id,
              customerId: userId,
              vehicleId: vehicle.id,
              hostProfileId: host.id,
              businessId: vehicle.businessId,
              mode,
              status: initialStatus,
              scheduledPickupAt: quote.pickupAt,
              scheduledReturnAt: quote.returnAt,
              timezone: quote.timezone,
              pickupOption: quote.pickupOption,
              deliveryZoneId: quote.deliveryZoneId,
              rentalSubtotalCents: quote.rentalSubtotalCents,
              extrasCents: quote.extrasCents,
              deliveryCents: quote.deliveryCents,
              serviceFeeCents: quote.serviceFeeCents,
              discountCents: quote.discountCents,
              taxCents: quote.taxCents,
              depositCents: quote.depositCents,
              totalCents: quote.totalCents,
              currency: quote.currency,
              commissionBps: quote.commissionBps,
              cancellationPolicyCode: 'MODERATE',
              isDemo: false,
            })
            .returning()
        )[0]!;

        // Immutable price snapshot (survives later price edits)
        const snapshot = (
          await tx
            .insert(bookingPriceSnapshots)
            .values({
              bookingId: booking.id,
              currency: quote.currency,
              dailyRateCents: (await this.firstRentalLine(quote.id, tx)).unitCents,
              billableDays: (await this.firstRentalLine(quote.id, tx)).quantity,
              rentalSubtotalCents: quote.rentalSubtotalCents,
              extrasCents: quote.extrasCents,
              deliveryCents: quote.deliveryCents,
              serviceFeeCents: quote.serviceFeeCents,
              discountCents: quote.discountCents,
              taxCents: quote.taxCents,
              depositCents: quote.depositCents,
              totalCents: quote.totalCents,
              refundableCents: quote.refundableCents,
              commissionBps: quote.commissionBps,
            })
            .returning()
        )[0]!;
        const items = await tx.select().from(quoteItems).where(eq(quoteItems.quoteId, quote.id));
        await tx.insert(bookingPriceItems).values(
          items.map((i) => ({
            snapshotId: snapshot.id,
            kind: i.kind,
            code: i.code,
            label: i.label,
            quantity: i.quantity,
            unitCents: i.unitCents,
            amountCents: i.amountCents,
            metadata: i.metadata ?? null,
          })),
        );

        const extrasSelection = (Array.isArray(quote.extrasSelection) ? quote.extrasSelection : []) as any[];
        if (extrasSelection.length) {
          await tx.insert(bookingExtraSelections).values(
            extrasSelection.map((e) => ({
              bookingId: booking.id,
              code: e.code,
              label: e.label,
              chargeType: e.chargeType,
              quantity: e.quantity,
              unitCents: e.unitCents,
              amountCents:
                e.chargeType === 'DAILY' ? e.unitCents * e.quantity * snapshot.billableDays : e.unitCents * e.quantity,
            })),
          );
        }

        // Deposit requirement row (liability, not revenue)
        await this.deposits.createIfRequired(
          tx,
          { id: booking.id, depositCents: booking.depositCents },
          { quoteId: quote.id, depositRuleContext: true },
        );

        await tx.insert(bookingStatusHistory).values({
          bookingId: booking.id,
          fromStatus: null,
          toStatus: initialStatus,
          actorType: ActorType.CUSTOMER,
          actorId: userId,
          reason: 'booking-created',
        });

        await tx
          .update(quotes)
          .set({ status: QuoteStatus.CONSUMED, consumedAt: new Date() })
          .where(eq(quotes.id, quote.id));

        if (initialStatus === BookingStatus.PAYMENT_PENDING) {
          await this.availability.takeHold(tx, {
            vehicleId: vehicle.id,
            userId,
            startsAt: quote.pickupAt,
            endsAt: quote.returnAt,
            quoteId: quote.id,
            bookingId: booking.id,
            ttlMinutes: config().PAYMENT_WINDOW_MINUTES,
          });
        }

        return { booking, alreadyExisted: false };
      });

      const booking = result.booking;
      if (!result.alreadyExisted) {
        await this.messaging.ensureBookingConversation(booking.id, userId, vehicle.hostProfileId);
        await this.messaging.postSystemMessage(booking.id,
          mode === BookingMode.INSTANT
            ? `Booking request ${booking.reference} created — complete payment to confirm.`
            : `Booking request ${booking.reference} sent to the host.`,
          'BOOKING_REQUESTED');

        if (mode === BookingMode.REQUEST) {
          const hostUser = (
            await this.db
              .select({ userId: hostProfiles.userId })
              .from(hostProfiles)
              .where(eq(hostProfiles.id, vehicle.hostProfileId))
              .limit(1)
          )[0]!;
          await this.notifications.notify({
            userId: hostUser.userId,
            type: 'BOOKING_REQUEST',
            title: 'New booking request',
            body: `${booking.reference}: a customer requested your ${vehicle.year} ${vehicle.make} ${vehicle.model}.`,
            channels: ['IN_APP' as any, 'SMS' as any],
            sms: `Hiregari: new request ${booking.reference}. Open the host dashboard to respond.`,
            context: { bookingRef: booking.reference },
          });
        }
        eventBus.emitSync({
          type: 'CHECKOUT_STARTED',
          aggregate: 'booking',
          aggregateId: booking.id,
          payload: { reference: booking.reference, mode },
        });
      }
      return this.getByReference(booking.reference, userId, ActorType.CUSTOMER);
    } catch (e: any) {
      if (e?.code === '23P01' || e?.code === '23514') {
        throw conflict('VEHICLE_NOT_AVAILABLE', 'This vehicle was just booked for those dates.');
      }
      throw e;
    }
  }

  private async firstRentalLine(quoteId: string, tx: any) {
    const line = (
      await tx
        .select()
        .from(quoteItems)
        .where(and(eq(quoteItems.quoteId, quoteId), eq(quoteItems.kind, 'RENTAL')))
        .limit(1)
    )[0];
    return line ?? { unitCents: 0, quantity: 1 };
  }

  // ── Host response (request to book) ──────────────────────────────────────
  async hostRespond(hostUserId: string, reference: string, accept: boolean, reason?: string) {
    const { booking, host } = await this.requireHostBooking(hostUserId, reference);
    if (booking.status !== BookingStatus.PENDING_HOST) {
      throw conflict('NOT_PENDING_HOST', 'This request has already been answered.');
    }
    if (!accept) {
      assertBookingTransition(booking.status as BookingStatus, BookingStatus.DECLINED);
      await this.db.transaction(async (tx) => {
        await tx
          .update(bookings)
          .set({ status: BookingStatus.DECLINED, declinedAt: new Date(), hostRespondedAt: new Date() })
          .where(eq(bookings.id, booking.id));
        await tx.insert(bookingStatusHistory).values({
          bookingId: booking.id,
          fromStatus: booking.status,
          toStatus: BookingStatus.DECLINED,
          actorType: ActorType.HOST,
          actorId: hostUserId,
          reason: reason ?? 'host-declined',
        });
      });
      await this.notifications.notify({
        userId: booking.customerId,
        type: 'BOOKING_DECLINED',
        title: 'Booking request declined',
        body: `The host could not accept ${booking.reference}. No payment was taken.`,
        channels: ['IN_APP' as any],
      });
      return this.getByReference(reference, hostUserId, ActorType.HOST);
    }

    // Accept: re-check availability and take the hold
    try {
      await this.db.transaction(async (tx) => {
        await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${booking.vehicleId}))`);
        const conflicts = await this.vehiclesService.conflictingVehicleIds(
          booking.scheduledPickupAt,
          booking.scheduledReturnAt,
        );
        if (conflicts.has(booking.vehicleId)) {
          throw conflict('VEHICLE_NOT_AVAILABLE', 'The vehicle is no longer available for those dates.');
        }
        assertBookingTransition(booking.status as BookingStatus, BookingStatus.PAYMENT_PENDING);
        await this.availability.takeHold(tx, {
          vehicleId: booking.vehicleId,
          userId: booking.customerId,
          startsAt: booking.scheduledPickupAt,
          endsAt: booking.scheduledReturnAt,
          quoteId: booking.quoteId!,
          bookingId: booking.id,
          ttlMinutes: config().PAYMENT_WINDOW_MINUTES,
        });
        await tx
          .update(bookings)
          .set({ status: BookingStatus.PAYMENT_PENDING, hostRespondedAt: new Date() })
          .where(eq(bookings.id, booking.id));
        await tx.insert(bookingStatusHistory).values({
          bookingId: booking.id,
          fromStatus: BookingStatus.PENDING_HOST,
          toStatus: BookingStatus.PAYMENT_PENDING,
          actorType: ActorType.HOST,
          actorId: hostUserId,
          reason: 'host-accepted',
        });
      });
    } catch (e: any) {
      if (e?.code === 'VEHICLE_NOT_AVAILABLE') throw e;
      throw e;
    }

    await this.messaging.postSystemMessage(booking.id, `Host accepted ${booking.reference}. Payment is due.`, 'BOOKING_ACCEPTED');
    await this.notifications.notify({
      userId: booking.customerId,
      type: 'BOOKING_ACCEPTED',
      title: 'Request accepted — payment due',
      body: `${booking.reference} was accepted. Complete payment to confirm your booking.`,
      channels: ['IN_APP' as any, 'SMS' as any],
    });
    void host;
    return this.getByReference(reference, hostUserId, ActorType.HOST);
  }

  // ── Cancellation / refunds ──────────────────────────────────────────────
  async cancel(actorId: string, reference: string, reason: string, actorType: ActorType) {
    const { booking } = await this.requireAccessible(reference, actorId, actorType);
    const terminal: BookingStatus[] = [BookingStatus.CANCELLED, BookingStatus.COMPLETED, BookingStatus.DECLINED, BookingStatus.EXPIRED];
    if (terminal.includes(booking.status as BookingStatus)) {
      throw conflict('BOOKING_TERMINAL', 'This booking can no longer be cancelled.');
    }
    assertBookingTransition(booking.status as BookingStatus, BookingStatus.CANCELLED);

    const hasPickupHappened =
      !!booking.pickedUpAt ||
      ([BookingStatus.ACTIVE, BookingStatus.RETURN_PENDING, BookingStatus.COMPLETED] as BookingStatus[]).includes(
        booking.status as BookingStatus,
      );

    const policy =
      placeholderPolicies[booking.cancellationPolicyCode ?? 'MODERATE'] ??
      placeholderPolicies.MODERATE!;
    const outcome = calculateCancellation({
      policy,
      now: new Date(),
      scheduledPickupAt: booking.scheduledPickupAt,
      paidCents: booking.totalCents,
      hasPickupHappened,
    });

    await this.db.transaction(async (tx) => {
      await tx
        .update(bookings)
        .set({
          status: BookingStatus.CANCELLED,
          cancelledAt: new Date(),
          cancellation: {
            party: actorType,
            reason,
            at: new Date().toISOString(),
            refundBps: outcome.refundBps,
            rentalRefundCents: outcome.rentalRefundCents,
            depositReleased: outcome.depositReleased,
            policyCode: policy.code,
          } as any,
        })
        .where(eq(bookings.id, booking.id));
      await tx.insert(bookingStatusHistory).values({
        bookingId: booking.id,
        fromStatus: booking.status,
        toStatus: BookingStatus.CANCELLED,
        actorType,
        actorId,
        reason,
        metadata: { refundBps: outcome.refundBps },
      });
      await tx
        .update(bookingHolds)
        .set({ status: HoldStatus.EXPIRED })
        .where(and(eq(bookingHolds.bookingId, booking.id), eq(bookingHolds.status, HoldStatus.ACTIVE)));
    });

    // Refunds (outside transaction; provider calls)
    const succeededPayments = await this.db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.bookingId, booking.id),
          inArray(payments.status, [PaymentStatus.SUCCEEDED, PaymentStatus.PARTIALLY_REFUNDED]),
        ),
      );
    const rentalPayment = succeededPayments.find((p) => p.purpose !== PaymentPurpose.DEPOSIT);
    if (rentalPayment && outcome.rentalRefundCents > 0) {
      await this.refundsService.create({
        bookingId: booking.id,
        paymentId: rentalPayment.id,
        amountCents: outcome.rentalRefundCents,
        reason: `Cancellation (${policy.code}): ${reason}`,
        actorType,
        actorId,
        idempotencyKey: `cancel-rental:${booking.id}`,
      });
    }
    const depositPayment = succeededPayments.find((p) => p.purpose === PaymentPurpose.DEPOSIT);
    if (depositPayment && outcome.depositReleased && booking.depositCents > 0) {
      const refund = await this.refundsService.create({
        bookingId: booking.id,
        paymentId: depositPayment.id,
        depositId: (await this.deposits.getForBooking(booking.id))?.id,
        amountCents: booking.depositCents,
        reason: 'Deposit release on cancellation',
        actorType: ActorType.SYSTEM,
        actorId,
        idempotencyKey: `cancel-deposit:${booking.id}`,
      });
      if (refund.depositId) await this.refundsService.markDepositRefundedIfAny(refund.depositId);
    }

    await this.notifications.notify({
      userId: booking.customerId,
      type: 'BOOKING_CANCELLED',
      title: 'Booking cancelled',
      body: `${booking.reference} was cancelled. Any refund due is being processed.`,
      channels: ['IN_APP' as any],
    });
    if (actorType === ActorType.CUSTOMER) {
      const hostUser = (
        await this.db
          .select({ userId: hostProfiles.userId })
          .from(hostProfiles)
          .where(eq(hostProfiles.id, booking.hostProfileId))
          .limit(1)
      )[0];
      if (hostUser) {
        await this.notifications.notify({
          userId: hostUser.userId,
          type: 'BOOKING_CANCELLED_HOST',
          title: 'Booking cancelled by renter',
          body: `${booking.reference} was cancelled.`,
          channels: ['IN_APP' as any],
        });
      }
    }
    await this.audit.record({
      actorId,
      actorRole: actorType,
      action: 'BOOKING.CANCEL',
      entityType: 'BOOKING',
      entityId: booking.id,
      reason,
      newValue: { refundCents: outcome.rentalRefundCents },
    });
    return this.getByReference(reference, actorId, actorType);
  }

  // ── Expiry jobs ─────────────────────────────────────────────────────────
  async sweepExpired() {
    const now = new Date();
    await this.availability.sweepExpiredHolds();
    // Unanswered request → expired
    const requests = await this.db
      .select()
      .from(bookings)
      .where(eq(bookings.status, BookingStatus.PENDING_HOST));
    for (const b of requests) {
      const ageMs = now.getTime() - b.createdAt.getTime();
      if (ageMs > config().HOST_REQUEST_TIMEOUT_MINUTES * 60_000) {
        await this.markExpired(b.id, b.status, 'host-request-timeout');
      }
    }
    // Unpaid after payment window → expired (hold exclusion already lifted by sweep)
    const pending = await this.db
      .select()
      .from(bookings)
      .where(eq(bookings.status, BookingStatus.PAYMENT_PENDING));
    for (const b of pending) {
      const activeHold = (
        await this.db
          .select()
          .from(bookingHolds)
          .where(and(eq(bookingHolds.bookingId, b.id), eq(bookingHolds.status, HoldStatus.ACTIVE)))
          .limit(1)
      )[0];
      if (!activeHold) await this.markExpired(b.id, b.status, 'payment-window-expired');
    }
    // Pickup reminders / status flip to PICKUP_PENDING (within 24h)
    await this.db
      .update(bookings)
      .set({ status: BookingStatus.PICKUP_PENDING })
      .where(
        and(
          eq(bookings.status, BookingStatus.CONFIRMED),
          sql`${bookings.scheduledPickupAt} <= now() + interval '24 hours'`,
          sql`${bookings.scheduledReturnAt} > now()`,
        ),
      );
  }

  private async markExpired(id: string, from: BookingStatus, reason: string) {
    assertBookingTransition(from, BookingStatus.EXPIRED);
    await this.db.transaction(async (tx) => {
      await tx.update(bookings).set({ status: BookingStatus.EXPIRED, expiredAt: new Date() }).where(eq(bookings.id, id));
      await tx.insert(bookingStatusHistory).values({
        bookingId: id,
        fromStatus: from,
        toStatus: BookingStatus.EXPIRED,
        actorType: ActorType.SYSTEM,
        reason,
      });
      await tx
        .update(bookingHolds)
        .set({ status: HoldStatus.EXPIRED })
        .where(and(eq(bookingHolds.bookingId, id), eq(bookingHolds.status, HoldStatus.ACTIVE)));
    });
  }

  // ── Reads ────────────────────────────────────────────────────────────────
  async requireHostBooking(hostUserId: string, reference: string) {
    const booking = (
      await this.db.select().from(bookings).where(eq(bookings.reference, reference)).limit(1)
    )[0];
    if (!booking) throw notFound('Booking');
    const host = (
      await this.db.select().from(hostProfiles).where(eq(hostProfiles.userId, hostUserId)).limit(1)
    )[0];
    if (!host || booking.hostProfileId !== host.id) throw forbidden();
    return { booking, host };
  }

  async requireAccessible(reference: string, userId: string, actorType: ActorType) {
    const booking = (
      await this.db.select().from(bookings).where(eq(bookings.reference, reference)).limit(1)
    )[0];
    if (!booking) throw notFound('Booking');
    if (actorType === ActorType.CUSTOMER && booking.customerId !== userId) throw forbidden();
    if (actorType === ActorType.HOST) {
      const host = (
        await this.db.select().from(hostProfiles).where(eq(hostProfiles.userId, userId)).limit(1)
      )[0];
      if (!host || booking.hostProfileId !== host.id) throw forbidden();
    }
    return { booking };
  }

  async getByReference(reference: string, userId: string, actorType: ActorType) {
    const { booking } = await this.requireAccessible(reference, userId, actorType);
    const [snapshot, history, paymentRows, depositRow, vehicleRow, hostRow, customerRow, selections] =
      await Promise.all([
        this.db
          .select()
          .from(bookingPriceSnapshots)
          .where(eq(bookingPriceSnapshots.bookingId, booking.id))
          .limit(1),
        this.db
          .select()
          .from(bookingStatusHistory)
          .where(eq(bookingStatusHistory.bookingId, booking.id))
          .orderBy(bookingStatusHistory.createdAt),
        this.db.select().from(payments).where(eq(payments.bookingId, booking.id)),
        this.deposits.getForBooking(booking.id),
        this.db.select().from(vehicles).where(eq(vehicles.id, booking.vehicleId)).limit(1),
        this.db.select().from(hostProfiles).where(eq(hostProfiles.id, booking.hostProfileId)).limit(1),
        this.db
          .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, phoneE164: users.phoneE164 })
          .from(users)
          .where(eq(users.id, booking.customerId))
          .limit(1),
        this.db.select().from(bookingExtraSelections).where(eq(bookingExtraSelections.bookingId, booking.id)),
      ]);
    const items = snapshot[0]
      ? await this.db
          .select()
          .from(bookingPriceItems)
          .where(eq(bookingPriceItems.snapshotId, snapshot[0].id))
      : [];
    const refundRows = await this.db.select().from(refunds).where(eq(refunds.bookingId, booking.id));
    return {
      booking,
      snapshot: snapshot[0] ? { ...snapshot[0], items } : null,
      history,
      payments: paymentRows.map((p) => ({
        id: p.id,
        reference: p.reference,
        purpose: p.purpose,
        provider: p.provider,
        status: p.status,
        amountCents: p.amountCents,
        currency: p.currency,
        createdAt: p.createdAt,
        paidAt: p.paidAt,
        failureMessage: p.failureMessage,
      })),
      deposit: depositRow,
      refunds: refundRows,
      vehicle: vehicleRow[0]
        ? {
            id: vehicleRow[0].id,
            reference: vehicleRow[0].reference,
            slug: vehicleRow[0].slug,
            title: vehicleRow[0].title,
            make: vehicleRow[0].make,
            model: vehicleRow[0].model,
            year: vehicleRow[0].year,
            category: vehicleRow[0].category,
          }
        : null,
      host: hostRow[0]
        ? { id: hostRow[0].id, brandName: hostRow[0].brandName, ratingAverage: hostRow[0].ratingAverage }
        : null,
      customer: customerRow[0] ?? null,
      extras: selections,
    };
  }

  async listForCustomer(userId: string, status?: BookingStatus) {
    const rows = await this.db
      .select({
        reference: bookings.reference,
        status: bookings.status,
        mode: bookings.mode,
        scheduledPickupAt: bookings.scheduledPickupAt,
        scheduledReturnAt: bookings.scheduledReturnAt,
        totalCents: bookings.totalCents,
        depositCents: bookings.depositCents,
        currency: bookings.currency,
        createdAt: bookings.createdAt,
        vehicleId: vehicles.id,
        vehicleSlug: vehicles.slug,
        vehicleTitle: vehicles.title,
        make: vehicles.make,
        model: vehicles.model,
        year: vehicles.year,
        category: vehicles.category,
        primaryImageKey: vehicleImages.objectKey,
      })
      .from(bookings)
      .innerJoin(vehicles, eq(vehicles.id, bookings.vehicleId))
      .leftJoin(
        vehicleImages,
        and(eq(vehicleImages.vehicleId, vehicles.id), eq(vehicleImages.isPrimary, true)),
      )
      .where(and(eq(bookings.customerId, userId), status ? eq(bookings.status, status) : undefined))
      .orderBy(desc(bookings.scheduledPickupAt));
    return rows;
  }

  async listForHost(hostUserId: string, status?: BookingStatus) {
    const host = (
      await this.db.select().from(hostProfiles).where(eq(hostProfiles.userId, hostUserId)).limit(1)
    )[0];
    if (!host) return [];
    const rows = await this.db
      .select({
        reference: bookings.reference,
        status: bookings.status,
        mode: bookings.mode,
        scheduledPickupAt: bookings.scheduledPickupAt,
        scheduledReturnAt: bookings.scheduledReturnAt,
        totalCents: bookings.totalCents,
        depositCents: bookings.depositCents,
        currency: bookings.currency,
        createdAt: bookings.createdAt,
        customerId: bookings.customerId,
        customerFirstName: users.firstName,
        customerLastName: users.lastName,
        vehicleId: vehicles.id,
        vehicleTitle: vehicles.title,
        make: vehicles.make,
        model: vehicles.model,
        year: vehicles.year,
      })
      .from(bookings)
      .innerJoin(vehicles, eq(vehicles.id, bookings.vehicleId))
      .innerJoin(users, eq(users.id, bookings.customerId))
      .where(and(eq(bookings.hostProfileId, host.id), status ? eq(bookings.status, status) : undefined))
      .orderBy(desc(bookings.scheduledPickupAt));
    return rows;
  }

  async recordHistory(
    bookingId: string,
    from: BookingStatus | null,
    to: BookingStatus,
    actorType: ActorType,
    actorId?: string,
    reason?: string,
    metadata?: any,
  ) {
    await this.db.insert(bookingStatusHistory).values({
      bookingId,
      fromStatus: from,
      toStatus: to,
      actorType,
      actorId: actorId ?? null,
      reason,
      metadata: metadata ?? null,
    });
  }

  async assertBookableVehicle(vehicleId: string, start: Date, end: Date) {
    await this.vehiclesService.assertBookable(vehicleId, start, end);
  }

  // Used by inspections to transition lifecycle states
  async getById(id: string) {
    return (await this.db.select().from(bookings).where(eq(bookings.id, id)).limit(1))[0] ?? null;
  }
  async getByRef(ref: string) {
    return (await this.db.select().from(bookings).where(eq(bookings.reference, ref)).limit(1))[0] ?? null;
  }

  async extensionQuote(userId: string, reference: string, newReturnAtIso: string) {
    const { booking } = await this.requireAccessible(reference, userId, ActorType.CUSTOMER);
    if (!([BookingStatus.CONFIRMED, BookingStatus.PICKUP_PENDING, BookingStatus.ACTIVE] as BookingStatus[]).includes(booking.status as BookingStatus)) {
      throw unprocessable('NO_EXTENSION', 'This booking cannot be extended at its current stage.');
    }
    const newReturn = new Date(newReturnAtIso);
    if (newReturn <= booking.scheduledReturnAt) {
      throw unprocessable('BAD_EXTENSION', 'The new return time must be later than the current one.');
    }
    const conflicts = await this.vehiclesService.conflictingVehicleIds(
      booking.scheduledPickupAt,
      newReturn,
    );
    // The current booking itself counts in the occupied set; exclude it by range start equality check.
    const blockedByOther = [...conflicts].some(() => false); // current booking overlaps itself legitimately
    void blockedByOther;
    // Re-run ignoring this booking:
    const otherOccupied = await this.db
      .select({ id: bookings.id })
      .from(bookings)
      .where(
        and(
          eq(bookings.vehicleId, booking.vehicleId),
          ne(bookings.id, booking.id),
          inArray(bookings.status, [...BOOKING_OCCUPYING] as any),
          sql`${bookings.scheduledPickupAt} < ${newReturn}`,
          sql`${bookings.scheduledReturnAt} > ${booking.scheduledReturnAt}`,
        ),
      );
    if (otherOccupied.length) {
      throw conflict('EXTENSION_CONFLICT', 'The vehicle is booked after your current return; extension unavailable.');
    }
    // Price extension days at the locked daily rate
    const snapshot = (
      await this.db
        .select()
        .from(bookingPriceSnapshots)
        .where(eq(bookingPriceSnapshots.bookingId, booking.id))
        .limit(1)
    )[0]!;
    const ms = newReturn.getTime() - booking.scheduledReturnAt.getTime();
    const extraDays = Math.max(1, Math.ceil((ms - 59 * 60_000) / 86_400_000));
    const amountCents = extraDays * snapshot.dailyRateCents;
    return {
      bookingRef: booking.reference,
      currentReturnAt: booking.scheduledReturnAt,
      requestedReturnAt: newReturn,
      extraDays,
      dailyRateCents: snapshot.dailyRateCents,
      amountCents,
      currency: booking.currency,
    };
  }

  async applyPaidExtension(bookingId: string, newReturnAt: Date, extraDays: number) {
    await this.db.transaction(async (tx) => {
      const booking = (await tx.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1))[0]!;
      await tx
        .update(bookings)
        .set({ scheduledReturnAt: newReturnAt, updatedAt: new Date() })
        .where(eq(bookings.id, bookingId));
      await tx.insert(bookingStatusHistory).values({
        bookingId,
        fromStatus: booking.status,
        toStatus: booking.status,
        actorType: ActorType.CUSTOMER,
        reason: `extension-paid:${extraDays}d`,
      });
    });
  }
}
