import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import {
  ActorType,
  DamageStatus,
  DepositStatus,
  DisputeStatus,
  DisputeSubject,
  LedgerDirection,
} from '@hiregari/types';
import { DB, type Db } from '../../db/db.module';
import { damageReports, disputes, disputeMessages } from '../../db/schema/operations';
import { bookingStatusHistory, bookings } from '../../db/schema/commerce';
import { hostProfiles } from '../../db/schema/hosts';
import { deposits as depositsTable, payments } from '../../db/schema/money';
import { conflict, forbidden, notFound, unprocessable } from '../../core/http/errors';
import { BookingsService } from '../bookings/bookings.service';
import { DepositsService } from '../deposits/deposits.service';
import { RefundsService } from '../refunds/refunds.service';
import { LedgerService, ACCOUNTS } from '../ledger/ledger.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';

export interface DamageReportDto {
  category: string;
  description: string;
  estimatedAmountCents?: number;
  photoKeys?: string[];
}

@Injectable()
export class DamageService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly bookingsService: BookingsService,
    private readonly depositsService: DepositsService,
    private readonly refundsService: RefundsService,
    private readonly ledger: LedgerService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  async report(userId: string, bookingRef: string, dto: DamageReportDto) {
    const { booking, actorType } = await this.participant(bookingRef, userId);
    if (
      dto.estimatedAmountCents != null &&
      (!Number.isInteger(dto.estimatedAmountCents) || dto.estimatedAmountCents < 0)
    ) {
      throw unprocessable('BAD_AMOUNT', 'Amount must be a non-negative integer in cents.');
    }
    const row = (
      await this.db
        .insert(damageReports)
        .values({
          bookingId: booking.id,
          reportedByType: actorType,
          reportedById: userId,
          category: dto.category.slice(0, 80),
          description: dto.description,
          estimatedAmountCents: dto.estimatedAmountCents ?? null,
          photoKeys: dto.photoKeys ?? [],
          status: DamageStatus.REPORTED,
        })
        .returning()
    )[0]!;

    const other = actorType === ActorType.HOST ? booking.customerId : (await this.hostUserId(booking.hostProfileId));
    await this.notifications
      .notify({
        userId: other,
        type: 'DAMAGE_REPORTED',
        title: 'Damage report opened',
        body: `A damage report was opened for ${booking.reference}.`,
        channels: ['IN_APP' as any],
        context: { bookingRef: booking.reference },
      })
      .catch(() => undefined);
    return row;
  }

  private async participant(bookingRef: string, userId: string) {
    const booking = await this.bookingsService.getByRef(bookingRef);
    if (!booking) throw notFound('Booking');
    if (booking.customerId === userId) return { booking, actorType: ActorType.CUSTOMER };
    const host = (
      await this.db.select().from(hostProfiles).where(eq(hostProfiles.userId, userId)).limit(1)
    )[0];
    if (host && host.id === booking.hostProfileId) return { booking, actorType: ActorType.HOST };
    throw forbidden();
  }

  private async hostUserId(hostProfileId: string) {
    return (
      await this.db.select({ userId: hostProfiles.userId }).from(hostProfiles).where(eq(hostProfiles.id, hostProfileId)).limit(1)
    )[0]!.userId;
  }

  async hostPropose(hostUserId: string, damageId: string, amountCents: number, note: string) {
    const damage = await this.requireDamage(damageId);
    const host = (
      await this.db.select().from(hostProfiles).where(eq(hostProfiles.userId, hostUserId)).limit(1)
    )[0];
    const booking = await this.bookingsService.getById(damage.bookingId);
    if (!host || !booking || booking.hostProfileId !== host.id) throw forbidden();
    if (!([DamageStatus.REPORTED, DamageStatus.ACKNOWLEDGED, DamageStatus.UNDER_REVIEW] as DamageStatus[]).includes(damage.status as DamageStatus)) {
      throw conflict('DAMAGE_CLOSED', 'This damage report is already resolved.');
    }
    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      throw unprocessable('BAD_AMOUNT', 'Charge amount must be a positive integer in cents.');
    }
    const updated = (
      await this.db
        .update(damageReports)
        .set({ status: DamageStatus.UNDER_REVIEW, estimatedAmountCents: amountCents, decisionNote: note })
        .where(eq(damageReports.id, damageId))
        .returning()
    )[0]!;
    await this.notifications
      .notify({
        userId: booking.customerId,
        type: 'DAMAGE_CHARGE_PROPOSED',
        title: 'Damage charge proposed',
        body: `A charge of KSh ${(amountCents / 100).toLocaleString()} was proposed for ${booking.reference}. Accept or raise a dispute.`,
        channels: ['IN_APP' as any, 'SMS' as any],
        context: { bookingRef: booking.reference, damageId },
      })
      .catch(() => undefined);
    return updated;
  }

  /** Host closes a report with no charge. */
  async hostCloseNoCharge(hostUserId: string, damageId: string, note: string) {
    const damage = await this.requireDamage(damageId);
    const host = (
      await this.db.select().from(hostProfiles).where(eq(hostProfiles.userId, hostUserId)).limit(1)
    )[0];
    const booking = await this.bookingsService.getById(damage.bookingId);
    if (!host || !booking || booking.hostProfileId !== host.id) throw forbidden();
    return (
      await this.db
        .update(damageReports)
        .set({ status: DamageStatus.REJECTED, decisionNote: note, decidedAt: new Date(), decidedById: hostUserId })
        .where(eq(damageReports.id, damageId))
        .returning()
    )[0];
  }

  async renterAccept(customerId: string, damageId: string) {
    const damage = await this.requireDamage(damageId);
    const booking = await this.bookingsService.getById(damage.bookingId);
    if (!booking || booking.customerId !== customerId) throw forbidden();
    if (damage.status !== DamageStatus.UNDER_REVIEW) {
      throw conflict('DAMAGE_NOT_PROPOSED', 'There is no proposed charge to accept.');
    }
    return this.settleCharge(damage.id, booking.id, damage.estimatedAmountCents!, ActorType.CUSTOMER, customerId);
  }

  async renterDispute(customerId: string, damageId: string, description: string) {
    const damage = await this.requireDamage(damageId);
    const booking = await this.bookingsService.getById(damage.bookingId);
    if (!booking || booking.customerId !== customerId) throw forbidden();
    if (damage.status !== DamageStatus.UNDER_REVIEW) {
      throw conflict('DAMAGE_NOT_PROPOSED', 'There is no proposed charge to dispute.');
    }
    const dispute = (
      await this.db
        .insert(disputes)
        .values({
          reference: `HG-DP-${randomUUID().slice(0, 8).toUpperCase()}`,
          bookingId: booking.id,
          openedById: customerId,
          openedByType: ActorType.CUSTOMER,
          subject: DisputeSubject.DAMAGE,
          status: DisputeStatus.OPEN,
          description,
        })
        .returning()
    )[0]!;
    await this.db.insert(disputeMessages).values({
      disputeId: dispute.id,
      authorId: customerId,
      authorType: ActorType.CUSTOMER,
      body: `Disputing damage report ${damage.id}: ${description}`,
    });
    await this.db
      .update(damageReports)
      .set({ status: DamageStatus.UNDER_REVIEW, decidedById: null } as any)
      .where(eq(damageReports.id, damage.id));
    await this.audit.record({
      actorId: customerId,
      actorRole: ActorType.CUSTOMER,
      action: 'DISPUTE.OPEN',
      entityType: 'DAMAGE',
      entityId: damage.id,
      reason: description,
    });
    return dispute;
  }

  /** Admin final decision (binding): settles deposit, refunds remainder. */
  async adminDecide(adminId: string, damageId: string, amountCents: number, note: string) {
    const damage = await this.requireDamage(damageId);
    const booking = await this.bookingsService.getById(damage.bookingId);
    if (!booking) throw notFound('Booking');
    if (!Number.isInteger(amountCents) || amountCents < 0) {
      throw unprocessable('BAD_AMOUNT', 'Amount must be a non-negative integer in cents.');
    }
    if (amountCents === 0) {
      return (
        await this.db
          .update(damageReports)
          .set({ status: DamageStatus.REJECTED, decidedAt: new Date(), decidedById: adminId, decisionNote: note })
          .where(eq(damageReports.id, damageId))
          .returning()
      )[0];
    }
    const settled = await this.settleCharge(damage.id, booking.id, amountCents, ActorType.ADMIN, adminId, note);
    return settled;
  }

  private async settleCharge(
    damageId: string,
    bookingId: string,
    chargeCents: number,
    decidedByType: ActorType,
    decidedById: string,
    note?: string,
  ) {
    return this.db.transaction(async (tx) => {
      const deposit = (
        await tx.select().from(depositsTable).where(eq(depositsTable.bookingId, bookingId)).limit(1)
      )[0];
      const booking = (await tx.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1))[0]!;
      if (!deposit) {
        // No deposit collected — record as adjustment that must be billed out-of-band.
        const row = (
          await tx
            .update(damageReports)
            .set({ status: DamageStatus.ADJUSTED, decidedAt: new Date(), decidedById, decisionNote: note ?? 'No deposit held; billed out-of-band.' })
            .where(eq(damageReports.id, damageId))
            .returning()
        )[0]!;
        return { damage: row, depositDeductedCents: 0, depositReleasedCents: 0, outOfBandCents: chargeCents };
      }
      const available = deposit.amountCents - deposit.deductedCents - deposit.releasedCents;
      const deduct = Math.min(available, chargeCents);
      const release = available - deduct;

      if (deduct > 0) {
        // Move deducted deposit liability into the host's payable.
        await this.ledger.post(
          `damage-${damageId}`,
          [
            { account: ACCOUNTS.DEPOSIT_LIABILITY, direction: LedgerDirection.DEBIT, amountCents: deduct, memo: `damage ${damageId}` },
            { account: ACCOUNTS.hostPayable(booking.hostProfileId), direction: LedgerDirection.CREDIT, amountCents: deduct, memo: `damage comp ${damageId}` },
          ],
          tx,
        );
      }
      const finalDeducted = deposit.deductedCents + deduct;
      const finalReleased = deposit.releasedCents + release;
      const nextStatus =
        finalDeducted === 0
          ? DepositStatus.RELEASED
          : finalReleased === 0
            ? DepositStatus.DEDUCTED
            : DepositStatus.PARTIALLY_DEDUCTED;
      const updatedDeposit = (
        await tx
          .update(depositsTable)
          .set({
            status: nextStatus,
            deductedCents: finalDeducted,
            releasedCents: finalReleased,
            reasonCodes: [...((deposit.reasonCodes as string[] | null) ?? []), 'DAMAGE'],
            finalizedAt: new Date(),
            scheduledReleaseAt: null,
          })
          .where(eq(depositsTable.id, deposit.id))
          .returning()
      )[0]!;

      const damage = (
        await tx
          .update(damageReports)
          .set({
            status: deduct >= chargeCents ? DamageStatus.CHARGED : DamageStatus.ADJUSTED,
            estimatedAmountCents: chargeCents,
            decidedAt: new Date(),
            decidedById,
            decisionNote: note ?? (deduct < chargeCents ? 'Partially recovered from deposit; remainder billed out-of-band.' : null),
          })
          .where(eq(damageReports.id, damageId))
          .returning()
      )[0]!;

      // Remainder refund (deposit release to renter) is performed via the
      // refunds pipeline after commit (provider call).
      return { damage, updatedDeposit, releaseNow: release, outOfBandCents: chargeCents - deduct };
    }).then(async (result: any) => {
      if (result.releaseNow > 0) {
        const depositPayment = (
          await this.db
            .select()
            .from(payments)
            .where(and(eq(payments.bookingId, bookingId), eq(payments.purpose, 'DEPOSIT' as any)))
            .limit(1)
        )[0];
        if (depositPayment) {
          const refund = await this.refundsService.create({
            bookingId,
            paymentId: depositPayment.id,
            depositId: result.updatedDeposit.id,
            amountCents: result.releaseNow,
            reason: 'Deposit remainder released after damage resolution',
            actorType: decidedByType,
            actorId: decidedById,
            idempotencyKey: `damage-release:${damageId}`,
          });
          if (refund.depositId) await this.refundsService.markDepositRefundedIfAny(refund.depositId);
        }
      }
      await this.notifications
        .notify({
          userId: (await this.db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1))[0]!.customerId,
          type: 'DAMAGE_RESOLVED',
          title: 'Damage report resolved',
          body: `Damage report ${damageId.slice(0, 8)} was resolved${note ? `: ${note}` : '.'}`,
          channels: ['IN_APP' as any],
        })
        .catch(() => undefined);
      return result;
    });
  }

  async listForBooking(bookingRef: string, userId: string) {
    const { booking } = await this.requireAccessibleBooking(bookingRef, userId);
    return this.db
      .select()
      .from(damageReports)
      .where(eq(damageReports.bookingId, booking.id))
      .orderBy(desc(damageReports.createdAt));
  }

  private async requireAccessibleBooking(ref: string, userId: string) {
    const booking = await this.bookingsService.getByRef(ref);
    if (!booking) throw notFound('Booking');
    if (booking.customerId === userId) return { booking };
    const host = (
      await this.db.select().from(hostProfiles).where(eq(hostProfiles.userId, userId)).limit(1)
    )[0];
    if (host && host.id === booking.hostProfileId) return { booking };
    throw forbidden();
  }

  private async requireDamage(id: string) {
    const row = (await this.db.select().from(damageReports).where(eq(damageReports.id, id)).limit(1))[0];
    if (!row) throw notFound('Damage report');
    return row;
  }

  async listOpenForAdmin() {
    return this.db
      .select()
      .from(damageReports)
      .where(
        and(
          // anything not terminally closed
          eq(damageReports.status, DamageStatus.UNDER_REVIEW),
        ),
      )
      .orderBy(damageReports.createdAt);
  }

  // ── Disputes ────────────────────────────────────────────────────────────
  async listDisputesForBooking(bookingRef: string, userId: string) {
    const { booking } = await this.requireAccessibleBooking(bookingRef, userId);
    return this.db.select().from(disputes).where(eq(disputes.bookingId, booking.id));
  }

  async addDisputeMessage(userId: string, disputeRef: string, body: string, actorType: ActorType) {
    const dispute = (
      await this.db.select().from(disputes).where(eq(disputes.reference, disputeRef)).limit(1)
    )[0];
    if (!dispute) throw notFound('Dispute');
    return (
      await this.db
        .insert(disputeMessages)
        .values({ disputeId: dispute.id, authorId: userId, authorType: actorType, body })
        .returning()
    )[0];
  }

  async adminResolveDispute(adminId: string, disputeRef: string, resolution: string) {
    const dispute = (
      await this.db.select().from(disputes).where(eq(disputes.reference, disputeRef)).limit(1)
    )[0];
    if (!dispute) throw notFound('Dispute');
    const updated = (
      await this.db
        .update(disputes)
        .set({ status: DisputeStatus.RESOLVED, resolution, resolvedAt: new Date(), decidedById: adminId })
        .where(eq(disputes.id, dispute.id))
        .returning()
    );
    await this.db.insert(disputeMessages).values({
      disputeId: dispute.id,
      authorId: adminId,
      authorType: ActorType.ADMIN,
      body: `Resolution: ${resolution}`,
      internal: false,
    });
    await this.db.insert(bookingStatusHistory).values({
      bookingId: dispute.bookingId,
      fromStatus: null,
      toStatus: (await this.bookingsService.getById(dispute.bookingId))!.status as any,
      actorType: ActorType.ADMIN,
      actorId: adminId,
      reason: `dispute-resolved:${dispute.reference}`,
    });
    return updated[0];
  }
}
