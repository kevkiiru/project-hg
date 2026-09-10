import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { ConversationType, MessageKind } from '@hiregari/types';
import { DB, type Db } from '../../db/db.module';
import {
  conversationParticipants,
  conversations,
  messages,
} from '../../db/schema/trust';
import { bookings } from '../../db/schema/commerce';
import { hostProfiles } from '../../db/schema/hosts';
import { vehicles } from '../../db/schema/catalogue';
import { forbidden, notFound, unprocessable } from '../../core/http/errors';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class MessagingService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly notifications: NotificationsService,
  ) {}

  async ensureBookingConversation(bookingId: string, customerId: string, hostProfileId: string) {
    const existing = (
      await this.db
        .select()
        .from(conversations)
        .where(and(eq(conversations.bookingId, bookingId), eq(conversations.type, ConversationType.BOOKING)))
        .limit(1)
    )[0];
    if (existing) return existing;
    const host = (
      await this.db.select().from(hostProfiles).where(eq(hostProfiles.id, hostProfileId)).limit(1)
    )[0]!;
    const booking = (await this.db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1))[0]!;
    return this.db.transaction(async (tx) => {
      const convo = (
        await tx
          .insert(conversations)
          .values({
            reference: `HG-CV-${randomUUID().slice(0, 8).toUpperCase()}`,
            type: ConversationType.BOOKING,
            bookingId,
            vehicleId: booking.vehicleId,
          })
          .returning()
      )[0]!;
      await tx.insert(conversationParticipants).values([
        { conversationId: convo.id, userId: customerId },
        { conversationId: convo.id, userId: host.userId },
      ]);
      return convo;
    });
  }

  async ensureListingConversation(customerId: string, vehicleId: string) {
    const vehicle = (
      await this.db.select().from(vehicles).where(eq(vehicles.id, vehicleId)).limit(1)
    )[0];
    if (!vehicle) throw notFound('Vehicle');
    const host = (
      await this.db.select().from(hostProfiles).where(eq(hostProfiles.id, vehicle.hostProfileId)).limit(1)
    )[0]!;
    // Reuse an existing listing convo for this pair + vehicle
    const mine = (
      await this.db
        .select({ id: conversations.id })
        .from(conversations)
        .innerJoin(conversationParticipants, eq(conversationParticipants.conversationId, conversations.id))
        .where(
          and(
            eq(conversations.type, ConversationType.LISTING),
            eq(conversations.vehicleId, vehicleId),
            eq(conversationParticipants.userId, customerId),
          ),
        )
        .limit(1)
    )[0];
    if (mine) return (await this.db.select().from(conversations).where(eq(conversations.id, mine.id)).limit(1))[0]!;
    return this.db.transaction(async (tx) => {
      const convo = (
        await tx
          .insert(conversations)
          .values({
            reference: `HG-CV-${randomUUID().slice(0, 8).toUpperCase()}`,
            type: ConversationType.LISTING,
            vehicleId,
            bookingId: null,
          })
          .returning()
      )[0]!;
      await tx.insert(conversationParticipants).values([
        { conversationId: convo.id, userId: customerId },
        { conversationId: convo.id, userId: host.userId },
      ]);
      return convo;
    });
  }

  async postSystemMessage(bookingId: string, body: string, systemEventType: string) {
    const convo = (
      await this.db
        .select()
        .from(conversations)
        .where(and(eq(conversations.bookingId, bookingId), eq(conversations.type, ConversationType.BOOKING)))
        .limit(1)
    )[0];
    if (!convo) return null;
    return this.insertMessage({
      conversationId: convo.id,
      kind: MessageKind.SYSTEM,
      body,
      systemEventType,
    });
  }

  async list(userId: string) {
    const rows = await this.db
      .select({
        id: conversations.id,
        reference: conversations.reference,
        type: conversations.type,
        bookingId: conversations.bookingId,
        vehicleId: conversations.vehicleId,
        lastMessageAt: conversations.lastMessageAt,
        lastBody: sql<string | null>`(select body from messages m where m.conversation_id = conversations.id order by created_at desc limit 1)`,
        vehicleTitle: sql<string | null>`(select title from vehicles v where v.id = conversations.vehicle_id)`,
        bookingRef: sql<string | null>`(select reference from bookings b where b.id = conversations.booking_id)`,
      })
      .from(conversations)
      .innerJoin(conversationParticipants, eq(conversationParticipants.conversationId, conversations.id))
      .where(eq(conversationParticipants.userId, userId))
      .orderBy(desc(conversations.lastMessageAt));
    return rows;
  }

  async requireParticipant(userId: string, conversationRef: string) {
    const convo = (
      await this.db.select().from(conversations).where(eq(conversations.reference, conversationRef)).limit(1)
    )[0];
    if (!convo) throw notFound('Conversation');
    const participant = (
      await this.db
        .select()
        .from(conversationParticipants)
        .where(
          and(
            eq(conversationParticipants.conversationId, convo.id),
            eq(conversationParticipants.userId, userId),
          ),
        )
        .limit(1)
    )[0];
    if (!participant) throw forbidden();
    return convo;
  }

  async messages(userId: string, conversationRef: string) {
    const convo = await this.requireParticipant(userId, conversationRef);
    const rows = await this.db
      .select({
        id: messages.id,
        conversationId: messages.conversationId,
        senderId: messages.senderId,
        kind: messages.kind,
        body: messages.body,
        systemEventType: messages.systemEventType,
        attachmentKey: messages.attachmentKey,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(eq(messages.conversationId, convo.id))
      .orderBy(messages.createdAt)
      .limit(500);
    return rows;
  }

  async send(userId: string, conversationRef: string, body: string) {
    const trimmed = body?.trim();
    if (!trimmed || trimmed.length > 4000) {
      throw unprocessable('BAD_MESSAGE', 'Message must be 1–4000 characters.');
    }
    const convo = await this.requireParticipant(userId, conversationRef);
    const msg = await this.insertMessage({ conversationId: convo.id, senderId: userId, kind: MessageKind.TEXT, body: trimmed });
    const others = await this.db
      .select({ userId: conversationParticipants.userId })
      .from(conversationParticipants)
      .where(
        and(eq(conversationParticipants.conversationId, convo.id), sql`${conversationParticipants.userId} <> ${userId}`),
      );
    for (const o of others) {
      await this.notifications
        .notify({
          userId: o.userId,
          type: 'NEW_MESSAGE',
          title: 'New message',
          body: trimmed.slice(0, 120),
          channels: ['IN_APP' as any],
          context: { conversationRef },
        })
        .catch(() => undefined);
    }
    return msg;
  }

  async markRead(userId: string, conversationRef: string) {
    const convo = await this.requireParticipant(userId, conversationRef);
    await this.db
      .update(conversationParticipants)
      .set({ lastReadAt: new Date() })
      .where(
        and(eq(conversationParticipants.conversationId, convo.id), eq(conversationParticipants.userId, userId)),
      );
    return { ok: true };
  }

  private async insertMessage(args: {
    conversationId: string;
    senderId?: string | null;
    kind: MessageKind;
    body?: string;
    systemEventType?: string;
  }) {
    const msg = (
      await this.db
        .insert(messages)
        .values({
          conversationId: args.conversationId,
          senderId: args.senderId ?? null,
          kind: args.kind,
          body: args.body ?? null,
          systemEventType: args.systemEventType ?? null,
        })
        .returning()
    )[0]!;
    await this.db
      .update(conversations)
      .set({ lastMessageAt: msg.createdAt })
      .where(eq(conversations.id, args.conversationId));
    return msg;
  }
}
