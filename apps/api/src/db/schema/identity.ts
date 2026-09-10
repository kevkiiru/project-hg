import { boolean, doublePrecision, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import {
  authTokenTypePg,
  documentStatusPg,
  otpChannelPg,
  otpPurposePg,
  rolePg,
  scopeTypePg,
  userStatusPg,
  verificationStatusPg,
  docOwnerPg,
  kycIdPg,
  riskResolutionPg,
} from './enums';
import { boolDefault, createdAt, fk, intDefault, jsonbDefault, pk, textDefault, updatedAt } from './_helpers';

// ── Users & auth ────────────────────────────────────────────────────────────
export const users = pgTable(
  'users',
  {
    id: pk(),
    email: text('email').unique(),
    emailNormalized: text('email_normalized').unique(),
    phoneE164: text('phone_e164').unique(),
    passwordHash: text('password_hash'),
    googleSubject: text('google_subject').unique(),
    appleSubject: text('apple_subject').unique(),
    firstName: textDefault('first_name', ''),
    lastName: textDefault('last_name', ''),
    avatarObjectKey: text('avatar_object_key'),
    status: userStatusPg('status').notNull().default('REGISTERED'),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    phoneVerifiedAt: timestamp('phone_verified_at', { withTimezone: true }),
    mfaSecretEnc: text('mfa_secret_enc'),
    mfaEnrolledAt: timestamp('mfa_enrolled_at', { withTimezone: true }),
    failedLoginCount: intDefault('failed_login_count', 0),
    lockedUntil: timestamp('locked_until', { withTimezone: true }),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    locale: textDefault('locale', 'en'),
    isDemo: boolDefault('is_demo', false),
    metadata: jsonbDefault('metadata', {}),
    anonymizedAt: timestamp('anonymized_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [index('users_status_idx').on(t.status)],
);

export const sessions = pgTable(
  'sessions',
  {
    id: pk(),
    userId: fk('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    csrfSecret: text('csrf_secret'),
    userAgent: text('user_agent'),
    ip: text('ip'),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }).notNull().defaultNow(),
    mfaVerifiedAt: timestamp('mfa_verified_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index('sessions_user_idx').on(t.userId)],
);

export const otpChallenges = pgTable(
  'otp_challenges',
  {
    id: pk(),
    userId: fk('user_id').references(() => users.id, { onDelete: 'cascade' }),
    channel: otpChannelPg('channel').notNull(),
    purpose: otpPurposePg('purpose').notNull(),
    to: text('to').notNull(),
    codeHash: text('code_hash').notNull(),
    attempts: intDefault('attempts', 0),
    maxAttempts: intDefault('max_attempts', 5),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    ip: text('ip'),
    userAgent: text('user_agent'),
    createdAt: createdAt(),
  },
  (t) => [index('otp_lookup_idx').on(t.to, t.purpose, t.createdAt)],
);

export const authTokens = pgTable(
  'auth_tokens',
  {
    id: pk(),
    userId: fk('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: authTokenTypePg('type').notNull(),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index('auth_tokens_user_idx').on(t.userId, t.type)],
);

export const roleAssignments = pgTable(
  'role_assignments',
  {
    id: pk(),
    userId: fk('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: rolePg('role').notNull(),
    scopeType: scopeTypePg('scope_type').notNull().default('GLOBAL'),
    scopeId: uuid('scope_id'),
    grantedById: uuid('granted_by_id'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('role_assignment_uq').on(t.userId, t.role, t.scopeType, t.scopeId),
    index('role_assignment_lookup_idx').on(t.role, t.scopeType, t.scopeId),
  ],
);

export const customerProfiles = pgTable('customer_profiles', {
  id: pk(),
  userId: fk('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  legalFirstName: textDefault('legal_first_name', ''),
  legalLastName: textDefault('legal_last_name', ''),
  dob: timestamp('dob', { withTimezone: true }),
  nationality: text('nationality'),
  countryOfResidence: text('country_of_residence'),
  photoObjectKey: text('photo_object_key'),
  verificationStatus: verificationStatusPg('verification_status').notNull().default('NOT_STARTED'),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  verificationNote: text('verification_note'),
  metadata: jsonbDefault('metadata', {}),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const addresses = pgTable(
  'addresses',
  {
    id: pk(),
    entityType: text('entity_type').notNull(),
    entityId: uuid('entity_id').notNull(),
    label: text('label'),
    country: textDefault('country', 'KE'),
    county: text('county'),
    city: text('city'),
    neighbourhood: text('neighbourhood'),
    street: text('street'),
    landmark: text('landmark'),
    postalCode: text('postal_code'),
    lat: doublePrecision('lat'),
    lng: doublePrecision('lng'),
    isPrimary: boolDefault('is_primary', false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('addresses_entity_idx').on(t.entityType, t.entityId)],
);

export const consentRecords = pgTable(
  'consent_records',
  {
    id: pk(),
    userId: fk('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    purpose: text('purpose').notNull(),
    version: text('version').notNull(),
    granted: boolean('granted').notNull(),
    ip: text('ip'),
    createdAt: createdAt(),
    withdrawnAt: timestamp('withdrawn_at', { withTimezone: true }),
  },
  (t) => [index('consent_user_idx').on(t.userId, t.purpose)],
);

// ── Driver verification ─────────────────────────────────────────────────────
export const driverVerifications = pgTable(
  'driver_verifications',
  {
    id: pk(),
    customerProfileId: fk('customer_profile_id')
      .notNull()
      .unique()
      .references(() => customerProfiles.id, { onDelete: 'cascade' }),
    status: verificationStatusPg('status').notNull().default('NOT_STARTED'),
    legalFirstName: textDefault('legal_first_name', ''),
    legalLastName: textDefault('legal_last_name', ''),
    dob: timestamp('dob', { withTimezone: true }),
    nationality: text('nationality'),
    idType: kycIdPg('id_type'),
    idNumberEnc: text('id_number_enc'),
    licenceNumberEnc: text('licence_number_enc'),
    licenceCountry: text('licence_country'),
    licenceIssuedAt: timestamp('licence_issued_at', { withTimezone: true }),
    licenceExpiresAt: timestamp('licence_expires_at', { withTimezone: true }),
    selfieObjectKey: text('selfie_object_key'),
    effectiveExpiryAt: timestamp('effective_expiry_at', { withTimezone: true }),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    reviewerId: uuid('reviewer_id'),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    rejectionReasons: text('rejection_reasons').array().notNull().default([]),
    providerReference: text('provider_reference'),
    metadata: jsonbDefault('metadata', {}),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('driver_verification_status_idx').on(t.status)],
);

export const verificationDocuments = pgTable(
  'verification_documents',
  {
    id: pk(),
    ownerType: docOwnerPg('owner_type').notNull(),
    ownerId: uuid('owner_id').notNull(),
    documentType: text('document_type').notNull(),
    objectKey: text('object_key').notNull(),
    fileName: text('file_name').notNull(),
    contentType: text('content_type').notNull(),
    sizeBytes: integer('size_bytes'),
    issuedAt: timestamp('issued_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    status: documentStatusPg('status').notNull().default('PENDING'),
    reviewerId: uuid('reviewer_id'),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewNote: text('review_note'),
    providerReference: text('provider_reference'),
    metadata: jsonbDefault('metadata', {}),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('verdoc_owner_idx').on(t.ownerType, t.ownerId),
    index('verdoc_status_idx').on(t.status, t.expiresAt),
  ],
);

export const riskEvents = pgTable(
  'risk_events',
  {
    id: pk(),
    userId: uuid('user_id'),
    bookingId: uuid('booking_id'),
    type: text('type').notNull(),
    signals: jsonbDefault('signals', {}),
    riskScore: intDefault('risk_score', 0),
    resolution: riskResolutionPg('resolution').notNull().default('OPEN'),
    reviewerId: uuid('reviewer_id'),
    note: text('note'),
    createdAt: createdAt(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  },
  (t) => [
    index('risk_resolution_idx').on(t.resolution, t.createdAt),
    index('risk_user_idx').on(t.userId),
  ],
);
