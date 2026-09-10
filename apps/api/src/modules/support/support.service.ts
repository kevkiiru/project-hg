import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { SupportStatus } from '@hiregari/types';
import { DB, type Db } from '../../db/db.module';
import { supportRequests } from '../../db/schema/trust';
import { notFound } from '../../core/http/errors';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SupportService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly notifications: NotificationsService,
  ) {}

  async create(userId: string | null, dto: { category: string; subject: string; body: string; email?: string; bookingRef?: string }) {
    const request = (
      await this.db
        .insert(supportRequests)
        .values({
          reference: `HG-SR-${randomUUID().slice(0, 8).toUpperCase()}`,
          userId,
          bookingId: null,
          category: dto.category.slice(0, 60),
          subject: dto.subject.slice(0, 200),
          body: dto.body.slice(0, 4000),
          email: dto.email ?? null,
          status: SupportStatus.OPEN,
          messages: [{ from: 'USER', at: new Date().toISOString(), body: dto.body.slice(0, 4000) }],
        })
        .returning()
    )[0]!;
    return request;
  }

  async listMine(userId: string) {
    return this.db
      .select()
      .from(supportRequests)
      .where(eq(supportRequests.userId, userId))
      .orderBy(desc(supportRequests.createdAt));
  }

  async listAll(status?: SupportStatus) {
    return this.db
      .select()
      .from(supportRequests)
      .where(status ? eq(supportRequests.status, status) : undefined)
      .orderBy(desc(supportRequests.createdAt));
  }

  async append(userId: string, reference: string, body: string, fromRole: 'USER' | 'AGENT') {
    const request = (
      await this.db.select().from(supportRequests).where(eq(supportRequests.reference, reference)).limit(1)
    )[0];
    if (!request) throw notFound('Support request');
    const entry = { from: fromRole, by: userId, at: new Date().toISOString(), body: body.slice(0, 4000) };
    const updated = (
      await this.db
        .update(supportRequests)
        .set({
          messages: sql`${supportRequests.messages} || ${JSON.stringify([entry])}::jsonb`,
          status: fromRole === 'AGENT' ? SupportStatus.WAITING : SupportStatus.OPEN,
        })
        .where(eq(supportRequests.id, request.id))
        .returning()
    )[0]!;
    if (fromRole === 'AGENT' && request.userId) {
      await this.notifications
        .notify({
          userId: request.userId,
          type: 'SUPPORT_REPLY',
          title: 'Support replied',
          body: `Update on ${request.reference}: ${body.slice(0, 120)}`,
          channels: ['IN_APP' as any],
        })
        .catch(() => undefined);
    }
    return updated;
  }

  async setStatus(reference: string, status: SupportStatus) {
    return (
      await this.db
        .update(supportRequests)
        .set({ status })
        .where(eq(supportRequests.reference, reference))
        .returning()
    )[0];
  }
}
void and;
