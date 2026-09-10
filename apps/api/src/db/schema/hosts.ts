import {
  doublePrecision,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import {
  businessMemberPg,
  hostStatusPg,
  hostTypePg,
  locationKindPg,
  verificationStatusPg,
} from './enums';
import { boolDefault, createdAt, fk, intDefault, jsonbDefault, pk, textDefault, updatedAt } from './_helpers';
import { users } from './identity';

export const hostProfiles = pgTable(
  'host_profiles',
  {
    id: pk(),
    userId: fk('user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: hostTypePg('type').notNull().default('INDIVIDUAL'),
    status: hostStatusPg('status').notNull().default('PENDING'),
    brandName: text('brand_name'),
    bio: text('bio'),
    avatarObjectKey: text('avatar_object_key'),
    payoutProvider: text('payout_provider'),
    payoutAccountRefEnc: text('payout_account_ref_enc'),
    payoutReadyAt: timestamp('payout_ready_at', { withTimezone: true }),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
    decidedById: uuid('decided_by_id'),
    decisionNote: text('decision_note'),
    ratingAverage: doublePrecision('rating_average').notNull().default(0),
    ratingCount: intDefault('rating_count', 0),
    isDemo: boolDefault('is_demo', false),
    metadata: jsonbDefault('metadata', {}),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('host_profiles_status_idx').on(t.status)],
);

export const businesses = pgTable(
  'businesses',
  {
    id: pk(),
    hostProfileId: fk('host_profile_id')
      .notNull()
      .references(() => hostProfiles.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    registrationNumber: text('registration_number'),
    kraPinEnc: text('kra_pin_enc'),
    phone: text('phone'),
    email: text('email'),
    authorizedRepresentativeName: text('authorized_representative_name'),
    authorizedRepresentativeUserId: uuid('authorized_representative_user_id'),
    verificationStatus: verificationStatusPg('verification_status').notNull().default('NOT_STARTED'),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
    decidedById: uuid('decided_by_id'),
    decisionNote: text('decision_note'),
    metadata: jsonbDefault('metadata', {}),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('businesses_verification_idx').on(t.verificationStatus)],
);

export const businessMembers = pgTable(
  'business_members',
  {
    id: pk(),
    businessId: fk('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull(),
    staffRole: text('staff_role').notNull(),
    permissions: text('permissions').array().notNull().default([]),
    status: businessMemberPg('status').notNull().default('INVITED'),
    invitedById: uuid('invited_by_id'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('business_members_user_idx').on(t.userId),
    uniqueIndex('business_member_uq').on(t.businessId, t.userId),
  ],
);

export const locations = pgTable(
  'locations',
  {
    id: pk(),
    kind: locationKindPg('kind').notNull(),
    country: textDefault('country', 'KE'),
    county: text('county'),
    city: text('city'),
    neighbourhood: text('neighbourhood'),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    lat: doublePrecision('lat').notNull(),
    lng: doublePrecision('lng').notNull(),
    suggested: boolDefault('suggested', false),
    sortOrder: integer('sort_order').notNull().default(0),
    aliases: text('aliases').array().notNull().default([]),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('locations_county_idx').on(t.county, t.kind)],
);
