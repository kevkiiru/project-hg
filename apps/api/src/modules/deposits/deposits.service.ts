import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { DepositStatus } from '@hiregari/types';
import { DB, type Db } from '../../db/db.module';
import { deposits } from '../../db/schema/money';
import { bookings } from '../../db/schema/commerce';
import { assertDepositTransition } from '../../domain/machines';
import { conflict, notFound } from '../../core/http/errors';
import { config } from '../../core/config/config';

@Injectable()
export class DepositsService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async getForBooking(bookingId: string) {
    return (await this.db.select().from(deposits).where(eq(deposits.bookingId, bookingId)).limit(1))[0] ?? null;
  }

  async createIfRequired(
    tx: any,
    booking: { id: string; depositCents: number },
    ruleSnapshot: Record<string, unknown>,
  ) {
    if (!booking.depositCents) return null;
    const existing = await tx.select().from(deposits).where(eq(deposits.bookingId, booking.id)).limit(1);
    if (existing[0]) return existing[0];
    const row = (
      await tx
        .insert(deposits)
        .values({
          bookingId: booking.id,
          amountCents: booking.depositCents,
          status: DepositStatus.REQUIRED,
          rule: { ...ruleSnapshot, configuredReleaseHours: config().DEPOSIT_RELEASE_HOURS },
        })
        .returning()
    )[0]!;
    return row;
  }

  async transition(
    id: string,
    to: DepositStatus,
    patch: Partial<{
      status: DepositStatus;
      paymentId: string | null;
      releasedCents: number;
      deductedCents: number;
      reasonCodes: string[];
      scheduledReleaseAt: Date | null;
      finalizedAt: Date | null;
    }>,
    tx?: any,
  ) {
    const run = tx ?? this.db;
    const current = (await run.select().from(deposits).where(eq(deposits.id, id)).limit(1))[0];
    if (!current) throw notFound('Deposit');
    assertDepositTransition(current.status as DepositStatus, to);
    const next = (
      await run
        .update(deposits)
        .set({ status: to, ...(patch as any) })
        .where(eq(deposits.id, id))
        .returning()
    )[0]!;
    if (next.releasedCents + next.deductedCents > next.amountCents) {
      throw conflict('DEPOSIT_OVER_RESOLUTION', 'Deposit resolution exceeds the collected amount.');
    }
    return next;
  }

  async scheduleRelease(id: string, when: Date) {
    const current = (await this.db.select().from(deposits).where(eq(deposits.id, id)).limit(1))[0];
    if (!current) throw notFound('Deposit');
    await this.db.update(deposits).set({ scheduledReleaseAt: when }).where(eq(deposits.id, id));
  }

  async listDueRelease(now = new Date()) {
    const { DepositStatus: DS } = await import('@hiregari/types');
    return this.db
      .select()
      .from(deposits)
      .where(
        // status COLLECTED, scheduled in the past, not finalized
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        and(eq(deposits.status, DS.COLLECTED as any), sql`${deposits.scheduledReleaseAt} is not null`, sql`${deposits.scheduledReleaseAt} <= ${now}`),
      );
  }

  /** Pure resolution math used by the return flow. */
  planResolution(amountCents: number, deductionsCents: number) {
    const deduct = Math.min(amountCents, Math.max(0, deductionsCents));
    const release = amountCents - deduct;
    const status: DepositStatus =
      deduct === 0 ? DepositStatus.RELEASED : release === 0 ? DepositStatus.DEDUCTED : DepositStatus.PARTIALLY_DEDUCTED;
    return { deductCents: deduct, releaseCents: release, status };
  }
}
