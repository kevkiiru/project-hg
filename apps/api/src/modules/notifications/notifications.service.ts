import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import {
  NotificationChannel,
  NotificationStatus,
} from '@hiregari/types';
import { DB, type Db } from '../../db/db.module';
import { notifications } from '../../db/schema/trust';
import { users } from '../../db/schema/identity';
import { pagination } from '../../core/pagination';
import { EMAIL, SMS } from '../../integrations/integrations.module';
import type { EmailPort, SmsPort } from '../../integrations/ports';
import { logger } from '../../core/logger';

export interface NotifyInput {
  userId: string;
  type: string;
  title: string;
  body: string;
  context?: Record<string, any>;
  channels?: NotificationChannel[];
  emailSubject?: string;
  sms?: string;
  scheduledFor?: Date;
}

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(SMS) private readonly sms: SmsPort,
    @Inject(EMAIL) private readonly email: EmailPort,
  ) {}

  async notify(input: NotifyInput) {
    const channels = input.channels ?? [NotificationChannel.IN_APP];
    const rows = channels.map((channel) => ({
      userId: input.userId,
      type: input.type,
      channel,
      title: input.title,
      body: input.body,
      context: (input.context ?? {}) as any,
      status: NotificationStatus.QUEUED,
      scheduledFor: input.scheduledFor ?? new Date(),
    }));
    const inserted = await this.db.insert(notifications).values(rows).returning();
    const user = (await this.db.select().from(users).where(eq(users.id, input.userId)).limit(1))[0];

    for (let i = 0; i < inserted.length; i++) {
      const n = inserted[i]!;
      if (n.scheduledFor > new Date()) continue;
      try {
        if (n.channel === NotificationChannel.SMS && user?.phoneE164) {
          const r = await this.sms.send(user.phoneE164, input.sms ?? input.body);
          await this.db
            .update(notifications)
            .set({ status: NotificationStatus.SENT, sentAt: new Date(), providerRef: r.providerRef })
            .where(eq(notifications.id, n.id));
        } else if (n.channel === NotificationChannel.EMAIL && user?.email) {
          const r = await this.email.send(
            user.email,
            input.emailSubject ?? input.title,
            `<p>${input.body}</p>`,
            input.body,
          );
          await this.db
            .update(notifications)
            .set({ status: NotificationStatus.SENT, sentAt: new Date(), providerRef: r.providerRef })
            .where(eq(notifications.id, n.id));
        } else if (n.channel === NotificationChannel.IN_APP) {
          await this.db
            .update(notifications)
            .set({ status: NotificationStatus.DELIVERED, sentAt: new Date() })
            .where(eq(notifications.id, n.id));
        }
      } catch (e) {
        logger.warn('notification delivery failed', { id: n.id, error: String(e) });
        await this.db
          .update(notifications)
          .set({ status: NotificationStatus.FAILED, attempts: n.attempts + 1, lastError: String(e) })
          .where(eq(notifications.id, n.id));
      }
    }
    return inserted;
  }

  async list(userId: string, page = 1, pageSize = 20) {
    const { limit, offset } = pagination(page, pageSize);
    const rows = await this.db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);
    return { data: rows, page, pageSize };
  }

  async markRead(userId: string, id: string) {
    await this.db
      .update(notifications)
      .set({ status: NotificationStatus.DELIVERED })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
    return { ok: true };
  }
}
