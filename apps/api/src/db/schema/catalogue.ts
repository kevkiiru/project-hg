import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import {
  blockReasonPg,
  cancellationTierPg,
  depositRulePg,
  documentStatusPg,
  drivetrainPg,
  extraChargePg,
  fuelPolicyPg,
  fuelTypePg,
  mileagePolicyPg,
  pickupOptionPg,
  pricingRuleKindPg,
  transmissionPg,
  vehicleCategoryPg,
  vehicleStatusPg,
} from './enums';
import { boolDefault, createdAt, fk, intDefault, jsonbDefault, pk, textDefault, updatedAt } from './_helpers';
import { businesses, hostProfiles } from './hosts';

export const vehicles = pgTable(
  'vehicles',
  {
    id: pk(),
    hostProfileId: fk('host_profile_id')
      .notNull()
      .references(() => hostProfiles.id, { onDelete: 'cascade' }),
    businessId: fk('business_id').references(() => businesses.id),
    reference: text('reference').notNull().unique(),
    slug: text('slug').notNull().unique(),
    status: vehicleStatusPg('status').notNull().default('DRAFT'),
    title: text('title'),
    make: text('make').notNull(),
    model: text('model').notNull(),
    year: integer('year').notNull(),
    category: vehicleCategoryPg('category').notNull(),
    transmission: transmissionPg('transmission'),
    fuelType: fuelTypePg('fuel_type'),
    seats: integer('seats'),
    doors: integer('doors'),
    engineCapacityCc: integer('engine_capacity_cc'),
    drivetrain: drivetrainPg('drivetrain'),
    bodyColour: text('body_colour'),
    licensePlateEnc: text('license_plate_enc'),
    instantBookEnabled: boolDefault('instant_book_enabled', false),
    selfDriveEnabled: boolDefault('self_drive_enabled', true),
    chauffeurEnabled: boolDefault('chauffeur_enabled', false),
    ac: boolDefault('ac', false),
    description: text('description'),
    ratingAverage: doublePrecision('rating_average').notNull().default(0),
    ratingCount: intDefault('rating_count', 0),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
    decidedById: fk('decided_by_id'),
    rejectionReason: text('rejection_reason'),
    isDemo: boolDefault('is_demo', false),
    metadata: jsonbDefault('metadata', {}),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('vehicles_status_category_idx').on(t.status, t.category),
    index('vehicles_host_idx').on(t.hostProfileId),
    index('vehicles_make_idx').on(t.make),
  ],
);

export const vehicleImages = pgTable(
  'vehicle_images',
  {
    id: pk(),
    vehicleId: fk('vehicle_id')
      .notNull()
      .references(() => vehicles.id, { onDelete: 'cascade' }),
    objectKey: text('object_key').notNull(),
    thumbnailKey: text('thumbnail_key'),
    width: integer('width'),
    height: integer('height'),
    position: intDefault('position', 0),
    isPrimary: boolDefault('is_primary', false),
    altText: text('alt_text'),
    status: documentStatusPg('status').notNull().default('PENDING'),
    createdAt: createdAt(),
  },
  (t) => [index('vehicle_images_vehicle_idx').on(t.vehicleId, t.position)],
);

export const featureCatalog = pgTable('feature_catalog', {
  code: text('code').primaryKey(),
  label: text('label').notNull(),
  icon: text('icon'),
  category: text('category'),
  active: boolean('active').notNull().default(true),
});

export const vehicleFeatures = pgTable(
  'vehicle_features',
  {
    id: pk(),
    vehicleId: fk('vehicle_id')
      .notNull()
      .references(() => vehicles.id, { onDelete: 'cascade' }),
    featureCode: text('feature_code').notNull(),
  },
  (t) => [uniqueIndex('vehicle_feature_uq').on(t.vehicleId, t.featureCode)],
);

export const vehicleDocuments = pgTable(
  'vehicle_documents',
  {
    id: pk(),
    vehicleId: fk('vehicle_id')
      .notNull()
      .references(() => vehicles.id, { onDelete: 'cascade' }),
    documentType: text('document_type').notNull(),
    objectKey: text('object_key').notNull(),
    fileName: text('file_name').notNull(),
    contentType: text('content_type'),
    insurerName: text('insurer_name'),
    policyNumberEnc: text('policy_number_enc'),
    coverType: text('cover_type'),
    restrictionsNote: text('restrictions_note'),
    issuedAt: timestamp('issued_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    mandatory: boolDefault('mandatory', true),
    status: documentStatusPg('status').notNull().default('PENDING'),
    reviewerId: fk('reviewer_id'),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewNote: text('review_note'),
    metadata: jsonbDefault('metadata', {}),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('vehicle_documents_vehicle_idx').on(t.vehicleId),
    index('vehicle_documents_status_idx').on(t.status, t.expiresAt),
  ],
);

export const vehicleLocations = pgTable(
  'vehicle_locations',
  {
    id: pk(),
    vehicleId: fk('vehicle_id')
      .notNull()
      .unique()
      .references(() => vehicles.id, { onDelete: 'cascade' }),
    locationId: fk('location_id'),
    locationName: text('location_name'),
    pickupInstruction: text('pickup_instruction'),
    lat: doublePrecision('lat').notNull(),
    lng: doublePrecision('lng').notNull(),
    deliveryEnabled: boolDefault('delivery_enabled', false),
    defaultAirportFeeCents: integer('default_airport_fee_cents'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('vehicle_locations_location_idx').on(t.locationId)],
);

export const deliveryZones = pgTable(
  'delivery_zones',
  {
    id: pk(),
    hostProfileId: fk('host_profile_id').references(() => hostProfiles.id),
    vehicleLocationId: fk('vehicle_location_id').references(() => vehicleLocations.id, {
      onDelete: 'cascade',
    }),
    name: text('name').notNull(),
    radiusKm: doublePrecision('radius_km'),
    feeCents: intDefault('fee_cents', 0),
    isAirport: boolDefault('is_airport', false),
    area: jsonb('area'),
    active: boolDefault('active', true),
    createdAt: createdAt(),
  },
  (t) => [index('delivery_zones_host_idx').on(t.hostProfileId)],
);

export const vehiclePricing = pgTable('vehicle_pricing', {
  id: pk(),
  vehicleId: fk('vehicle_id')
    .notNull()
    .unique()
    .references(() => vehicles.id, { onDelete: 'cascade' }),
  currency: textDefault('currency', 'KES'),
  dailyPriceCents: integer('daily_price_cents').notNull(),
  weeklyDiscountBps: intDefault('weekly_discount_bps', 0),
  monthlyDiscountBps: intDefault('monthly_discount_bps', 0),
  minimumRentalHours: intDefault('minimum_rental_hours', 24),
  minimumRentalDays: intDefault('minimum_rental_days', 1),
  depositRule: depositRulePg('deposit_rule').notNull().default('FIXED'),
  depositAmountCents: intDefault('deposit_amount_cents', 0),
  depositPercentBps: intDefault('deposit_percent_bps', 0),
  depositDailyMultiplierBps: intDefault('deposit_daily_multiplier_bps', 0),
  mileagePolicyType: mileagePolicyPg('mileage_policy_type').notNull().default('UNLIMITED'),
  includedKmPerDay: integer('included_km_per_day'),
  includedKmTotal: integer('included_km_total'),
  excessPerKmCents: integer('excess_per_km_cents'),
  fuelPolicy: fuelPolicyPg('fuel_policy').notNull().default('SAME_TO_SAME'),
  lateGraceMinutes: intDefault('late_grace_minutes', 60),
  lateHourlyFeeCents: intDefault('late_hourly_fee_cents', 0),
  cancellationPolicyId: fk('cancellation_policy_id'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const pricingRules = pgTable(
  'pricing_rules',
  {
    id: pk(),
    vehicleId: fk('vehicle_id')
      .notNull()
      .references(() => vehicles.id, { onDelete: 'cascade' }),
    kind: pricingRuleKindPg('kind').notNull(),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    dailyPriceCents: integer('daily_price_cents').notNull(),
    note: text('note'),
    createdAt: createdAt(),
  },
  (t) => [index('pricing_rules_vehicle_idx').on(t.vehicleId, t.startsAt)],
);

export const rentalExtras = pgTable(
  'rental_extras',
  {
    id: pk(),
    vehicleId: fk('vehicle_id').references(() => vehicles.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    label: text('label').notNull(),
    chargeType: extraChargePg('charge_type').notNull(),
    unitCents: integer('unit_cents').notNull(),
    maxQuantity: intDefault('max_quantity', 1),
    active: boolDefault('active', true),
    createdAt: createdAt(),
  },
  (t) => [index('rental_extras_vehicle_idx').on(t.vehicleId)],
);

export const cancellationPolicies = pgTable('cancellation_policies', {
  id: pk(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  tier: cancellationTierPg('tier').notNull(),
  rules: jsonb('rules').notNull().default([]),
  depositBehavior: text('deposit_behavior').notNull().default('RELEASE'),
  description: text('description'),
  isSystem: boolDefault('is_system', false),
  active: boolDefault('active', true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const availabilityBlocks = pgTable(
  'availability_blocks',
  {
    id: pk(),
    vehicleId: fk('vehicle_id')
      .notNull()
      .references(() => vehicles.id, { onDelete: 'cascade' }),
    reason: blockReasonPg('reason').notNull().default('MANUAL'),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    note: text('note'),
    createdById: fk('created_by_id'),
    createdAt: createdAt(),
  },
  (t) => [index('availability_blocks_vehicle_idx').on(t.vehicleId, t.startsAt, t.endsAt)],
);

