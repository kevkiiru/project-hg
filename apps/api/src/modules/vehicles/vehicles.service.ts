import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, inArray, ne, sql } from 'drizzle-orm';
import {
  BookingStatus,
  HoldStatus,
  HostStatus,
  VehicleStatus,
  vehicleReference,
} from '@hiregari/types';
import { DB, type Db } from '../../db/db.module';
import {
  availabilityBlocks,
  cancellationPolicies,
  deliveryZones,
  featureCatalog,
  rentalExtras,
  vehicleDocuments,
  vehicleFeatures,
  vehicleImages,
  vehicleLocations,
  vehiclePricing,
  vehicles,
} from '../../db/schema/catalogue';
import { hostProfiles } from '../../db/schema/hosts';
import { bookings, bookingHolds } from '../../db/schema/commerce';
import { conflict, forbidden, notFound, unprocessable } from '../../core/http/errors';
import { AuditService } from '../audit/audit.service';

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

@Injectable()
export class VehiclesService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly audit: AuditService,
  ) {}

  // ── Wizard ────────────────────────────────────────────────────────────────
  async createDraft(userId: string, dto: { make: string; model: string; year: number; category: any }) {
    const host = await this.requireVerifiedOrPendingHost(userId);
    const reference = vehicleReference();
    const base = `${dto.year}-${dto.make}-${dto.model}`;
    const slug = await this.uniqueSlug(slugify(base), reference.slice(-5));
    const vehicle = (
      await this.db
        .insert(vehicles)
        .values({
          hostProfileId: host.id,
          reference,
          slug,
          status: VehicleStatus.DRAFT,
          make: dto.make,
          model: dto.model,
          year: dto.year,
          category: dto.category,
          isDemo: false,
        })
        .returning()
    )[0]!;
    return vehicle;
  }

  private async uniqueSlug(base: string, suffix: string): Promise<string> {
    const candidate = `${base}-${suffix.slice(0, 5)}`.toLowerCase();
    const clash = await this.db.select({ id: vehicles.id }).from(vehicles).where(eq(vehicles.slug, candidate));
    if (clash.length === 0) return candidate;
    return this.uniqueSlug(base, `${suffix}${Math.random().toString(36).slice(2, 5)}`);
  }

  async requireOwnedVehicle(userId: string, vehicleId: string) {
    const host = (
      await this.db.select().from(hostProfiles).where(eq(hostProfiles.userId, userId)).limit(1)
    )[0];
    const vehicle = (
      await this.db.select().from(vehicles).where(eq(vehicles.id, vehicleId)).limit(1)
    )[0];
    if (!vehicle) throw notFound('Vehicle');
    if (!host || (vehicle.hostProfileId !== host.id && !(await this.isStaff(userId, vehicle.businessId)))) {
      throw forbidden('This vehicle belongs to another host.');
    }
    return { vehicle, host };
  }

  private async isStaff(_userId: string, _businessId: string | null): Promise<boolean> {
    // Staff scoping is enforced through HOST_STAFF role assignments (BUSINESS
    // scope) handled by RBAC + business membership in a production-hardened
    // pass; MVP treats direct host ownership as authoritative.
    return false;
  }

  private async requireVerifiedOrPendingHost(userId: string) {
    const host = (
      await this.db.select().from(hostProfiles).where(eq(hostProfiles.userId, userId)).limit(1)
    )[0];
    if (!host) throw forbidden('Set up your host profile before adding vehicles.');
    return host;
  }

  async updateWizard(userId: string, vehicleId: string, patch: Record<string, any>) {
    const { vehicle } = await this.requireOwnedVehicle(userId, vehicleId);
    if (!([VehicleStatus.DRAFT, VehicleStatus.REJECTED] as VehicleStatus[]).includes(vehicle.status as VehicleStatus)) {
      // core spec edits are allowed on approved vehicles for pricing/availability only
      const mutable = ['metadata'];
      const keys = Object.keys(patch);
      if (!keys.every((k) => mutable.includes(k))) {
        throw conflict(
          'VEHICLE_LOCKED',
          'Approved vehicles cannot change core details here; edit pricing/availability separately.',
        );
      }
    }
    const allowed = [
      'title', 'make', 'model', 'year', 'category', 'transmission', 'fuelType',
      'seats', 'doors', 'engineCapacityCc', 'drivetrain', 'bodyColour',
      'instantBookEnabled', 'selfDriveEnabled', 'chauffeurEnabled', 'ac',
      'description', 'licensePlate', 'metadata',
    ];
    const set: Record<string, any> = {};
    for (const [k, v] of Object.entries(patch)) {
      if (!allowed.includes(k)) continue;
      if (k === 'licensePlate' && typeof v === 'string') {
        // plates are sensitive: encrypt at service boundary
        const { encryptField } = await import('../../core/crypto');
        set.licensePlateEnc = encryptField(v);
      } else {
        set[k] = v;
      }
    }
    await this.db.update(vehicles).set(set).where(eq(vehicles.id, vehicleId));
    return this.getOwnerVehicle(userId, vehicleId);
  }

  async setFeatures(userId: string, vehicleId: string, codes: string[]) {
    const { vehicle } = await this.requireOwnedVehicle(userId, vehicleId);
    await this.db.transaction(async (tx) => {
      await tx.delete(vehicleFeatures).where(eq(vehicleFeatures.vehicleId, vehicle.id));
      if (codes.length) {
        await tx.insert(vehicleFeatures).values(codes.map((featureCode) => ({ vehicleId: vehicle.id, featureCode })));
      }
    });
    return { ok: true };
  }

  async addImage(
    userId: string,
    vehicleId: string,
    dto: { objectKey: string; altText?: string; isPrimary?: boolean; width?: number; height?: number },
  ) {
    const { vehicle } = await this.requireOwnedVehicle(userId, vehicleId);
    const position =
      (
        await this.db
          .select({ max: sql<number>`coalesce(max(${vehicleImages.position}),-1)` })
          .from(vehicleImages)
          .where(eq(vehicleImages.vehicleId, vehicle.id))
      )[0]!.max + 1;
    const row = (
      await this.db
        .insert(vehicleImages)
        .values({
          vehicleId: vehicle.id,
          objectKey: dto.objectKey,
          altText: dto.altText ?? null,
          isPrimary: dto.isPrimary ?? position === 0,
          width: dto.width ?? null,
          height: dto.height ?? null,
          position,
          status: 'VERIFIED',
        })
        .returning()
    )[0]!;
    return row;
  }

  async addDocument(
    userId: string,
    vehicleId: string,
    dto: {
      documentType: string;
      objectKey: string;
      fileName: string;
      contentType: string;
      issuedAt?: string;
      expiresAt?: string;
      insurerName?: string;
      coverType?: string;
      restrictionsNote?: string;
      mandatory?: boolean;
    },
  ) {
    const { vehicle } = await this.requireOwnedVehicle(userId, vehicleId);
    const { encryptField } = await import('../../core/crypto');
    const row = (
      await this.db
        .insert(vehicleDocuments)
        .values({
          vehicleId: vehicle.id,
          documentType: dto.documentType,
          objectKey: dto.objectKey,
          fileName: dto.fileName,
          contentType: dto.contentType,
          issuedAt: dto.issuedAt ? new Date(dto.issuedAt) : null,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
          insurerName: dto.insurerName ?? null,
          coverType: dto.coverType ?? null,
          restrictionsNote: dto.restrictionsNote ?? null,
          mandatory: dto.mandatory ?? true,
          status: 'PENDING',
          // policy number never collected via this path (insurer docs are private)
        })
        .returning()
    )[0]!;
    void encryptField;
    return row;
  }

  async upsertPricing(
    userId: string,
    vehicleId: string,
    dto: Record<string, any>,
  ) {
    const { vehicle } = await this.requireOwnedVehicle(userId, vehicleId);
    const existing = (
      await this.db.select().from(vehiclePricing).where(eq(vehiclePricing.vehicleId, vehicle.id)).limit(1)
    )[0];
    const values: any = { ...dto, vehicleId: vehicle.id };
    if (existing) {
      const { vehicleId: _v, id: _i, createdAt: _c, ...patch } = values;
      await this.db.update(vehiclePricing).set(patch).where(eq(vehiclePricing.vehicleId, vehicle.id));
    } else {
      await this.db.insert(vehiclePricing).values(values);
    }
    return this.getOwnerVehicle(userId, vehicleId);
  }

  async upsertLocation(
    userId: string,
    vehicleId: string,
    dto: {
      locationId?: string;
      locationName?: string;
      lat: number;
      lng: number;
      pickupInstruction?: string;
      deliveryEnabled?: boolean;
      defaultAirportFeeCents?: number;
      zones?: { name: string; feeCents: number; radiusKm?: number; isAirport?: boolean }[];
    },
  ) {
    const { vehicle } = await this.requireOwnedVehicle(userId, vehicleId);
    return this.db.transaction(async (tx) => {
      const existing = (
        await tx.select().from(vehicleLocations).where(eq(vehicleLocations.vehicleId, vehicle.id)).limit(1)
      )[0];
      let locationId = existing?.id;
      if (existing) {
        await tx
          .update(vehicleLocations)
          .set({
            locationId: dto.locationId ?? existing.locationId,
            locationName: dto.locationName ?? existing.locationName,
            lat: dto.lat,
            lng: dto.lng,
            pickupInstruction: dto.pickupInstruction ?? existing.pickupInstruction,
            deliveryEnabled: dto.deliveryEnabled ?? existing.deliveryEnabled,
            defaultAirportFeeCents:
              dto.defaultAirportFeeCents ?? existing.defaultAirportFeeCents,
          })
          .where(eq(vehicleLocations.id, existing.id));
      } else {
        locationId = (
          await tx
            .insert(vehicleLocations)
            .values({
              vehicleId: vehicle.id,
              locationId: dto.locationId ?? null,
              locationName: dto.locationName,
              lat: dto.lat,
              lng: dto.lng,
              pickupInstruction: dto.pickupInstruction,
              deliveryEnabled: dto.deliveryEnabled ?? false,
              defaultAirportFeeCents: dto.defaultAirportFeeCents ?? null,
            })
            .returning({ id: vehicleLocations.id })
        )[0]!.id;
        if (dto.zones?.length) {
          await tx.insert(deliveryZones).values(
            dto.zones.map((z) => ({
              vehicleLocationId: locationId!,
              hostProfileId: vehicle.hostProfileId,
              name: z.name,
              feeCents: z.feeCents,
              radiusKm: z.radiusKm ?? null,
              isAirport: z.isAirport ?? false,
            })),
          );
        }
      }
      return { id: locationId };
    });
  }

  async upsertExtra(
    userId: string,
    vehicleId: string,
    dto: { code: string; label: string; chargeType: any; unitCents: number; maxQuantity?: number; active?: boolean },
  ) {
    const { vehicle } = await this.requireOwnedVehicle(userId, vehicleId);
    const existing = (
      await this.db
        .select()
        .from(rentalExtras)
        .where(and(eq(rentalExtras.vehicleId, vehicle.id), eq(rentalExtras.code, dto.code)))
        .limit(1)
    )[0];
    if (existing) {
      await this.db.update(rentalExtras).set(dto).where(eq(rentalExtras.id, existing.id));
      return existing;
    }
    return (
      await this.db
        .insert(rentalExtras)
        .values({ vehicleId: vehicle.id, ...dto, maxQuantity: dto.maxQuantity ?? 1 })
        .returning()
    )[0];
  }

  async submit(userId: string, vehicleId: string) {
    const { vehicle, host } = await this.requireOwnedVehicle(userId, vehicleId);
    if (host.status !== HostStatus.VERIFIED) {
      throw forbidden('Your host account must be verified before vehicles can be reviewed.');
    }
    const docs = await this.db
      .select()
      .from(vehicleDocuments)
      .where(eq(vehicleDocuments.vehicleId, vehicle.id));
    if (docs.length === 0) {
      throw unprocessable('DOCUMENTS_REQUIRED', 'Upload registration and insurance documents first.');
    }
    const pricing = (
      await this.db.select().from(vehiclePricing).where(eq(vehiclePricing.vehicleId, vehicle.id)).limit(1)
    )[0];
    if (!pricing || pricing.dailyPriceCents <= 0) {
      throw unprocessable('PRICING_REQUIRED', 'Set a daily price before submitting.');
    }
    const location = (
      await this.db.select().from(vehicleLocations).where(eq(vehicleLocations.vehicleId, vehicle.id)).limit(1)
    )[0];
    if (!location) throw unprocessable('LOCATION_REQUIRED', 'Set where the car is collected.');
    await this.db
      .update(vehicles)
      .set({ status: VehicleStatus.PENDING_REVIEW, submittedAt: new Date() })
      .where(eq(vehicles.id, vehicle.id));
    await this.audit.record({
      actorId: userId,
      action: 'VEHICLE.SUBMIT',
      entityType: 'VEHICLE',
      entityId: vehicle.id,
      newValue: { status: VehicleStatus.PENDING_REVIEW },
    });
    return { id: vehicle.id, status: VehicleStatus.PENDING_REVIEW };
  }

  async pauseOrArchive(userId: string, vehicleId: string, action: 'pause' | 'archive' | 'resume') {
    const { vehicle } = await this.requireOwnedVehicle(userId, vehicleId);
    let status: VehicleStatus = vehicle.status as VehicleStatus;
    if (action === 'pause') status = VehicleStatus.SUSPENDED;
    if (action === 'archive') status = VehicleStatus.ARCHIVED;
    if (action === 'resume') status = VehicleStatus.APPROVED;
    await this.db.update(vehicles).set({ status }).where(eq(vehicles.id, vehicle.id));
    return { id: vehicle.id, status };
  }

  async adminDecide(
    adminId: string,
    vehicleId: string,
    decision: 'APPROVED' | 'REJECTED' | 'SUSPENDED',
    reason?: string,
  ) {
    const vehicle = (await this.db.select().from(vehicles).where(eq(vehicles.id, vehicleId)).limit(1))[0];
    if (!vehicle) throw notFound('Vehicle');
    await this.db.transaction(async (tx) => {
      await tx
        .update(vehicles)
        .set({
          status: decision,
          decidedAt: new Date(),
          decidedById: adminId,
          rejectionReason: decision === 'REJECTED' ? reason ?? null : null,
        })
        .where(eq(vehicles.id, vehicleId));
      if (decision === 'APPROVED') {
        await tx
          .update(vehicleDocuments)
          .set({ status: 'VERIFIED', reviewerId: adminId, reviewedAt: new Date(), reviewNote: reason })
          .where(eq(vehicleDocuments.vehicleId, vehicleId));
        await tx
          .update(vehicleImages)
          .set({ status: 'VERIFIED' })
          .where(eq(vehicleImages.vehicleId, vehicleId));
      }
    });
    await this.audit.record({
      actorId: adminId,
      actorRole: 'VERIFICATION',
      action: `VEHICLE.${decision}`,
      entityType: 'VEHICLE',
      entityId: vehicleId,
      prevValue: { status: vehicle.status },
      newValue: { status: decision },
      reason,
    });
    return { id: vehicleId, status: decision };
  }

  // ── Reads ─────────────────────────────────────────────────────────────────
  async listMine(userId: string, status?: string) {
    const host = await this.requireVerifiedOrPendingHost(userId);
    const rows = await this.db
      .select({
        id: vehicles.id,
        reference: vehicles.reference,
        slug: vehicles.slug,
        title: vehicles.title,
        make: vehicles.make,
        model: vehicles.model,
        year: vehicles.year,
        category: vehicles.category,
        status: vehicles.status,
        dailyPriceCents: vehiclePricing.dailyPriceCents,
        primaryImage: sql<string | null>`(select object_key from vehicle_images where vehicle_id = ${vehicles.id} order by position limit 1)`,
        createdAt: vehicles.createdAt,
      })
      .from(vehicles)
      .leftJoin(vehiclePricing, eq(vehiclePricing.vehicleId, vehicles.id))
      .where(
        and(
          eq(vehicles.hostProfileId, host.id),
          status ? eq(vehicles.status, status as any) : undefined,
        ),
      )
      .orderBy(desc(vehicles.createdAt));
    return rows;
  }

  async getOwnerVehicle(userId: string, vehicleId: string) {
    const { vehicle } = await this.requireOwnedVehicle(userId, vehicleId);
    const [images, docs, features, pricing, location, extras] = await Promise.all([
      this.db.select().from(vehicleImages).where(eq(vehicleImages.vehicleId, vehicle.id)),
      this.db.select().from(vehicleDocuments).where(eq(vehicleDocuments.vehicleId, vehicle.id)),
      this.db.select().from(vehicleFeatures).where(eq(vehicleFeatures.vehicleId, vehicle.id)),
      this.db.select().from(vehiclePricing).where(eq(vehiclePricing.vehicleId, vehicle.id)),
      this.db
        .select()
        .from(vehicleLocations)
        .where(eq(vehicleLocations.vehicleId, vehicle.id))
        .limit(1),
      this.db.select().from(rentalExtras).where(eq(rentalExtras.vehicleId, vehicle.id)),
    ]);
    const zones = location[0]
      ? await this.db.select().from(deliveryZones).where(eq(deliveryZones.vehicleLocationId, location[0].id))
      : [];
    return { vehicle, images, documents: docs.map(this.scrubDocument), features, pricing: pricing[0] ?? null, location: location[0] ?? null, zones, extras };
  }

  private scrubDocument = (d: any) => ({ ...d, policyNumberEnc: undefined, objectKey: undefined });

  async getPublicBySlug(slug: string) {
    const vehicle = (await this.db.select().from(vehicles).where(eq(vehicles.slug, slug)).limit(1))[0];
    if (!vehicle) throw notFound('Vehicle');
    if (vehicle.status !== VehicleStatus.APPROVED) throw notFound('Vehicle');
    return this.assemblePublicVehicle(vehicle.id);
  }

  async assemblePublicVehicle(vehicleId: string) {
    const [vehicle] = await this.db
      .select({
        vehicle: vehicles,
        host: {
          id: hostProfiles.id,
          brandName: hostProfiles.brandName,
          avatarObjectKey: hostProfiles.avatarObjectKey,
          status: hostProfiles.status,
          ratingAverage: hostProfiles.ratingAverage,
          ratingCount: hostProfiles.ratingCount,
        },
      })
      .from(vehicles)
      .innerJoin(hostProfiles, eq(hostProfiles.id, vehicles.hostProfileId))
      .where(eq(vehicles.id, vehicleId))
      .limit(1);
    if (!vehicle) throw notFound('Vehicle');
    const [images, featureRows, pricing, location, extras, policy] = await Promise.all([
      this.db
        .select()
        .from(vehicleImages)
        .where(and(eq(vehicleImages.vehicleId, vehicleId), eq(vehicleImages.status, 'VERIFIED')))
        .orderBy(vehicleImages.position),
      this.db
        .select({ code: featureCatalog.code, label: featureCatalog.label, icon: featureCatalog.icon })
        .from(vehicleFeatures)
        .innerJoin(featureCatalog, eq(featureCatalog.code, vehicleFeatures.featureCode))
        .where(eq(vehicleFeatures.vehicleId, vehicleId)),
      this.db.select().from(vehiclePricing).where(eq(vehiclePricing.vehicleId, vehicleId)).limit(1),
      this.db
        .select()
        .from(vehicleLocations)
        .where(eq(vehicleLocations.vehicleId, vehicleId))
        .limit(1),
      this.db
        .select()
        .from(rentalExtras)
        .where(and(eq(rentalExtras.vehicleId, vehicleId), eq(rentalExtras.active, true))),
      this.db.select().from(cancellationPolicies).limit(4),
    ]);
    const zones = location[0]
      ? await this.db.select().from(deliveryZones).where(
          and(eq(deliveryZones.vehicleLocationId, location[0].id), eq(deliveryZones.active, true)),
        )
      : [];
    const { licensePlateEnc, decidedById, rejectionReason, metadata: _m, ...publicVehicle } = vehicle.vehicle as any;
    void licensePlateEnc;
    return {
      ...publicVehicle,
      images,
      features: featureRows,
      pricing: pricing[0] ?? null,
      location: location[0] ?? null,
      zones,
      extras,
      host: vehicle.host,
      hostVerified: vehicle.host.status === HostStatus.VERIFIED,
      cancellationPolicies: policy,
    };
  }

  // ── Eligibility / availability (server-authoritative) ─────────────────────
  /** Vehicle ids that CONFLICT with the requested range (bookings/holds/blocks). */
  async conflictingVehicleIds(startsAt: Date, endsAt: Date, preparationBufferHours = 2): Promise<Set<string>> {
    const blocked = new Set<string>();

    // Confirmed / payment-pending bookings, with a preparation buffer.
    const occupied = await this.db
      .select({ vehicleId: bookings.vehicleId })
      .from(bookings)
      .where(
        and(
          inArray(bookings.status, [
            BookingStatus.PAYMENT_PENDING,
            BookingStatus.CONFIRMED,
            BookingStatus.PICKUP_PENDING,
            BookingStatus.ACTIVE,
            BookingStatus.RETURN_PENDING,
          ]),
          sql`${bookings.scheduledPickupAt} < (${endsAt}::timestamptz + make_interval(hours => ${preparationBufferHours}))`,
          sql`(${bookings.scheduledReturnAt} + make_interval(hours => ${preparationBufferHours})) > ${startsAt}::timestamptz`,
        ),
      );
    occupied.forEach((r) => blocked.add(r.vehicleId));

    // Active unexpired holds
    const holds = await this.db
      .select({ vehicleId: bookingHolds.vehicleId })
      .from(bookingHolds)
      .where(
        and(
          eq(bookingHolds.status, HoldStatus.ACTIVE),
          sql`${bookingHolds.expiresAt} > now()`,
          sql`${bookingHolds.startsAt} < ${endsAt}`,
          sql`${bookingHolds.endsAt} > ${startsAt}`,
        ),
      );
    holds.forEach((r) => blocked.add(r.vehicleId));

    // Manual blocks / maintenance
    const blocks = await this.db
      .select({ vehicleId: availabilityBlocks.vehicleId })
      .from(availabilityBlocks)
      .where(
        and(
          sql`${availabilityBlocks.startsAt} < ${endsAt}`,
          sql`${availabilityBlocks.endsAt} > ${startsAt}`,
        ),
      );
    blocks.forEach((r) => blocked.add(r.vehicleId));

    return blocked;
  }

  /** Vehicles with expired mandatory documents are not bookable. */
  async documentExpiredVehicleIds(now = new Date()): Promise<Set<string>> {
    const expiredDocs = await this.db
      .select({ vehicleId: vehicleDocuments.vehicleId })
      .from(vehicleDocuments)
      .where(
        and(
          eq(vehicleDocuments.mandatory, true),
          ne(vehicleDocuments.status, 'REJECTED'),
          sql`${vehicleDocuments.expiresAt} is not null and ${vehicleDocuments.expiresAt} < ${now}`,
        ),
      );
    return new Set(expiredDocs.map((d) => d.vehicleId));
  }

  /** Hard gate used by quotes/booking creation. */
  async assertBookable(vehicleId: string, startsAt: Date, endsAt: Date): Promise<void> {
    const vehicle = (await this.db.select().from(vehicles).where(eq(vehicles.id, vehicleId)).limit(1))[0];
    if (!vehicle) throw notFound('Vehicle');
    const host = (
      await this.db.select().from(hostProfiles).where(eq(hostProfiles.id, vehicle.hostProfileId)).limit(1)
    )[0];
    if (!host || host.status !== HostStatus.VERIFIED) {
      throw forbidden('This host is not currently accepting bookings.');
    }
    if (vehicle.status !== VehicleStatus.APPROVED) {
      throw notFound('Vehicle is not available for booking.');
    }
    const conflicts = await this.conflictingVehicleIds(startsAt, endsAt);
    if (conflicts.has(vehicleId)) {
      throw conflict('VEHICLE_NOT_AVAILABLE', 'This vehicle is no longer available for the selected dates.');
    }
    const expired = await this.documentExpiredVehicleIds();
    if (expired.has(vehicleId)) {
      throw conflict(
        'DOCUMENT_EXPIRED',
        'This vehicle is temporarily unavailable: a required document has expired.',
      );
    }
  }
}
