import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { ActorType, IncidentCategory } from '@hiregari/types';
import { DB, type Db } from '../../db/db.module';
import { incidentReports } from '../../db/schema/operations';
import { forbidden, notFound, unprocessable } from '../../core/http/errors';
import { BookingsService } from '../bookings/bookings.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class IncidentsService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly bookings: BookingsService,
    private readonly notifications: NotificationsService,
  ) {}

  async report(userId: string, bookingRef: string, dto: {
    category: IncidentCategory;
    description: string;
    lat?: number;
    lng?: number;
    photoKeys?: string[];
    policeRef?: string;
    contactPhone?: string;
  }) {
    const booking = await this.bookings.getByRef(bookingRef);
    if (!booking) throw notFound('Booking');
    if (booking.customerId !== userId) throw forbidden();
    if (!Object.values(IncidentCategory).includes(dto.category)) {
      throw unprocessable('BAD_CATEGORY', 'Unknown incident category.');
    }
    const incident = (
      await this.db
        .insert(incidentReports)
        .values({
          reference: `HG-IN-${randomUUID().slice(0, 8).toUpperCase()}`,
          bookingId: booking.id,
          reportedById: userId,
          category: dto.category,
          description: dto.description.slice(0, 4000),
          lat: dto.lat ?? null,
          lng: dto.lng ?? null,
          photoKeys: dto.photoKeys ?? [],
          policeRef: dto.policeRef ?? null,
          contactPhone: dto.contactPhone ?? null,
        })
        .returning()
    )[0]!;
    await this.notifications
      .notify({
        userId: '00000000-0000-0000-0000-000000000000', // placeholder; admins read the queue
        type: 'INCIDENT_REPORTED',
        title: `Incident: ${dto.category}`,
        body: `${incident.reference} on booking ${booking.reference}`,
        channels: ['IN_APP' as any],
      })
      .catch(() => undefined);
    return incident;
  }

  async listForBooking(userId: string, bookingRef: string) {
    const booking = await this.bookings.getByRef(bookingRef);
    if (!booking) throw notFound('Booking');
    if (booking.customerId !== userId) throw forbidden();
    return this.db
      .select()
      .from(incidentReports)
      .where(eq(incidentReports.bookingId, booking.id))
      .orderBy(desc(incidentReports.createdAt));
  }

  async listAll(status?: string) {
    return this.db
      .select()
      .from(incidentReports)
      .where(status ? eq(incidentReports.status, status) : undefined)
      .orderBy(desc(incidentReports.createdAt));
  }

  async acknowledge(adminId: string, reference: string) {
    const row = (
      await this.db.select().from(incidentReports).where(eq(incidentReports.reference, reference)).limit(1)
    )[0];
    if (!row) throw notFound('Incident');
    return (
      await this.db
        .update(incidentReports)
        .set({ status: 'ACKNOWLEDGED', acknowledgedById: adminId })
        .where(eq(incidentReports.id, row.id))
        .returning()
    )[0];
  }

  async resolve(adminId: string, reference: string) {
    void adminId;
    const row = (
      await this.db.select().from(incidentReports).where(eq(incidentReports.reference, reference)).limit(1)
    )[0];
    if (!row) throw notFound('Incident');
    return (
      await this.db
        .update(incidentReports)
        .set({ status: 'RESOLVED', resolvedAt: new Date() })
        .where(and(eq(incidentReports.id, row.id)))
        .returning()
    )[0];
  }
}
