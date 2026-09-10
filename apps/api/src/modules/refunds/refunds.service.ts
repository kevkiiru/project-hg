import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { ActorType, LedgerDirection, PaymentProvider, RefundStatus } from '@hiregari/types';
import { refundReference } from '@hiregari/types';
import { DB, type Db } from '../../db/db.module';
import { payments, refunds } from '../../db/schema/money';
import { bookings } from '../../db/schema/commerce';
import { deposits } from '../../db/schema/money';
import { conflict, notFound, unprocessable } from '../../core/http/errors';
import { ACCOUNTS, LedgerService } from '../ledger/ledger.service';
import { CARD, MPESA } from '../../integrations/integrations.module';
import type { PaymentProviderPort } from '../../integrations/ports';
import { assertPaymentTransition, refundDerivedPaymentStatus } from '../../domain/machines';
import { DepositStatus as RS_DEPOSIT, RefundStatus as RS } from '@hiregari/types';

export interface CreateRefundInput {
  bookingId: string;
  paymentId: string;
  depositId?: string | null;
  amountCents: number;
  reason: string;
  actorType: ActorType;
  actorId?: string | null;
  idempotencyKey: string;
}

@Injectable()
export class RefundsService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly ledger: LedgerService,
    @Inject(MPESA) private readonly mpesa: PaymentProviderPort,
    @Inject(CARD) private readonly card: PaymentProviderPort,
  ) {}

  private adapterFor(provider: PaymentProvider) {
    return provider === PaymentProvider.MPESA ? this.mpesa : this.card;
  }

  async create(input: CreateRefundInput) {
    if (input.amountCents <= 0) throw unprocessable('BAD_AMOUNT', 'Refund amount must be positive.');
    const booking = (await this.db.select().from(bookings).where(eq(bookings.id, input.bookingId)).limit(1))[0];
    if (!booking) throw notFound('Booking');
    const payment = (await this.db.select().from(payments).where(eq(payments.id, input.paymentId)).limit(1))[0];
    if (!payment) throw notFound('Payment');

    const alreadyRefunded = (
      await this.db
        .select({ total: sql<string>`coalesce(sum(${refunds.amountCents}),0)::int` })
        .from(refunds)
        .where(and(eq(refunds.paymentId, payment.id), eq(refunds.status, RS.SUCCEEDED)))
    )[0]!.total;
    if (Number(alreadyRefunded) + input.amountCents > payment.amountCents) {
      throw conflict('REFUND_EXCEEDS_PAYMENT', 'Refund total cannot exceed the captured payment.');
    }

    const reference = refundReference();
    let refund;
    try {
      refund = (
        await this.db
          .insert(refunds)
          .values({
            reference,
            bookingId: input.bookingId,
            paymentId: input.paymentId,
            depositId: input.depositId ?? null,
            amountCents: input.amountCents,
            currency: payment.currency,
            reason: input.reason,
            actorType: input.actorType,
            actorId: input.actorId ?? null,
            status: RefundStatus.PROCESSING,
            idempotencyKey: input.idempotencyKey,
          })
          .returning()
      )[0]!;
    } catch (e: any) {
      if (e?.code === '23505') {
        const existing = (
          await this.db.select().from(refunds).where(eq(refunds.idempotencyKey, input.idempotencyKey)).limit(1)
        )[0]!;
        return existing;
      }
      throw e;
    }

    try {
      const adapter = this.adapterFor(payment.provider as PaymentProvider);
      const result = await adapter.refund?.(payment.providerRef ?? payment.reference, input.amountCents, input.reason);
      const lines = input.depositId
        ? this.depositReleaseLines(booking.id, payment.id, refund.id, input.amountCents, input.depositId)
        : this.rentalReversalLines(booking, payment.id, refund.id, input.amountCents);
      await this.ledger.post(`refund:${refund.id}`, lines);

      const newTotal = Number(alreadyRefunded) + input.amountCents;
      const nextStatus = refundDerivedPaymentStatus(payment.amountCents, newTotal);
      assertPaymentTransition(payment.status as any, nextStatus);
      await this.db
        .update(payments)
        .set({ status: nextStatus, updatedAt: new Date() })
        .where(eq(payments.id, payment.id));
      refund = (
        await this.db
          .update(refunds)
          .set({ status: RefundStatus.SUCCEEDED, providerRef: result?.providerRef ?? reference, processedAt: new Date() })
          .where(eq(refunds.id, refund.id))
          .returning()
      )[0]!;
    } catch (e: any) {
      await this.db
        .update(refunds)
        .set({ status: RefundStatus.FAILED, failureReason: String(e?.message ?? e) })
        .where(eq(refunds.id, refund.id));
      throw e;
    }
    return refund;
  }

  private rentalReversalLines(booking: any, paymentId: string, refundId: string, amountCents: number) {
    // Composition of the original charge (cents): host share, commission, tax.
    const hostShare = booking.rentalSubtotalCents + booking.extrasCents + booking.deliveryCents - booking.discountCents;
    const fee = booking.serviceFeeCents;
    const tax = booking.taxCents;
    const total = hostShare + fee + tax;
    const scale = amountCents / total;
    const fromHost = Math.round(hostShare * scale);
    const fromFee = Math.round(fee * scale);
    const fromTax = amountCents - fromHost - fromFee; // rounding remainder to tax/fee bucket
    const lines: import('../ledger/ledger.service').LedgerLine[] = [
      {
        account: ACCOUNTS.CASH,
        direction: LedgerDirection.CREDIT,
        amountCents,
        memo: `Refund to customer (${reasonLabel(booking)})`,
        bookingId: booking.id,
        paymentId,
        refundId,
      },
    ];
    if (fromHost > 0)
      lines.push({
        account: ACCOUNTS.hostPayable(booking.hostProfileId),
        direction: LedgerDirection.DEBIT,
        amountCents: fromHost,
        memo: 'Refund reverses host earnings',
        bookingId: booking.id,
        refundId,
      });
    if (fromFee > 0)
      lines.push({
        account: ACCOUNTS.COMMISSION,
        direction: LedgerDirection.DEBIT,
        amountCents: fromFee,
        memo: 'Refund reverses service fee',
        bookingId: booking.id,
        refundId,
      });
    if (fromTax > 0)
      lines.push({
        account: ACCOUNTS.TAX,
        direction: LedgerDirection.DEBIT,
        amountCents: fromTax,
        memo: 'Refund reverses tax',
        bookingId: booking.id,
        refundId,
      });
    return lines;
  }

  private depositReleaseLines(bookingId: string, paymentId: string, refundId: string, amountCents: string | number, depositId: string) {
    return [
      {
        account: ACCOUNTS.DEPOSIT_LIABILITY,
        direction: LedgerDirection.DEBIT,
        amountCents: Number(amountCents),
        memo: 'Security deposit released to renter',
        bookingId,
        paymentId,
        refundId,
        depositId,
      },
      {
        account: ACCOUNTS.CASH,
        direction: LedgerDirection.CREDIT,
        amountCents: Number(amountCents),
        memo: 'Security deposit returned',
        bookingId,
        paymentId,
        refundId,
        depositId,
      },
    ];
  }

  async listForBooking(bookingId: string) {
    return this.db.select().from(refunds).where(eq(refunds.bookingId, bookingId));
  }

  async listAll(limit = 100) {
    const { desc } = await import('drizzle-orm');
    return this.db.select().from(refunds).orderBy(desc(refunds.createdAt)).limit(limit);
  }

  /** Release every matured, un-deducted COLLECTED deposit (cron). */
  async autoReleaseDueDeposits() {
    const { DepositsService } = await import('../deposits/deposits.service');
    void DepositsService;
    const now = new Date();
    const due = await this.db
      .select()
      .from(deposits)
      .where(
        and(
          eq(deposits.status, 'COLLECTED' as any),
          sql`${deposits.scheduledReleaseAt} is not null`,
          sql`${deposits.scheduledReleaseAt} <= ${now}`,
        ),
      );
    const out: any[] = [];
    for (const deposit of due) {
      const payment = (
        await this.db
          .select()
          .from(payments)
          .where(and(eq(payments.bookingId, deposit.bookingId), eq(payments.purpose, 'DEPOSIT' as any)))
          .limit(1)
      )[0];
      if (!payment) continue;
      const refund = await this.create({
        bookingId: deposit.bookingId,
        paymentId: payment.id,
        depositId: deposit.id,
        amountCents: deposit.amountCents - deposit.deductedCents,
        reason: 'Automatic deposit release after hold window',
        actorType: ActorType.SYSTEM,
        actorId: null,
        idempotencyKey: `auto-release:${deposit.id}`,
      });
      await this.markDepositRefundedIfAny(deposit.id);
      out.push(refund);
    }
    return { released: out.length, refunds: out };
  }

  async markDepositRefundedIfAny(depositId: string) {
    const deposit = (await this.db.select().from(deposits).where(eq(deposits.id, depositId)).limit(1))[0];
    if (!deposit) return;
    const status = deposit.deductedCents > 0 ? RS_DEPOSIT.PARTIALLY_DEDUCTED : RS_DEPOSIT.REFUNDED;
    await this.db
      .update(deposits)
      .set({ status, finalizedAt: new Date(), scheduledReleaseAt: null })
      .where(eq(deposits.id, depositId));
  }
}

const reasonLabel = (b: any) => `booking ${b.reference}`;
