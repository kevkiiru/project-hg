import {
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import {
  actorTypePg,
  damageStatusPg,
  disputeStatusPg,
  disputeSubjectPg,
  incidentCategoryPg,
  inspectionTypePg,
} from './enums';
import { boolDefault, createdAt, fk, intDefault, jsonbDefault, pk, textDefault, updatedAt } from './_helpers';
import { bookings } from './commerce';

export const pickupInspections = pgTable('pickup_inspections', {
  id: pk(),
  bookingId: fk('booking_id')
    .notNull()
    .unique()
    .references(() => bookings.id, { onDelete: 'cascade' }),
  submittedById: fk('submitted_by_id').notNull(),
  odometerKm: doublePrecision('odometer_km'),
  fuelLevel: integer('fuel_level'),
  exteriorNotes: text('exterior_notes'),
  interiorNotes: text('interior_notes'),
  notes: text('notes'),
  lat: doublePrecision('lat'),
  lng: doublePrecision('lng'),
  renterSignedAt: timestamp('renter_signed_at', { withTimezone: true }),
  hostSignedAt: timestamp('host_signed_at', { withTimezone: true }),
  renterSignedById: fk('renter_signed_by_id'),
  hostSignedById: fk('host_signed_by_id'),
  createdAt: createdAt(),
});

export const returnInspections = pgTable('return_inspections', {
  id: pk(),
  bookingId: fk('booking_id')
    .notNull()
    .unique()
    .references(() => bookings.id, { onDelete: 'cascade' }),
  submittedById: fk('submitted_by_id').notNull(),
  odometerKm: doublePrecision('odometer_km'),
  fuelLevel: integer('fuel_level'),
  notes: text('notes'),
  actualReturnedAt: timestamp('actual_returned_at', { withTimezone: true }).notNull(),
  distanceKm: doublePrecision('distance_km'),
  lateMinutes: integer('late_minutes'),
  lat: doublePrecision('lat'),
  lng: doublePrecision('lng'),
  renterSignedAt: timestamp('renter_signed_at', { withTimezone: true }),
  hostSignedAt: timestamp('host_signed_at', { withTimezone: true }),
  renterSignedById: fk('renter_signed_by_id'),
  hostSignedById: fk('host_signed_by_id'),
  createdAt: createdAt(),
});

export const inspectionPhotos = pgTable(
  'inspection_photos',
  {
    id: pk(),
    inspectionType: inspectionTypePg('inspection_type').notNull(),
    pickupInspectionId: fk('pickup_inspection_id').references(() => pickupInspections.id, {
      onDelete: 'cascade',
    }),
    returnInspectionId: fk('return_inspection_id').references(() => returnInspections.id, {
      onDelete: 'cascade',
    }),
    bookingId: fk('booking_id').notNull(),
    objectKey: text('object_key').notNull(),
    angle: text('angle'),
    label: text('label'),
    uploadedById: fk('uploaded_by_id').notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('inspection_photos_booking_idx').on(t.bookingId)],
);

export const inspectionAmendments = pgTable(
  'inspection_amendments',
  {
    id: pk(),
    inspectionType: inspectionTypePg('inspection_type').notNull(),
    inspectionId: fk('inspection_id').notNull(),
    changes: jsonb('changes').notNull(),
    actorId: fk('actor_id').notNull(),
    reason: text('reason').notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('inspection_amendments_lookup_idx').on(t.inspectionType, t.inspectionId)],
);

export const damageReports = pgTable(
  'damage_reports',
  {
    id: pk(),
    bookingId: fk('booking_id')
      .notNull()
      .references(() => bookings.id, { onDelete: 'cascade' }),
    reportedByType: actorTypePg('reported_by_type').notNull(),
    reportedById: fk('reported_by_id').notNull(),
    category: text('category'),
    description: text('description').notNull(),
    estimatedAmountCents: integer('estimated_amount_cents'),
    currency: textDefault('currency', 'KES'),
    photoKeys: text('photo_keys').array().notNull().default([]),
    status: damageStatusPg('status').notNull().default('REPORTED'),
    decidedById: fk('decided_by_id'),
    decisionNote: text('decision_note'),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
    adjustmentId: fk('adjustment_id'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('damage_reports_booking_idx').on(t.bookingId),
    index('damage_reports_status_idx').on(t.status),
  ],
);

export const disputes = pgTable(
  'disputes',
  {
    id: pk(),
    reference: text('reference').notNull().unique(),
    bookingId: fk('booking_id')
      .notNull()
      .references(() => bookings.id, { onDelete: 'cascade' }),
    openedById: fk('opened_by_id').notNull(),
    openedByType: actorTypePg('opened_by_type').notNull(),
    subject: disputeSubjectPg('subject').notNull(),
    status: disputeStatusPg('status').notNull().default('OPEN'),
    description: text('description').notNull(),
    resolution: text('resolution'),
    assignedById: fk('assigned_by_id'),
    decidedById: fk('decided_by_id'),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('disputes_status_idx').on(t.status),
    index('disputes_booking_idx').on(t.bookingId),
  ],
);

export const disputeMessages = pgTable(
  'dispute_messages',
  {
    id: pk(),
    disputeId: fk('dispute_id')
      .notNull()
      .references(() => disputes.id, { onDelete: 'cascade' }),
    authorId: fk('author_id'),
    authorType: actorTypePg('author_type').notNull(),
    body: text('body').notNull(),
    internal: boolDefault('internal', false),
    attachments: text('attachments').array().notNull().default([]),
    createdAt: createdAt(),
  },
  (t) => [index('dispute_messages_dispute_idx').on(t.disputeId)],
);

export const incidentReports = pgTable(
  'incident_reports',
  {
    id: pk(),
    reference: text('reference').notNull().unique(),
    bookingId: fk('booking_id')
      .notNull()
      .references(() => bookings.id, { onDelete: 'cascade' }),
    reportedById: fk('reported_by_id').notNull(),
    category: incidentCategoryPg('category').notNull(),
    description: text('description').notNull(),
    lat: doublePrecision('lat'),
    lng: doublePrecision('lng'),
    photoKeys: text('photo_keys').array().notNull().default([]),
    policeRef: text('police_ref'),
    contactPhone: text('contact_phone'),
    status: textDefault('status', 'SUBMITTED'),
    acknowledgedById: fk('acknowledged_by_id'),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('incident_reports_booking_idx').on(t.bookingId)],
);
