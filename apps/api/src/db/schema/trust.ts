import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import {
  conversationTypePg,
  jobStatusPg,
  messageKindPg,
  moderationStatusPg,
  notificationChannelPg,
  notificationStatusPg,
  outboxStatusPg,
  reportStatusPg,
  reviewSubjectPg,
  supportStatusPg,
} from './enums';
import { boolDefault, createdAt, fk, intDefault, jsonbDefault, pk, textDefault, updatedAt } from './_helpers';
import { bookings } from './commerce';
import { users } from './identity';

export const conversations = pgTable(
  'conversations',
  {
    id: pk(),
    reference: text('reference').notNull().unique(),
    type: conversationTypePg('type').notNull(),
    bookingId: fk('booking_id'),
    vehicleId: fk('vehicle_id'),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index('conversations_booking_idx').on(t.bookingId), index('conversations_vehicle_idx').on(t.vehicleId)],
);

export const conversationParticipants = pgTable(
  'conversation_participants',
  {
    id: pk(),
    conversationId: fk('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    userId: fk('user_id').notNull(),
    lastReadAt: timestamp('last_read_at', { withTimezone: true }),
  },
  (t) => [uniqueIndex('conversation_participant_uq').on(t.conversationId, t.userId), index('cp_user_idx').on(t.userId)],
);

export const messages = pgTable(
  'messages',
  {
    id: pk(),
    conversationId: fk('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    senderId: fk('sender_id'),
    kind: messageKindPg('kind').notNull().default('TEXT'),
    body: text('body'),
    attachmentKey: text('attachment_key'),
    systemEventType: text('system_event_type'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('messages_conversation_idx').on(t.conversationId, t.createdAt)],
);

export const reviews = pgTable(
  'reviews',
  {
    id: pk(),
    bookingId: fk('booking_id')
      .notNull()
      .references(() => bookings.id, { onDelete: 'cascade' }),
    reviewerId: fk('reviewer_id').notNull(),
    subject: reviewSubjectPg('subject').notNull(),
    subjectId: fk('subject_id').notNull(),
    rating: integer('rating').notNull(),
    dimensions: jsonbDefault('dimensions', {}),
    comment: text('comment'),
    visible: boolDefault('visible', true),
    moderationStatus: moderationStatusPg('moderation_status').notNull().default('APPROVED'),
    hostReply: text('host_reply'),
    hostReplyAt: timestamp('host_reply_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('review_uq').on(t.bookingId, t.reviewerId, t.subject),
    index('reviews_subject_idx').on(t.subject, t.subjectId),
  ],
);

export const reviewReports = pgTable(
  'review_reports',
  {
    id: pk(),
    reviewId: fk('review_id').notNull(),
    reporterId: fk('reporter_id').notNull(),
    reason: text('reason').notNull(),
    status: reportStatusPg('status').notNull().default('OPEN'),
    createdAt: createdAt(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  },
  (t) => [index('review_reports_status_idx').on(t.status)],
);

export const notifications = pgTable(
  'notifications',
  {
    id: pk(),
    userId: fk('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    channel: notificationChannelPg('channel').notNull(),
    status: notificationStatusPg('status').notNull().default('QUEUED'),
    template: text('template'),
    title: text('title'),
    body: text('body'),
    context: jsonbDefault('context', {}),
    attempts: intDefault('attempts', 0),
    lastError: text('last_error'),
    providerRef: text('provider_ref'),
    scheduledFor: timestamp('scheduled_for', { withTimezone: true }).notNull().defaultNow(),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    index('notifications_user_idx').on(t.userId, t.createdAt),
    index('notifications_status_idx').on(t.status, t.scheduledFor),
  ],
);

export const outboxEvents = pgTable(
  'outbox_events',
  {
    id: pk(),
    aggregate: text('aggregate').notNull(),
    aggregateId: fk('aggregate_id'),
    type: text('type').notNull(),
    payload: jsonb('payload').notNull(),
    status: outboxStatusPg('status').notNull().default('PENDING'),
    attempts: intDefault('attempts', 0),
    lastError: text('last_error'),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull().defaultNow(),
    dispatchedAt: timestamp('dispatched_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index('outbox_status_idx').on(t.status, t.scheduledAt)],
);

export const jobRuns = pgTable(
  'job_runs',
  {
    id: pk(),
    name: text('name').notNull(),
    status: jobStatusPg('status').notNull().default('RUNNING'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    error: text('error'),
    metadata: jsonb('metadata'),
  },
  (t) => [index('job_runs_name_idx').on(t.name, t.startedAt)],
);

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: pk(),
    actorId: fk('actor_id'),
    actorRole: text('actor_role'),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: fk('entity_id').notNull(),
    prevValue: jsonb('prev_value'),
    newValue: jsonb('new_value'),
    reason: text('reason'),
    requestId: text('request_id'),
    ip: text('ip'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('audit_entity_idx').on(t.entityType, t.entityId, t.createdAt),
    index('audit_actor_idx').on(t.actorId, t.createdAt),
    index('audit_created_idx').on(t.createdAt),
  ],
);

export const analyticsEvents = pgTable(
  'analytics_events',
  {
    id: pk(),
    distinctId: text('distinct_id'),
    userId: fk('user_id').references(() => users.id, { onDelete: 'set null' }),
    event: text('event').notNull(),
    props: jsonbDefault('props', {}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('analytics_event_idx').on(t.event, t.createdAt),
    index('analytics_user_idx').on(t.userId),
  ],
);

export const supportRequests = pgTable(
  'support_requests',
  {
    id: pk(),
    reference: text('reference').notNull().unique(),
    userId: fk('user_id'),
    bookingId: fk('booking_id'),
    category: text('category').notNull(),
    subject: text('subject').notNull(),
    body: text('body').notNull(),
    status: supportStatusPg('status').notNull().default('OPEN'),
    email: text('email'),
    messages: jsonb('messages').notNull().default([]),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('support_status_idx').on(t.status)],
);

