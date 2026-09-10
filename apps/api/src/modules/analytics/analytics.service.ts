import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { ANALYTICS } from '../../integrations/integrations.module';
import type { AnalyticsPort } from '../../integrations/ports';
import { DB, type Db } from '../../db/db.module';
import { analyticsEvents } from '../../db/schema/trust';
import { bookings } from '../../db/schema/commerce';
import { payments } from '../../db/schema/money';

const ALLOWED_EVENTS = new Set([
  'SEARCH',
  'VIEW_VEHICLE',
  'QUOTE_CREATED',
  'CHECKOUT_STARTED',
  'PAYMENT_INITIATED',
  'PAYMENT_SUCCEEDED',
  'BOOKING_CONFIRMED',
  'BOOKING_CANCELLED',
  'SIGNUP_COMPLETED',
]);

@Injectable()
export class AnalyticsService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(ANALYTICS) private readonly analytics: AnalyticsPort,
  ) {}

  async track(userId: string | null, distinctId: string, event: string, props?: Record<string, unknown>) {
    if (!ALLOWED_EVENTS.has(event)) return { ignored: true };
    const safeProps = this.sanitize(props);
    await this.db.insert(analyticsEvents).values({
      distinctId,
      userId,
      event,
      props: safeProps,
    });
    try {
      await this.analytics.track(event, distinctId, safeProps);
    } catch {
      // external analytics failure never blocks the app
    }
    return { ok: true };
  }

  private sanitize(props?: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    if (!props) return out;
    for (const [k, v] of Object.entries(props)) {
      if (typeof v === 'string' && v.length > 500) continue;
      if (typeof v === 'object' && v !== null) continue; // no nested PII blobs
      out[k.slice(0, 60)] = v;
    }
    delete out.email;
    delete out.phone;
    delete out.password;
    delete out.token;
    delete out.card;
    return out;
  }

  /** Admin dashboard aggregates (Africa/Nairobi day boundaries applied by client). */
  async dashboard(fromIso?: string, toIso?: string) {
    const from = fromIso ? new Date(fromIso) : new Date(Date.now() - 30 * 86_400_000);
    const to = toIso ? new Date(toIso) : new Date();
    const [bookingAgg, paymentAgg, funnelRows, topVehicles] = await Promise.all([
      this.db
        .select({
          status: bookings.status,
          n: sql<string>`count(*)`,
          grossCents: sql<string>`coalesce(sum(total_cents), 0)`,
        })
        .from(bookings)
        .where(and(gte(bookings.createdAt, from), sql`${bookings.createdAt} <= ${to}`))
        .groupBy(bookings.status),
      this.db
        .select({
          n: sql<string>`count(*)`,
          amountCents: sql<string>`coalesce(sum(amount_cents), 0)`,
        })
        .from(payments)
        .where(
          and(
            eq(payments.status, 'SUCCEEDED' as any),
            gte(payments.paidAt ?? payments.createdAt, from),
            sql`${payments.createdAt} <= ${to}`,
          ),
        ),
      this.db
        .select({ event: analyticsEvents.event, n: sql<string>`count(*)` })
        .from(analyticsEvents)
        .where(and(gte(analyticsEvents.createdAt, from), sql`${analyticsEvents.createdAt} <= ${to}`))
        .groupBy(analyticsEvents.event)
        .orderBy(desc(sql`count(*)`)),
      this.db.execute(sql`
        select v.id, v.title, v.slug, count(b.id)::int as bookings, coalesce(sum(b.total_cents),0)::bigint as gross_cents
        from vehicles v
        left join bookings b on b.vehicle_id = v.id and b.created_at >= ${from} and b.created_at <= ${to}
        group by v.id, v.title, v.slug
        order by bookings desc
        limit 10`),
    ]);
    return {
      from,
      to,
      bookingsByStatus: bookingAgg.map((r) => ({ status: r.status, count: Number(r.n), grossCents: Number(r.grossCents) })),
      paymentsSucceeded: { count: Number(paymentAgg[0]?.n ?? 0), amountCents: Number(paymentAgg[0]?.amountCents ?? 0) },
      funnel: funnelRows.map((r) => ({ event: r.event, count: Number(r.n) })),
      topVehicles: topVehicles.rows,
    };
  }
}
