import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import { PromoKind } from '@hiregari/types';
import { DB, type Db } from '../../db/db.module';
import { promoCodes, promoRedemptions } from '../../db/schema/commerce';
import { conflict, notFound, unprocessable } from '../../core/http/errors';

export interface PromoUpsert {
  code: string;
  description?: string;
  kind: PromoKind;
  percentBps?: number;
  amountCents?: number;
  maxDiscountCents?: number;
  minBookingCents?: number;
  scope?: 'GLOBAL' | 'HOST' | 'VEHICLE';
  scopeId?: string;
  fundedBy?: string;
  startsAt?: string;
  endsAt?: string;
  maxRedemptions?: number;
  perUserOnce?: boolean;
  active?: boolean;
}

@Injectable()
export class PromotionsService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async list() {
    return this.db.select().from(promoCodes).orderBy(desc(promoCodes.createdAt));
  }

  async create(dto: PromoUpsert) {
    const code = dto.code.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{4,32}$/.test(code)) {
      throw unprocessable('BAD_CODE', 'Code must be 4–32 uppercase letters, digits, - or _.');
    }
    if (dto.kind === PromoKind.PERCENT && !(dto.percentBps && dto.percentBps > 0 && dto.percentBps <= 10_000)) {
      throw unprocessable('BAD_VALUE', 'PERCENT promos need percentBps between 1 and 10000.');
    }
    if (dto.kind === PromoKind.FIXED && !(dto.amountCents && dto.amountCents > 0)) {
      throw unprocessable('BAD_VALUE', 'FIXED promos need a positive amountCents.');
    }
    try {
      return (
        await this.db
          .insert(promoCodes)
          .values({
            code,
            description: dto.description ?? null,
            kind: dto.kind,
            percentBps: dto.percentBps ?? null,
            amountCents: dto.amountCents ?? null,
            maxDiscountCents: dto.maxDiscountCents ?? null,
            minBookingCents: dto.minBookingCents ?? 0,
            scope: (dto.scope ?? 'GLOBAL') as any,
            scopeId: dto.scopeId ?? null,
            fundedBy: dto.fundedBy ?? 'HOST',
            startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
            endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
            maxRedemptions: dto.maxRedemptions ?? null,
            perUserOnce: dto.perUserOnce ?? true,
            active: dto.active ?? true,
          })
          .returning()
      )[0]!;
    } catch (e: any) {
      if (e?.code === '23505') throw conflict('PROMO_EXISTS', 'That code already exists.');
      throw e;
    }
  }

  async update(id: string, patch: Partial<PromoUpsert>) {
    const existing = (await this.db.select().from(promoCodes).where(eq(promoCodes.id, id)).limit(1))[0];
    if (!existing) throw notFound('Promo');
    return (
      await this.db
        .update(promoCodes)
        .set({
          description: patch.description ?? existing.description,
          percentBps: patch.percentBps ?? existing.percentBps,
          amountCents: patch.amountCents ?? existing.amountCents,
          maxDiscountCents: patch.maxDiscountCents ?? existing.maxDiscountCents,
          minBookingCents: patch.minBookingCents ?? existing.minBookingCents,
          scope: (patch.scope ?? existing.scope) as any,
          scopeId: patch.scopeId ?? existing.scopeId,
          startsAt: patch.startsAt ? new Date(patch.startsAt) : existing.startsAt,
          endsAt: patch.endsAt ? new Date(patch.endsAt) : existing.endsAt,
          maxRedemptions: patch.maxRedemptions ?? existing.maxRedemptions,
          perUserOnce: patch.perUserOnce ?? existing.perUserOnce,
          active: patch.active ?? existing.active,
        })
        .where(eq(promoCodes.id, id))
        .returning()
    )[0]!;
  }

  async redemptions(id: string) {
    const count = (
      await this.db
        .select({ n: sql<string>`count(*)` })
        .from(promoRedemptions)
        .where(eq(promoRedemptions.promoId, id))
    )[0]!;
    return { promoId: id, redemptions: Number(count.n) };
  }
}
void and;
