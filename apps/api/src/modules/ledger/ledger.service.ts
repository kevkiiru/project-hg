import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { LedgerAccountType, LedgerDirection } from '@hiregari/types';
import { DB, type Db } from '../../db/db.module';
import { ledgerAccounts, ledgerEntries } from '../../db/schema/money';
import { unprocessable } from '../../core/http/errors';

export interface LedgerLine {
  account: string; // code; HOST_PAYABLE:<hostId> auto-created
  direction: LedgerDirection;
  amountCents: number;
  memo: string;
  bookingId?: string | null;
  paymentId?: string | null;
  payoutId?: string | null;
  depositId?: string | null;
  refundId?: string | null;
  externalRef?: string | null;
  autoAccount?: { name: string; type: LedgerAccountType };
}

@Injectable()
export class LedgerService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async ensureAccount(code: string, name?: string, type?: LedgerAccountType, currency = 'KES') {
    const existing = (
      await this.db.select().from(ledgerAccounts).where(eq(ledgerAccounts.code, code)).limit(1)
    )[0];
    if (existing) return existing;
    const inferred = inferAccount(code);
    return (
      await this.db
        .insert(ledgerAccounts)
        .values({
          code,
          name: name ?? inferred.name,
          type: type ?? inferred.type,
          currency,
        })
        .onConflictDoNothing()
        .returning()
    )[0]!;
  }

  /**
   * Post a balanced double-entry group atomically. Entries are idempotent by
   * key `${group}:${account}:${direction}`. Debits must equal credits.
   */
  async post(group: string, lines: LedgerLine[], tx?: any): Promise<string> {
    const postingGroup = group;
    const totalDebit = lines
      .filter((l) => l.direction === LedgerDirection.DEBIT)
      .reduce((a, l) => a + l.amountCents, 0);
    const totalCredit = lines
      .filter((l) => l.direction === LedgerDirection.CREDIT)
      .reduce((a, l) => a + l.amountCents, 0);
    if (totalDebit !== totalCredit || totalDebit <= 0) {
      throw unprocessable(
        'UNBALANCED_POSTING',
        `Unbalanced ledger posting: debit ${totalDebit} vs credit ${totalCredit}`,
      );
    }

    const run = tx ?? this.db;
    await run.transaction(async (t: any) => {
      for (const line of lines) {
        if (line.autoAccount || !STANDARD_ACCOUNTS[line.account.split(':')[0] ?? '']) {
          const inferred = inferAccount(line.account);
          await t
            .insert(ledgerAccounts)
            .values({
              code: line.account,
              name: line.autoAccount?.name ?? inferred.name,
              type: line.autoAccount?.type ?? inferred.type,
              currency: 'KES',
            })
            .onConflictDoNothing();
        }
      }
      const rows = lines.map((line) => ({
        postingGroup,
        accountId: sql`(select id from ledger_accounts where code = ${line.account})`,
        direction: line.direction,
        amountCents: line.amountCents,
        currency: 'KES',
        bookingId: line.bookingId ?? null,
        paymentId: line.paymentId ?? null,
        payoutId: line.payoutId ?? null,
        depositId: line.depositId ?? null,
        refundId: line.refundId ?? null,
        externalRef: line.externalRef ?? null,
        memo: line.memo,
        idempotencyKey: `${postingGroup}:${line.account}:${line.direction}`,
      }));
      try {
        await t.insert(ledgerEntries).values(rows);
      } catch (e: any) {
        // Duplicate posting: treated as already applied (idempotent).
        if (e?.code !== '23505') throw e;
      }
    });
    return postingGroup;
  }

  async balanceForBooking(bookingId: string) {
    const rows = await this.db
      .select({
        direction: ledgerEntries.direction,
        amount: sql<string>`sum(${ledgerEntries.amountCents})`,
      })
      .from(ledgerEntries)
      .where(eq(ledgerEntries.bookingId, bookingId))
      .groupBy(ledgerEntries.direction);
    const debit = rows.find((r) => r.direction === LedgerDirection.DEBIT);
    const credit = rows.find((r) => r.direction === LedgerDirection.CREDIT);
    return {
      debitCents: Number(debit?.amount ?? 0),
      creditCents: Number(credit?.amount ?? 0),
    };
  }

  async listAccounts() {
    return this.db.select().from(ledgerAccounts).orderBy(ledgerAccounts.code);
  }

  async listEntries(filter: { account?: string; bookingId?: string; from?: Date; to?: Date }) {
    const conds: any[] = [];
    if (filter.bookingId) conds.push(eq(ledgerEntries.bookingId, filter.bookingId));
    if (filter.from) conds.push(sql`${ledgerEntries.createdAt} >= ${filter.from}`);
    if (filter.to) conds.push(sql`${ledgerEntries.createdAt} <= ${filter.to}`);
    const rows = await this.db
      .select({
        id: ledgerEntries.id,
        postingGroup: ledgerEntries.postingGroup,
        accountCode: ledgerAccounts.code,
        direction: ledgerEntries.direction,
        amountCents: ledgerEntries.amountCents,
        memo: ledgerEntries.memo,
        bookingId: ledgerEntries.bookingId,
        paymentId: ledgerEntries.paymentId,
        payoutId: ledgerEntries.payoutId,
        depositId: ledgerEntries.depositId,
        refundId: ledgerEntries.refundId,
        createdAt: ledgerEntries.createdAt,
      })
      .from(ledgerEntries)
      .innerJoin(ledgerAccounts, eq(ledgerAccounts.id, ledgerEntries.accountId))
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(ledgerEntries.createdAt);
    return rows;
  }
}

const STANDARD_ACCOUNTS: Record<string, { name: string; type: LedgerAccountType }> = {
  HG_CASH: { name: 'Hiregari cash (customer collections)', type: LedgerAccountType.ASSET },
  HG_DEPOSIT_LIABILITY: { name: 'Security deposits held', type: LedgerAccountType.LIABILITY },
  HOST_PAYABLE: { name: 'Host earnings payable', type: LedgerAccountType.LIABILITY },
  HG_COMMISSION: { name: 'Hiregari service fee revenue', type: LedgerAccountType.REVENUE },
  HG_TAX_PAYABLE: { name: 'Tax payable', type: LedgerAccountType.LIABILITY },
  HG_PROMO_EXPENSE: { name: 'Platform-funded promotions', type: LedgerAccountType.EXPENSE },
};

function inferAccount(code: string): { name: string; type: LedgerAccountType } {
  const root = code.split(':')[0];
  return (
    STANDARD_ACCOUNTS[root as keyof typeof STANDARD_ACCOUNTS] ?? { name: code, type: LedgerAccountType.ASSET }
  );
}

export const ACCOUNTS = {
  CASH: 'HG_CASH',
  DEPOSIT_LIABILITY: 'HG_DEPOSIT_LIABILITY',
  hostPayable: (hostId: string) => `HOST_PAYABLE:${hostId}`,
  COMMISSION: 'HG_COMMISSION',
  TAX: 'HG_TAX_PAYABLE',
  PROMO_EXPENSE: 'HG_PROMO_EXPENSE',
};

export { randomUUID };
