import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray, notInArray, sql } from 'drizzle-orm';
import {
  BookingStatus,
  DisputeStatus,
  LedgerDirection,
  PayoutStatus,
  payoutReference,
} from '@hiregari/types';
import { DB, type Db } from '../../db/db.module';
import {
  deposits,
  ledgerAccounts,
  payoutBookings,
  payouts,
} from '../../db/schema/money';
import { bookings, bookingStatusHistory } from '../../db/schema/commerce';
import { disputes } from '../../db/schema/operations';
import { hostProfiles } from '../../db/schema/hosts';
import { conflict, forbidden, notFound } from '../../core/http/errors';
import { ACCOUNTS, LedgerService } from '../ledger/ledger.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import { config } from '../../core/config/config';

/**
 * Host payouts.
 *
 * NOTE — bank/mobile-money disbursement is not wired to a live provider yet
 * (REQUIRES BUSINESS DECISION: payout rail, KYC threshold, payout schedule).
 * The flow is fully ledger-backed; PAID is only reached by an explicit
 * finance approval that records the bank reference, never automatically.
 */
@Injectable()
export class PayoutsService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly ledger: LedgerService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  /** Bookings that are matured for payout and not yet attached to one. */
  private async eligibleBookings(hostProfileId: string) {
    const cooldownMs = config().PAYOUT_COOLDOWN_HOURS * 3_600_000;
    const maturedBefore = new Date(Date.now() - cooldownMs);
    const attached = this.db
      .select({ bookingId: payoutBookings.bookingId })
      .from(payoutBookings);
    const openDisputes = this.db
      .select({ bookingId: disputes.bookingId })
      .from(disputes)
      .where(
        inArray(disputes.status, [
          DisputeStatus.OPEN,
          DisputeStatus.AWAITING_CUSTOMER,
          DisputeStatus.AWAITING_HOST,
          DisputeStatus.UNDER_REVIEW,
        ]),
      );
    return this.db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.hostProfileId, hostProfileId),
          eq(bookings.status, BookingStatus.COMPLETED),
          sql`${bookings.returnedAt} is not null`,
          sql`${bookings.returnedAt} <= ${maturedBefore}`,
          notInArray(bookings.id, attached),
          notInArray(bookings.id, openDisputes),
        ),
      );
  }

  async previewForHost(hostUserId: string) {
    const host = (
      await this.db.select().from(hostProfiles).where(eq(hostProfiles.userId, hostUserId)).limit(1)
    )[0];
    if (!host) throw forbidden();
    const rows = await this.eligibleBookings(host.id);
    return this.buildStatement(host.id, rows);
  }

  private buildStatement(hostProfileId: string, rows: any[]) {
    const items = rows.map((b) => {
      const gross = b.rentalSubtotalCents + b.extrasCents + b.deliveryCents - b.discountCents;
      const commission = Math.round((gross * b.commissionBps) / 10_000);
      return { bookingId: b.id, bookingRef: b.reference, grossCents: gross, commissionCents: commission, netCents: gross - commission };
    });
    return {
      hostProfileId,
      count: items.length,
      grossCents: items.reduce((s, i) => s + i.grossCents, 0),
      commissionCents: items.reduce((s, i) => s + i.commissionCents, 0),
      adjustmentsCents: 0,
      netCents: items.reduce((s, i) => s + i.netCents, 0),
      items,
    };
  }

  /** Finance/cron: create a PENDING payout batch for every host with matured bookings. */
  async createDueBatches(actorId: string) {
    const hosts = await this.db
      .select({ id: hostProfiles.id })
      .from(hostProfiles)
      .where(sql`exists (
        select 1 from ${bookings} b
        where b.host_profile_id = ${hostProfiles.id}
          and b.status = 'COMPLETED'
          and b.returned_at is not null
          and b.returned_at <= now() - make_interval(hours => ${config().PAYOUT_COOLDOWN_HOURS})
      )`);
    const created: any[] = [];
    for (const { id } of hosts) {
      const rows = await this.eligibleBookings(id);
      if (!rows.length) continue;
      // damage compensation adjustments for these bookings
      const depositRows = await this.db
        .select()
        .from(deposits)
        .where(inArray(deposits.bookingId, rows.map((r) => r.id)));
      const adjustments = depositRows.reduce((s, d) => s + d.deductedCents, 0);
      const statement = this.buildStatement(id, rows);
      if (statement.netCents + adjustments <= 0) continue;
      const payout = (
        await this.db
          .insert(payouts)
          .values({
            reference: payoutReference(),
            hostProfileId: id,
            status: PayoutStatus.PENDING,
            grossCents: statement.grossCents + adjustments,
            commissionCents: statement.commissionCents,
            adjustmentsCents: adjustments,
            netCents: statement.netCents + adjustments,
            currency: 'KES',
            // Cron has no human actor; initiated_by_id is a uuid column, so
            // the system runner records null (history row says 'system').
            initiatedById: actorId === 'system' ? null : actorId,
          })
          .returning()
      )[0]!;
      await this.db.insert(payoutBookings).values(
        statement.items.map((i) => ({
          payoutId: payout.id,
          bookingId: i.bookingId,
          grossCents: i.grossCents,
          commissionCents: i.commissionCents,
          netCents: i.netCents,
        })),
      );
      created.push(payout);
    }
    return { created: created.length, payouts: created };
  }

  /** Finance approval → PAID, records bank reference and moves ledger cash. */
  async markPaid(actorId: string, payoutRef: string, providerRef: string) {
    const payout = (
      await this.db.select().from(payouts).where(eq(payouts.reference, payoutRef)).limit(1)
    )[0];
    if (!payout) throw notFound('Payout');
    if (!([PayoutStatus.PENDING, PayoutStatus.SCHEDULED, PayoutStatus.PROCESSING, PayoutStatus.FAILED] as PayoutStatus[]).includes(payout.status as PayoutStatus)) {
      throw conflict('PAYOUT_CLOSED', 'This payout has already been paid.');
    }
    await this.db.transaction(async (tx) => {
      await tx
        .update(payouts)
        .set({ status: PayoutStatus.PAID, providerRef, processedAt: new Date() })
        .where(eq(payouts.id, payout.id));
      const account = await tx
        .select()
        .from(ledgerAccounts)
        .where(eq(ledgerAccounts.code, ACCOUNTS.hostPayable(payout.hostProfileId)))
        .limit(1);
      if (account[0]) {
        // Settle the full host payable: cash out net earnings and recognize
        // the platform commission that was withheld from the host. Any
        // renter-facing service fee (off by default; see RENTER_SERVICE_FEE_BPS
        // / BLED-001) is booked to HG_COMMISSION separately at confirmation.
        // One DEBIT per account per posting group (the ledger idempotency key
        // is group:account:direction), so settle the full gross host payable
        // in a single debit, split on the credit side (cash to host + the
        // commission withheld for the platform).
        const grossSettlement = payout.netCents + payout.commissionCents;
        const lines: any[] = [
          { account: ACCOUNTS.hostPayable(payout.hostProfileId), direction: LedgerDirection.DEBIT, amountCents: grossSettlement, memo: `payout settled ${payout.reference} (net ${payout.netCents} + commission ${payout.commissionCents})`, payoutId: payout.id },
          { account: ACCOUNTS.CASH, direction: LedgerDirection.CREDIT, amountCents: payout.netCents, memo: `payout ${payout.reference}`, payoutId: payout.id },
        ];
        if (payout.commissionCents > 0) {
          lines.push(
            { account: ACCOUNTS.COMMISSION, direction: LedgerDirection.CREDIT, amountCents: payout.commissionCents, memo: `commission withheld ${payout.reference}`, payoutId: payout.id },
          );
        }
        await this.ledger.post(`payout-${payout.id}`, lines, tx);
      }
      await tx.insert(bookingStatusHistory).values({
        bookingId: (
          await tx
            .select({ bookingId: payoutBookings.bookingId })
            .from(payoutBookings)
            .where(eq(payoutBookings.payoutId, payout.id))
            .limit(1)
        )[0]?.bookingId ?? null as any,
        fromStatus: null,
        toStatus: BookingStatus.COMPLETED,
        actorType: 'ADMIN' as any,
        actorId,
        reason: `payout-paid:${payout.reference}`,
      }).catch(() => undefined);
    });
    const host = (
      await this.db.select().from(hostProfiles).where(eq(hostProfiles.id, payout.hostProfileId)).limit(1)
    )[0]!;
    await this.notifications
      .notify({
        userId: host.userId,
        type: 'PAYOUT_PAID',
        title: 'Payout sent',
        body: `Payout ${payout.reference} of KSh ${(payout.netCents / 100).toLocaleString()} has been sent (ref ${providerRef}).`,
        channels: ['IN_APP' as any],
      })
      .catch(() => undefined);
    await this.audit.record({
      actorId,
      actorRole: 'FINANCE' as any,
      action: 'PAYOUT.MARK_PAID',
      entityType: 'PAYOUT',
      entityId: payout.id,
      newValue: { reference: payout.reference, providerRef, netCents: payout.netCents },
    });
    return (await this.db.select().from(payouts).where(eq(payouts.id, payout.id)).limit(1))[0];
  }

  async markFailed(actorId: string, payoutRef: string, reason: string) {
    const payout = (
      await this.db.select().from(payouts).where(eq(payouts.reference, payoutRef)).limit(1)
    )[0];
    if (!payout) throw notFound('Payout');
    return (
      await this.db
        .update(payouts)
        .set({ status: PayoutStatus.FAILED, failureReason: reason })
        .where(eq(payouts.id, payout.id))
        .returning()
    )[0];
  }

  async listForHost(hostUserId: string) {
    const host = (
      await this.db.select().from(hostProfiles).where(eq(hostProfiles.userId, hostUserId)).limit(1)
    )[0];
    if (!host) throw forbidden();
    return this.db
      .select()
      .from(payouts)
      .where(eq(payouts.hostProfileId, host.id))
      .orderBy(payouts.createdAt);
  }

  async detailForHost(hostUserId: string, reference: string) {
    const host = (
      await this.db.select().from(hostProfiles).where(eq(hostProfiles.userId, hostUserId)).limit(1)
    )[0];
    if (!host) throw forbidden();
    const payout = (
      await this.db
        .select()
        .from(payouts)
        .where(and(eq(payouts.reference, reference), eq(payouts.hostProfileId, host.id)))
        .limit(1)
    )[0];
    if (!payout) throw notFound('Payout');
    return this.detail(reference);
  }

  async listAll(status?: PayoutStatus) {
    return this.db
      .select()
      .from(payouts)
      .where(status ? eq(payouts.status, status) : undefined)
      .orderBy(payouts.createdAt);
  }

  async detail(reference: string) {
    const payout = (
      await this.db.select().from(payouts).where(eq(payouts.reference, reference)).limit(1)
    )[0];
    if (!payout) throw notFound('Payout');
    const rows = await this.db
      .select({
        id: payoutBookings.id,
        bookingId: payoutBookings.bookingId,
        grossCents: payoutBookings.grossCents,
        commissionCents: payoutBookings.commissionCents,
        adjustmentsCents: payoutBookings.adjustmentsCents,
        netCents: payoutBookings.netCents,
        bookingRef: bookings.reference,
      })
      .from(payoutBookings)
      .innerJoin(bookings, eq(bookings.id, payoutBookings.bookingId))
      .where(eq(payoutBookings.payoutId, payout.id));
    return { payout, bookings: rows };
  }
}
