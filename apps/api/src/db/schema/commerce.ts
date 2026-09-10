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
  adjustmentKindPg,
  adjustmentStatusPg,
  bookingModePg,
  bookingStatusPg,
  extraChargePg,
  holdStatusPg,
  mileagePolicyPg,
  fuelPolicyPg,
  pickupOptionPg,
  priceItemKindPg,
  promoKindPg,
  promoScopePg,
  quoteStatusPg,
} from './enums';
import { boolDefault, createdAt, fk, intDefault, jsonbDefault, pk, textDefault, updatedAt } from './_helpers';
import { vehicles } from './catalogue';
import { hostProfiles } from './hosts';

export const quotes = pgTable(
  'quotes',
  {
    id: pk(),
    reference: text('reference').notNull().unique(),
    userId: fk('user_id').notNull(),
    vehicleId: fk('vehicle_id')
      .notNull()
      .references(() => vehicles.id),
    status: quoteStatusPg('status').notNull().default('ACTIVE'),
    pickupAt: timestamp('pickup_at', { withTimezone: true }).notNull(),
    returnAt: timestamp('return_at', { withTimezone: true }).notNull(),
    timezone: textDefault('timezone', 'Africa/Nairobi'),
    pickupOption: pickupOptionPg('pickup_option').notNull().default('AT_LOCATION'),
    deliveryZoneId: fk('delivery_zone_id'),
    promoCodeId: fk('promo_code_id'),
    rentalSubtotalCents: integer('rental_subtotal_cents').notNull(),
    extrasCents: intDefault('extras_cents', 0),
    deliveryCents: intDefault('delivery_cents', 0),
    serviceFeeCents: intDefault('service_fee_cents', 0),
    discountCents: intDefault('discount_cents', 0),
    taxCents: intDefault('tax_cents', 0),
    depositCents: intDefault('deposit_cents', 0),
    totalCents: integer('total_cents').notNull(),
    refundableCents: intDefault('refundable_cents', 0),
    commissionBps: intDefault('commission_bps', 0),
    currency: textDefault('currency', 'KES'),
    extrasSelection: jsonb('extras_selection').notNull().default([]),
    pricingFingerprint: text('pricing_fingerprint').notNull(),
    idempotencyKey: text('idempotency_key').unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    index('quotes_user_idx').on(t.userId, t.status),
    index('quotes_vehicle_idx').on(t.vehicleId),
  ],
);

export const quoteItems = pgTable(
  'quote_items',
  {
    id: pk(),
    quoteId: fk('quote_id')
      .notNull()
      .references(() => quotes.id, { onDelete: 'cascade' }),
    kind: priceItemKindPg('kind').notNull(),
    code: text('code').notNull(),
    label: text('label').notNull(),
    quantity: intDefault('quantity', 1),
    unitCents: integer('unit_cents').notNull(),
    amountCents: integer('amount_cents').notNull(),
    metadata: jsonb('metadata'),
  },
  (t) => [index('quote_items_quote_idx').on(t.quoteId)],
);

export const promoCodes = pgTable(
  'promo_codes',
  {
    id: pk(),
    code: text('code').notNull().unique(),
    description: text('description'),
    kind: promoKindPg('kind').notNull(),
    percentBps: integer('percent_bps'),
    amountCents: integer('amount_cents'),
    maxDiscountCents: integer('max_discount_cents'),
    minBookingCents: intDefault('min_booking_cents', 0),
    scope: promoScopePg('scope').notNull().default('GLOBAL'),
    scopeId: fk('scope_id'),
    fundedBy: textDefault('funded_by', 'HOST'),
    startsAt: timestamp('starts_at', { withTimezone: true }),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    maxRedemptions: integer('max_redemptions'),
    perUserOnce: boolDefault('per_user_once', true),
    active: boolDefault('active', true),
    createdAt: createdAt(),
  },
  (t) => [index('promo_codes_active_idx').on(t.active)],
);

export const promoRedemptions = pgTable(
  'promo_redemptions',
  {
    id: pk(),
    promoId: fk('promo_id')
      .notNull()
      .references(() => promoCodes.id),
    userId: fk('user_id').notNull(),
    bookingId: fk('booking_id').notNull(),
    amountCents: integer('amount_cents').notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('promo_redemption_uq').on(t.promoId, t.userId, t.bookingId)],
);

export const bookings = pgTable(
  'bookings',
  {
    id: pk(),
    reference: text('reference').notNull().unique(),
    quoteId: fk('quote_id').unique().references(() => quotes.id),
    customerId: fk('customer_id').notNull(),
    vehicleId: fk('vehicle_id')
      .notNull()
      .references(() => vehicles.id),
    hostProfileId: fk('host_profile_id')
      .notNull()
      .references(() => hostProfiles.id),
    businessId: fk('business_id'),
    mode: bookingModePg('mode').notNull().default('REQUEST'),
    status: bookingStatusPg('status').notNull().default('DRAFT'),
    scheduledPickupAt: timestamp('scheduled_pickup_at', { withTimezone: true }).notNull(),
    scheduledReturnAt: timestamp('scheduled_return_at', { withTimezone: true }).notNull(),
    timezone: textDefault('timezone', 'Africa/Nairobi'),
    pickupOption: pickupOptionPg('pickup_option').notNull().default('AT_LOCATION'),
    deliveryZoneId: fk('delivery_zone_id'),
    deliverySnapshot: jsonb('delivery_snapshot'),
    rentalSubtotalCents: intDefault('rental_subtotal_cents', 0),
    extrasCents: intDefault('extras_cents', 0),
    deliveryCents: intDefault('delivery_cents', 0),
    serviceFeeCents: intDefault('service_fee_cents', 0),
    discountCents: intDefault('discount_cents', 0),
    taxCents: intDefault('tax_cents', 0),
    depositCents: intDefault('deposit_cents', 0),
    totalCents: intDefault('total_cents', 0),
    currency: textDefault('currency', 'KES'),
    commissionBps: intDefault('commission_bps', 0),
    mileagePolicyType: mileagePolicyPg('mileage_policy_type').notNull().default('UNLIMITED'),
    includedKmTotal: integer('included_km_total'),
    excessPerKmCents: integer('excess_per_km_cents'),
    fuelPolicy: fuelPolicyPg('fuel_policy').notNull().default('SAME_TO_SAME'),
    cancellationPolicyCode: text('cancellation_policy_code'),
    cancellation: jsonb('cancellation'),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    hostRespondedAt: timestamp('host_responded_at', { withTimezone: true }),
    pickedUpAt: timestamp('picked_up_at', { withTimezone: true }),
    returnedAt: timestamp('returned_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    declinedAt: timestamp('declined_at', { withTimezone: true }),
    expiredAt: timestamp('expired_at', { withTimezone: true }),
    extensionOfBookingId: fk('extension_of_booking_id'),
    lockVersion: intDefault('lock_version', 0),
    metadata: jsonbDefault('metadata', {}),
    isDemo: boolDefault('is_demo', false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('bookings_customer_idx').on(t.customerId, t.status),
    index('bookings_host_idx').on(t.hostProfileId, t.status),
    index('bookings_vehicle_idx').on(t.vehicleId, t.status),
    index('bookings_status_pickup_idx').on(t.status, t.scheduledPickupAt),
    index('bookings_extension_idx').on(t.extensionOfBookingId),
  ],
);

export const bookingHolds = pgTable(
  'booking_holds',
  {
    id: pk(),
    vehicleId: fk('vehicle_id').notNull(),
    bookingId: fk('booking_id').unique(),
    quoteId: fk('quote_id'),
    userId: fk('user_id').notNull(),
    status: holdStatusPg('status').notNull().default('ACTIVE'),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index('booking_holds_vehicle_idx').on(t.vehicleId, t.status, t.expiresAt),
    index('booking_holds_status_idx').on(t.status, t.expiresAt),
  ],
);

export const bookingStatusHistory = pgTable(
  'booking_status_history',
  {
    id: pk(),
    bookingId: fk('booking_id')
      .notNull()
      .references(() => bookings.id, { onDelete: 'cascade' }),
    fromStatus: bookingStatusPg('from_status'),
    toStatus: bookingStatusPg('to_status').notNull(),
    actorType: actorTypePg('actor_type').notNull().default('SYSTEM'),
    actorId: fk('actor_id'),
    reason: text('reason'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('booking_history_booking_idx').on(t.bookingId, t.createdAt)],
);

export const bookingPriceSnapshots = pgTable('booking_price_snapshots', {
  id: pk(),
  bookingId: fk('booking_id')
    .notNull()
    .unique()
    .references(() => bookings.id, { onDelete: 'cascade' }),
  currency: text('currency').notNull(),
  dailyRateCents: integer('daily_rate_cents').notNull(),
  billableDays: integer('billable_days').notNull(),
  rentalSubtotalCents: integer('rental_subtotal_cents').notNull(),
  extrasCents: integer('extras_cents').notNull(),
  deliveryCents: integer('delivery_cents').notNull(),
  serviceFeeCents: integer('service_fee_cents').notNull(),
  discountCents: integer('discount_cents').notNull(),
  taxCents: integer('tax_cents').notNull(),
  depositCents: integer('deposit_cents').notNull(),
  totalCents: integer('total_cents').notNull(),
  refundableCents: integer('refundable_cents').notNull(),
  commissionBps: integer('commission_bps').notNull(),
  createdAt: createdAt(),
});

export const bookingPriceItems = pgTable(
  'booking_price_items',
  {
    id: pk(),
    snapshotId: fk('snapshot_id')
      .notNull()
      .references(() => bookingPriceSnapshots.id, { onDelete: 'cascade' }),
    kind: priceItemKindPg('kind').notNull(),
    code: text('code').notNull(),
    label: text('label').notNull(),
    quantity: intDefault('quantity', 1),
    unitCents: integer('unit_cents').notNull(),
    amountCents: integer('amount_cents').notNull(),
    metadata: jsonb('metadata'),
  },
  (t) => [index('booking_price_items_snapshot_idx').on(t.snapshotId)],
);

export const bookingExtraSelections = pgTable(
  'booking_extra_selections',
  {
    id: pk(),
    bookingId: fk('booking_id').notNull(),
    code: text('code').notNull(),
    label: text('label').notNull(),
    chargeType: extraChargePg('charge_type').notNull(),
    quantity: integer('quantity').notNull(),
    unitCents: integer('unit_cents').notNull(),
    amountCents: integer('amount_cents').notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('booking_extra_booking_idx').on(t.bookingId)],
);

export const bookingAdjustments = pgTable(
  'booking_adjustments',
  {
    id: pk(),
    bookingId: fk('booking_id')
      .notNull()
      .references(() => bookings.id, { onDelete: 'cascade' }),
    kind: adjustmentKindPg('kind').notNull(),
    amountCents: integer('amount_cents').notNull(),
    currency: textDefault('currency', 'KES'),
    status: adjustmentStatusPg('status').notNull().default('PROPOSED'),
    reason: text('reason').notNull().default(''),
    actorType: actorTypePg('actor_type').notNull().default('SYSTEM'),
    createdById: fk('created_by_id'),
    decidedById: fk('decided_by_id'),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
    damageReportId: fk('damage_report_id'),
    metadata: jsonb('metadata'),
    createdAt: createdAt(),
  },
  (t) => [index('booking_adjustments_booking_idx').on(t.bookingId, t.status)],
);
