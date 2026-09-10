import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { UserStatus } from '@hiregari/types';
import { DB, type Db } from '../../db/db.module';
import { users } from '../../db/schema/identity';
import { bookings } from '../../db/schema/commerce';
import { vehicles } from '../../db/schema/catalogue';
import { hostProfiles } from '../../db/schema/hosts';
import { driverVerifications } from '../../db/schema/identity';
import { damageReports, disputes } from '../../db/schema/operations';
import { payouts } from '../../db/schema/money';
import { notFound } from '../../core/http/errors';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AdminService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly audit: AuditService,
  ) {}

  async overview() {
    const [userCount, hostCounts, vehicleCounts, bookingCounts, openDisputes, openDamage, pendingPayouts] =
      await Promise.all([
        this.db.select({ n: sql<string>`count(*)` }).from(users),
        this.db
          .select({ status: hostProfiles.status, n: sql<string>`count(*)` })
          .from(hostProfiles)
          .groupBy(hostProfiles.status),
        this.db
          .select({ status: vehicles.status, n: sql<string>`count(*)` })
          .from(vehicles)
          .groupBy(vehicles.status),
        this.db
          .select({ status: bookings.status, n: sql<string>`count(*)` })
          .from(bookings)
          .groupBy(bookings.status),
        this.db
          .select({ n: sql<string>`count(*)` })
          .from(disputes)
          .where(
            or(
              eq(disputes.status, 'OPEN'),
              eq(disputes.status, 'AWAITING_CUSTOMER'),
              eq(disputes.status, 'AWAITING_HOST'),
              eq(disputes.status, 'UNDER_REVIEW'),
            )!,
          ),
        this.db
          .select({ n: sql<string>`count(*)` })
          .from(damageReports)
          .where(
            or(
              eq(damageReports.status, 'REPORTED'),
              eq(damageReports.status, 'ACKNOWLEDGED'),
              eq(damageReports.status, 'UNDER_REVIEW'),
            )!,
          ),
        this.db
          .select({ n: sql<string>`coalesce(sum(net_cents),0)` })
          .from(payouts)
          .where(eq(payouts.status, 'PENDING')),
      ]);
    return {
      users: Number(userCount[0]?.n ?? 0),
      hostsByStatus: hostCounts.map((r) => ({ status: r.status, count: Number(r.n) })),
      vehiclesByStatus: vehicleCounts.map((r) => ({ status: r.status, count: Number(r.n) })),
      bookingsByStatus: bookingCounts.map((r) => ({ status: r.status, count: Number(r.n) })),
      openDisputes: Number(openDisputes[0]?.n ?? 0),
      openDamageReports: Number(openDamage[0]?.n ?? 0),
      pendingPayoutCents: Number(pendingPayouts[0]?.n ?? 0),
    };
  }

  async listUsers(q: { search?: string; status?: string; limit?: number; offset?: number }) {
    const limit = Math.min(100, q.limit ?? 50);
    const filters = [
      q.status ? eq(users.status, q.status as any) : undefined,
      q.search
        ? or(
            ilike(users.email, `%${q.search}%`),
            ilike(users.phoneE164, `%${q.search}%`),
            ilike(users.firstName, `%${q.search}%`),
            ilike(users.lastName, `%${q.search}%`),
          )
        : undefined,
    ].filter(Boolean);
    const rows = await this.db
      .select({
        id: users.id,
        email: users.email,
        phoneE164: users.phoneE164,
        firstName: users.firstName,
        lastName: users.lastName,
        status: users.status,
        isDemo: users.isDemo,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt,
      })
      .from(users)
      .where(and(...(filters as any[])))
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(q.offset ?? 0);
    const total = await this.db
      .select({ n: sql<string>`count(*)` })
      .from(users)
      .where(and(...(filters as any[])));
    return { data: rows, total: Number(total[0]?.n ?? 0), limit, offset: q.offset ?? 0 };
  }

  async setUserStatus(adminId: string, userId: string, status: UserStatus, reason?: string) {
    const user = (await this.db.select().from(users).where(eq(users.id, userId)).limit(1))[0];
    if (!user) throw notFound('User');
    await this.db.update(users).set({ status, lockedUntil: status === UserStatus.SUSPENDED ? new Date(8_640_000_000_000) : null }).where(eq(users.id, userId));
    await this.audit.record({
      actorId: adminId,
      actorRole: 'ADMIN',
      action: `USER.${status}`,
      entityType: 'USER',
      entityId: userId,
      reason,
      prevValue: { status: user.status },
      newValue: { status },
    });
    return { id: userId, status };
  }

  async pendingHosts() {
    return this.db
      .select()
      .from(hostProfiles)
      .where(eq(hostProfiles.status, 'PENDING'))
      .orderBy(hostProfiles.createdAt);
  }

  async pendingVehicles() {
    return this.db
      .select({
        id: vehicles.id,
        reference: vehicles.reference,
        title: vehicles.title,
        make: vehicles.make,
        model: vehicles.model,
        year: vehicles.year,
        status: vehicles.status,
        hostProfileId: vehicles.hostProfileId,
        createdAt: vehicles.createdAt,
      })
      .from(vehicles)
      .where(eq(vehicles.status, 'PENDING_REVIEW'))
      .orderBy(vehicles.createdAt);
  }

  async pendingDriverVerifications() {
    return this.db
      .select()
      .from(driverVerifications)
      .where(
        or(
          eq(driverVerifications.status, 'PENDING'),
          eq(driverVerifications.status, 'MANUAL_REVIEW'),
        )!,
      )
      .orderBy(driverVerifications.createdAt);
  }
}
