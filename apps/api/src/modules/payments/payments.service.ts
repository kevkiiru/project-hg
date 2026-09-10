import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import {
  PaymentMethod,
  PaymentProvider,
  PaymentPurpose,
  PaymentStatus,
  paymentReference,
} from '@hiregari/types';
import { randomUUID } from 'node:crypto';
import { DB, type Db } from '../../db/db.module';
import { payments as paymentsTable } from '../../db/schema/money';
import { bookings, bookingStatusHistory } from '../../db/schema/commerce';
import { hostProfiles } from '../../db/schema/hosts';
import { conflict, forbidden, notFound, unprocessable } from '../../core/http/errors';
import { config } from '../../core/config/config';
import { CARD, MPESA } from '../../integrations/integrations.module';
import type { PaymentProviderPort, WebhookOutcome } from '../../integrations/ports';
import { LedgerService, ACCOUNTS } from '../ledger/ledger.service';
import { NotificationsService } from '../notifications/notifications.service';
import { assertBookingTransition, assertPaymentTransition } from '../../domain/machines';
import {
  ActorType,
  BookingStatus,
  DepositStatus,
  LedgerDirection,
  PaymentPurpose as Purpose,
} from '@hiregari/types';
import { DepositsService } from '../deposits/deposits.service';
import { AuditService } from '../audit/audit.service';
import { eventBus } from '../../core/events/event-bus';

@Injectable()
export class PaymentsService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(MPESA) private readonly mpesa: PaymentProviderPort,
    @Inject(CARD) private readonly card: PaymentProviderPort,
    private readonly ledger: LedgerService,
    private readonly notifications: NotificationsService,
    private readonly deposits: DepositsService,
    private readonly audit: AuditService,
  ) {}

  private adapter(provider: PaymentProvider): PaymentProviderPort {
    return provider === PaymentProvider.MPESA ? this.mpesa : this.card;
  }

  async listForBooking(userId: string, ref: string) {
    const booking = await this.requireBooking(userId, ref);
    return this.db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.bookingId, booking.id))
      .orderBy(paymentsTable.createdAt);
  }

  async getStatus(userId: string, reference: string) {
    const payment = (
      await this.db
        .select()
        .from(paymentsTable)
        .where(eq(paymentsTable.reference, reference))
        .limit(1)
    )[0];
    if (!payment) throw notFound('Payment');
    if (userId && payment.initiatedById !== userId && !(await this.isHostOf(userId, payment.bookingId))) {
      throw forbidden();
    }
    return payment;
  }

  async initiate(
    userId: string,
    dto: { bookingRef: string; purpose: PaymentPurpose; phoneE164?: string; provider: 'MPESA' | 'CARD' },
  ) {
    const booking = await this.requireBooking(userId, dto.bookingRef);
    if (booking.status !== BookingStatus.PAYMENT_PENDING) {
      throw conflict(
        'BOOKING_NOT_PAYABLE',
        booking.status === BookingStatus.CONFIRMED
          ? 'This booking is already confirmed.'
          : 'This booking is not awaiting payment.',
      );
    }

    const amountCents =
      dto.purpose === Purpose.DEPOSIT ? booking.depositCents : booking.totalCents;
    if (!amountCents) throw unprocessable('NOTHING_TO_PAY', 'There is nothing to pay for this item.');

    const provider = dto.provider === 'CARD' ? PaymentProvider.CARD : PaymentProvider.MPESA;
    const method =
      provider === PaymentProvider.MPESA ? PaymentMethod.MPESA_STK : PaymentMethod.CARD_TOKENIZED;
    const reference = paymentReference();
    const payment = (
      await this.db
        .insert(paymentsTable)
        .values({
          reference,
          bookingId: booking.id,
          purpose: dto.purpose,
          provider,
          method,
          status: PaymentStatus.CREATED,
          amountCents,
          currency: booking.currency,
          idempotencyKey: randomUUID(),
          requestedPhone: dto.phoneE164 ?? null,
          initiatedById: userId,
          expiresAt: new Date(Date.now() + config().PAYMENT_WINDOW_MINUTES * 60_000),
        })
        .returning()
    )[0]!;

    const result = await this.adapter(provider).initiate({
      paymentId: payment.id,
      reference,
      amountCents,
      currency: payment.currency,
      description: `Hiregari ${dto.purpose.toLowerCase()} ${booking.reference}`,
      phoneE164: dto.phoneE164,
      customerEmail: undefined,
      callbackUrl: '',
    });

    const updated = (
      await this.db
        .update(paymentsTable)
        .set({
          status: result.status === 'PROCESSING' ? PaymentStatus.PROCESSING : PaymentStatus.PENDING,
          providerRef: result.providerRef ?? null,
          providerCheckoutUrl: result.checkoutUrl ?? null,
          providerPayload: (result.raw ?? {}) as any,
          updatedAt: new Date(),
        })
        .where(eq(paymentsTable.id, payment.id))
        .returning()
    )[0]!;

    // Deposit collection attempt in flight: REQUIRED → PENDING (deposit
    // lifecycle mirrors the payment attempt; failures roll it back below).
    if (dto.purpose === Purpose.DEPOSIT) {
      const deposit = await this.deposits.getForBooking(booking.id);
      if (deposit && deposit.status === DepositStatus.REQUIRED) {
        await this.deposits.transition(deposit.id, DepositStatus.PENDING, { paymentId: payment.id });
      }
    }

    return {
      reference: updated.reference,
      status: updated.status,
      provider: updated.provider,
      amountCents: updated.amountCents,
      currency: updated.currency,
      checkoutUrl: updated.providerCheckoutUrl,
      providerRef: updated.providerRef,
      instructions:
        provider === PaymentProvider.MPESA
          ? { kind: 'STK_PUSH', phoneE164: dto.phoneE164, message: 'Enter your M-Pesa PIN to authorize the payment.' }
          : { kind: 'CARD_REDIRECT', url: updated.providerCheckoutUrl },
    };
  }

  /** Idempotent application of a verified provider outcome (webhook or recon). */
  async applyOutcome(outcome: WebhookOutcome): Promise<{ changed: boolean; bookingRef?: string; confirmed?: boolean }> {
    const payment = (
      await this.db
        .select()
        .from(paymentsTable)
        .where(eq(paymentsTable.providerRef, outcome.providerRef))
        .limit(1)
    )[0];
    if (!payment) return { changed: false };

    if (outcome.result === 'SUCCESS') {
      if (payment.status === PaymentStatus.SUCCEEDED || payment.status === PaymentStatus.PARTIALLY_REFUNDED) {
        return { changed: false, bookingRef: payment.bookingId ?? undefined };
      }
      assertPaymentTransition(payment.status as PaymentStatus, PaymentStatus.SUCCEEDED);
      await this.db
        .update(paymentsTable)
        .set({
          status: PaymentStatus.SUCCEEDED,
          paidAt: new Date(),
          failureCode: null,
          failureMessage: null,
          updatedAt: new Date(),
        })
        .where(eq(paymentsTable.id, payment.id));
      if (payment.purpose === Purpose.DEPOSIT && payment.bookingId) {
        const deposit = await this.deposits.getForBooking(payment.bookingId);
        if (deposit) {
          // REQUIRED → PENDING normally happens at initiate(); tolerate
          // outcomes that arrive without a local initiation record.
          if (deposit.status === DepositStatus.REQUIRED) {
            await this.deposits.transition(deposit.id, DepositStatus.PENDING, {
              paymentId: payment.id,
            });
          }
          await this.deposits.transition(deposit.id, DepositStatus.COLLECTED, {
            paymentId: payment.id,
            scheduledReleaseAt: new Date(Date.now() + config().DEPOSIT_RELEASE_HOURS * 3_600_000),
          });
        }
      }
      const confirmed = await this.maybeConfirm(payment.bookingId!);
      return { changed: true, confirmed, bookingRef: payment.bookingId ?? undefined };
    }
    if (outcome.result === 'FAILED' || outcome.result === 'CANCELLED') {
      const next = outcome.result === 'CANCELLED' ? PaymentStatus.CANCELLED : PaymentStatus.FAILED;
      if (([PaymentStatus.FAILED, PaymentStatus.CANCELLED, PaymentStatus.SUCCEEDED] as PaymentStatus[]).includes(payment.status as PaymentStatus)) {
        return { changed: false };
      }
      assertPaymentTransition(payment.status as PaymentStatus, next);
      await this.db
        .update(paymentsTable)
        .set({
          status: next,
          failureCode: outcome.failureCode ?? next,
          failureMessage: outcome.failureMessage ?? null,
          updatedAt: new Date(),
        })
        .where(eq(paymentsTable.id, payment.id));
      if (payment.bookingId) {
        const booking = (
          await this.db.select().from(bookings).where(eq(bookings.id, payment.bookingId)).limit(1)
        )[0]!;
        if (payment.purpose === Purpose.DEPOSIT) {
          const deposit = await this.deposits.getForBooking(payment.bookingId);
          if (deposit && deposit.status === DepositStatus.PENDING) {
            await this.deposits.transition(deposit.id, DepositStatus.REQUIRED, {
              paymentId: null,
              scheduledReleaseAt: null,
            });
          }
        }
        await this.notifications.notify({
          userId: booking.customerId,
          type: 'PAYMENT_FAILED',
          title: 'Payment unsuccessful',
          body:
            next === PaymentStatus.CANCELLED
              ? 'Your payment prompt was not completed. You can retry from your booking.'
              : "We couldn't complete your payment. Your booking has not been charged. Please try again.",
          context: { bookingRef: booking.reference, paymentRef: payment.reference },
          channels: [{ channel: 'IN_APP' } as any].map((x) => x.channel),
        });
      }
      return { changed: true, bookingRef: payment.bookingId ?? undefined };
    }
    return { changed: false };
  }

  private async maybeConfirm(bookingId: string): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      // Transaction-scoped advisory lock per booking serializes confirm
      // attempts from duplicate/out-of-order callbacks.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${bookingId}))`);
      const booking = (await tx.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1))[0]!;
      if (booking.status !== BookingStatus.PAYMENT_PENDING) {
        return booking.status === BookingStatus.CONFIRMED;
      }
      const paymentRows = await tx
        .select()
        .from(paymentsTable)
        .where(eq(paymentsTable.bookingId, bookingId));
      const rentalSucceeded = paymentRows.some(
        (p) =>
          p.purpose !== Purpose.DEPOSIT &&
          ([PaymentStatus.SUCCEEDED, PaymentStatus.PARTIALLY_REFUNDED, PaymentStatus.REFUNDED] as PaymentStatus[]).includes(
            p.status as PaymentStatus,
          ),
      );
      if (!rentalSucceeded) return false;
      const depositPaid =
        booking.depositCents === 0 ||
        paymentRows.some(
          (p) => p.purpose === Purpose.DEPOSIT && p.status === PaymentStatus.SUCCEEDED,
        );
      if (!depositPaid) return false;

      assertBookingTransition(booking.status as BookingStatus, BookingStatus.CONFIRMED);

      // ── Ledger: rental charge (immutable, balanced) ──
      const hostShare =
        booking.rentalSubtotalCents +
        booking.extrasCents +
        booking.deliveryCents -
        booking.discountCents;
      const cashLines: any[] = [
        {
          account: ACCOUNTS.CASH,
          direction: LedgerDirection.DEBIT,
          amountCents: booking.totalCents,
          memo: `Rental charge ${booking.reference}`,
          bookingId: booking.id,
        },
      ];
      if (hostShare > 0)
        cashLines.push({
          account: ACCOUNTS.hostPayable(booking.hostProfileId),
          direction: LedgerDirection.CREDIT,
          amountCents: hostShare,
          memo: `Host earnings ${booking.reference}`,
          bookingId: booking.id,
          autoAccount: { name: 'Host earnings payable', type: 'LIABILITY' },
        });
      if (booking.serviceFeeCents > 0)
        cashLines.push({
          account: ACCOUNTS.COMMISSION,
          direction: LedgerDirection.CREDIT,
          amountCents: booking.serviceFeeCents,
          memo: `Service fee ${booking.reference}`,
          bookingId: booking.id,
        });
      if (booking.taxCents > 0)
        cashLines.push({
          account: ACCOUNTS.TAX,
          direction: LedgerDirection.CREDIT,
          amountCents: booking.taxCents,
          memo: `Tax ${booking.reference}`,
          bookingId: booking.id,
        });
      await this.ledger.post(`booking-confirm:${booking.id}`, cashLines, tx);

      if (booking.depositCents > 0) {
        await this.ledger.post(
          `deposit-collected:${booking.id}`,
          [
            {
              account: ACCOUNTS.CASH,
              direction: LedgerDirection.DEBIT,
              amountCents: booking.depositCents,
              memo: `Deposit collected ${booking.reference}`,
              bookingId: booking.id,
            },
            {
              account: ACCOUNTS.DEPOSIT_LIABILITY,
              direction: LedgerDirection.CREDIT,
              amountCents: booking.depositCents,
              memo: `Deposit liability ${booking.reference}`,
              bookingId: booking.id,
            },
          ],
          tx,
        );
      }

      await tx
        .update(bookings)
        .set({ status: BookingStatus.CONFIRMED, confirmedAt: new Date(), updatedAt: new Date() })
        .where(eq(bookings.id, booking.id));
      await tx.insert(bookingStatusHistory).values({
        bookingId: booking.id,
        fromStatus: BookingStatus.PAYMENT_PENDING,
        toStatus: BookingStatus.CONFIRMED,
        actorType: ActorType.PROVIDER,
        reason: 'payment-confirmed',
      });
      await tx.execute(sql`update booking_holds set status='CONVERTED', booking_id=${booking.id}
        where booking_id is null and quote_id=${booking.quoteId} and status='ACTIVE'`);

      // Post-commit side effects
      await this.notifications.notify({
        userId: booking.customerId,
        type: 'BOOKING_CONFIRMED',
        title: 'Booking confirmed!',
        body: `Your booking ${booking.reference} is confirmed. Pickup details are ready.`,
        context: { bookingRef: booking.reference },
        channels: ['IN_APP', 'EMAIL' as any],
        emailSubject: `Hiregari booking ${booking.reference} confirmed`,
      });
      const hostRow = await tx
        .select({ userId: hostProfiles.userId })
        .from(hostProfiles)
        .where(eq(hostProfiles.id, booking.hostProfileId))
        .limit(1);
      if (hostRow[0]) {
        await this.notifications
          .notify({
            userId: hostRow[0].userId,
            type: 'BOOKING_CONFIRMED_HOST',
            title: 'New confirmed booking',
            body: `Booking ${booking.reference} is confirmed and paid.`,
            context: { bookingRef: booking.reference },
            channels: ['IN_APP' as any],
          })
          .catch(() => undefined);
      }

      eventBus.emitSync({
        type: 'BOOKING_CONFIRMED',
        aggregate: 'booking',
        aggregateId: booking.id,
        payload: { bookingRef: booking.reference, totalCents: booking.totalCents },
      });
      await this.audit.record({
        action: 'BOOKING.CONFIRMED',
        entityType: 'BOOKING',
        entityId: booking.id,
        newValue: { status: BookingStatus.CONFIRMED, totalCents: booking.totalCents },
      });
      return true;
    });
  }

  private async isHostOf(userId: string, bookingId: string | null): Promise<boolean> {
    if (!bookingId) return false;
    const rows = await this.db
      .select({ id: bookings.id })
      .from(bookings)
      .where(
        and(
          eq(bookings.id, bookingId),
          sql`${bookings.hostProfileId} = (select id from host_profiles where user_id = ${userId})`,
        ),
      );
    return rows.length > 0;
  }

  async requireBooking(userId: string, ref: string) {
    const booking = (await this.db.select().from(bookings).where(eq(bookings.reference, ref)).limit(1))[0];
    if (!booking) throw notFound('Booking');
    const isHost = await this.isHostOf(userId, booking.id);
    if (booking.customerId !== userId && !isHost) throw forbidden();
    return booking;
  }

  async reconcileStale(olderThanMinutes = 8) {
    const stale = await this.db
      .select()
      .from(paymentsTable)
      .where(
        and(
          sql`${paymentsTable.status} in ('PENDING','PROCESSING','CREATED')`,
          sql`${paymentsTable.createdAt} < now() - make_interval(mins => ${olderThanMinutes})`,
        ),
      );
    let processed = 0;
    for (const payment of stale) {
      if (!payment.providerRef) continue;
      try {
        const outcome = await this.adapter(payment.provider as PaymentProvider).queryStatus(payment.providerRef);
        if (outcome && (outcome.result === 'SUCCESS' || outcome.result === 'FAILED')) {
          const { changed } = await this.applyOutcome({
            ...outcome,
            providerRef: payment.providerRef,
          });
          if (changed) processed++;
        }
      } catch {
        // provider unavailable; next run retries
      }
    }
    return { scanned: stale.length, processed };
  }
}
