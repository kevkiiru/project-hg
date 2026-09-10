import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import {
  actorTypePg,
  depositStatusPg,
  ledgerAccountTypePg,
  ledgerDirectionPg,
  paymentMethodPg,
  paymentProviderPg,
  paymentPurposePg,
  paymentStatusPg,
  payoutStatusPg,
  refundStatusPg,
  webhookStatusPg,
} from './enums';
import { createdAt, fk, intDefault, jsonbDefault, pk, textDefault, updatedAt } from './_helpers';
import { bookings } from './commerce';
import { hostProfiles } from './hosts';

export const payments = pgTable(
  'payments',
  {
    id: pk(),
    reference: text('reference').notNull().unique(),
    bookingId: fk('booking_id').references(() => bookings.id),
    purpose: paymentPurposePg('purpose').notNull().default('RENTAL'),
    provider: paymentProviderPg('provider').notNull(),
    method: paymentMethodPg('method').notNull(),
    status: paymentStatusPg('status').notNull().default('CREATED'),
    amountCents: integer('amount_cents').notNull(),
    currency: textDefault('currency', 'KES'),
    idempotencyKey: text('idempotency_key').notNull().unique(),
    providerRef: text('provider_ref'),
    providerCheckoutUrl: text('provider_checkout_url'),
    providerPayload: jsonb('provider_payload'),
    failureCode: text('failure_code'),
    failureMessage: text('failure_message'),
    requestedPhone: text('requested_phone'),
    initiatedById: fk('initiated_by_id'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('payments_booking_idx').on(t.bookingId, t.status),
    index('payments_provider_idx').on(t.provider, t.status),
    index('payments_status_expiry_idx').on(t.status, t.expiresAt),
  ],
);

export const paymentWebhookEvents = pgTable(
  'payment_webhook_events',
  {
    id: pk(),
    provider: paymentProviderPg('provider').notNull(),
    providerEventId: text('provider_event_id').notNull(),
    status: webhookStatusPg('status').notNull().default('RECEIVED'),
    signatureValid: boolean('signature_valid').notNull().default(false),
    rawPayload: text('raw_payload'),
    payloadHash: text('payload_hash').notNull(),
    attempts: intDefault('attempts', 0),
    lastError: text('last_error'),
    paymentRef: text('payment_ref'),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('webhook_provider_event_uq').on(t.provider, t.providerEventId),
    index('webhook_status_idx').on(t.status),
  ],
);

export const refunds = pgTable(
  'refunds',
  {
    id: pk(),
    reference: text('reference').notNull().unique(),
    bookingId: fk('booking_id')
      .notNull()
      .references(() => bookings.id),
    paymentId: fk('payment_id')
      .notNull()
      .references(() => payments.id),
    depositId: fk('deposit_id'),
    amountCents: integer('amount_cents').notNull(),
    currency: textDefault('currency', 'KES'),
    reason: text('reason').notNull().default(''),
    actorType: actorTypePg('actor_type').notNull(),
    actorId: fk('actor_id'),
    providerRef: text('provider_ref'),
    status: refundStatusPg('status').notNull().default('PENDING'),
    idempotencyKey: text('idempotency_key').notNull().unique(),
    failureReason: text('failure_reason'),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('refunds_booking_idx').on(t.bookingId), index('refunds_status_idx').on(t.status)],
);

export const deposits = pgTable(
  'deposits',
  {
    id: pk(),
    bookingId: fk('booking_id')
      .notNull()
      .unique()
      .references(() => bookings.id, { onDelete: 'cascade' }),
    status: depositStatusPg('status').notNull().default('REQUIRED'),
    rule: jsonbDefault('rule', {}),
    amountCents: integer('amount_cents').notNull(),
    currency: textDefault('currency', 'KES'),
    paymentId: fk('payment_id'),
    releasedCents: intDefault('released_cents', 0),
    deductedCents: intDefault('deducted_cents', 0),
    reasonCodes: jsonbDefault('reason_codes', []),
    scheduledReleaseAt: timestamp('scheduled_release_at', { withTimezone: true }),
    finalizedAt: timestamp('finalized_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('deposits_status_idx').on(t.status, t.scheduledReleaseAt)],
);

export const ledgerAccounts = pgTable('ledger_accounts', {
  id: pk(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  type: ledgerAccountTypePg('type').notNull(),
  currency: textDefault('currency', 'KES'),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  createdAt: createdAt(),
});

export const ledgerEntries = pgTable(
  'ledger_entries',
  {
    id: pk(),
    postingGroup: text('posting_group').notNull(),
    accountId: fk('account_id')
      .notNull()
      .references(() => ledgerAccounts.id),
    direction: ledgerDirectionPg('direction').notNull(),
    amountCents: integer('amount_cents').notNull(),
    currency: textDefault('currency', 'KES'),
    bookingId: fk('booking_id'),
    paymentId: fk('payment_id'),
    payoutId: fk('payout_id'),
    depositId: fk('deposit_id'),
    refundId: fk('refund_id'),
    externalRef: text('external_ref'),
    memo: text('memo').notNull(),
    idempotencyKey: text('idempotency_key').notNull().unique(),
    createdAt: createdAt(),
  },
  (t) => [
    index('ledger_posting_group_idx').on(t.postingGroup),
    index('ledger_account_idx').on(t.accountId, t.createdAt),
    index('ledger_booking_idx').on(t.bookingId),
  ],
);

export const payouts = pgTable(
  'payouts',
  {
    id: pk(),
    reference: text('reference').notNull().unique(),
    hostProfileId: fk('host_profile_id')
      .notNull()
      .references(() => hostProfiles.id),
    businessId: fk('business_id'),
    status: payoutStatusPg('status').notNull().default('PENDING'),
    grossCents: integer('gross_cents').notNull(),
    commissionCents: integer('commission_cents').notNull(),
    adjustmentsCents: intDefault('adjustments_cents', 0),
    netCents: integer('net_cents').notNull(),
    currency: textDefault('currency', 'KES'),
    scheduledFor: timestamp('scheduled_for', { withTimezone: true }),
    providerRef: text('provider_ref'),
    failureReason: text('failure_reason'),
    initiatedById: fk('initiated_by_id'),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('payouts_host_idx').on(t.hostProfileId, t.status),
    index('payouts_status_idx').on(t.status, t.scheduledFor),
  ],
);

export const payoutBookings = pgTable(
  'payout_bookings',
  {
    id: pk(),
    payoutId: fk('payout_id')
      .notNull()
      .references(() => payouts.id, { onDelete: 'cascade' }),
    bookingId: fk('booking_id')
      .notNull()
      .references(() => bookings.id),
    grossCents: integer('gross_cents').notNull(),
    commissionCents: integer('commission_cents').notNull(),
    adjustmentsCents: intDefault('adjustments_cents', 0),
    netCents: integer('net_cents').notNull(),
  },
  (t) => [
    uniqueIndex('payout_booking_uq').on(t.payoutId, t.bookingId),
    index('payout_bookings_booking_idx').on(t.bookingId),
  ],
);
