import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gte, ilike, inArray, lte, sql, desc, asc } from 'drizzle-orm';
import {
  HostStatus,
  SearchSort,
  VehicleStatus,
} from '@hiregari/types';
import { DB, type Db } from '../../db/db.module';
import {
  featureCatalog,
  vehicleFeatures,
  vehicleImages,
  vehicleLocations,
  vehiclePricing,
  vehicles,
} from '../../db/schema/catalogue';
import { hostProfiles } from '../../db/schema/hosts';
import { locations } from '../../db/schema/hosts';
import { pagination } from '../../core/pagination';
import { VehiclesService } from '../vehicles/vehicles.service';
import type { GeoPort } from '../../integrations/ports';
import { GEO } from '../../integrations/integrations.module';

@Injectable()
export class SearchService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly vehiclesService: VehiclesService,
    @Inject(GEO) private readonly geo: GeoPort,
  ) {}

  async search(q: any) {
    const start = new Date(q.pickupAt);
    const end = new Date(q.returnAt);
    if (end <= start) {
      return { data: [], page: q.page, pageSize: q.pageSize, total: 0, facets: null };
    }

    const conditions: any[] = [
      eq(vehicles.status, VehicleStatus.APPROVED),
      eq(hostProfiles.status, HostStatus.VERIFIED),
    ];
    if (q.category) conditions.push(eq(vehicles.category, q.category));
    if (q.make) conditions.push(ilike(vehicles.make, `%${q.make}%`));
    if (q.transmission) conditions.push(eq(vehicles.transmission, q.transmission));
    if (q.fuel) conditions.push(eq(vehicles.fuelType, q.fuel));
    if (q.seats) conditions.push(gte(vehicles.seats, q.seats));
    if (q.instantBook) conditions.push(eq(vehicles.instantBookEnabled, true));
    if (q.selfDrive) conditions.push(eq(vehicles.selfDriveEnabled, true));
    if (q.chauffeur) conditions.push(eq(vehicles.chauffeurEnabled, true));
    if (q.ac) conditions.push(eq(vehicles.ac, true));
    if (q.fourWheelDrive) conditions.push(inArray(vehicles.drivetrain, ['AWD', 'FOUR_WD']));
    if (q.minPriceCents) conditions.push(gte(vehiclePricing.dailyPriceCents, q.minPriceCents));
    if (q.maxPriceCents) conditions.push(lte(vehiclePricing.dailyPriceCents, q.maxPriceCents));

    let rows = await this.db
      .select({
        vehicle: vehicles,
        dailyPriceCents: vehiclePricing.dailyPriceCents,
        depositRule: vehiclePricing.depositRule,
        depositAmountCents: vehiclePricing.depositAmountCents,
        mileagePolicyType: vehiclePricing.mileagePolicyType,
        minimumRentalHours: vehiclePricing.minimumRentalHours,
        location: vehicleLocations,
        host: { id: hostProfiles.id, brandName: hostProfiles.brandName, ratingAverage: hostProfiles.ratingAverage, ratingCount: hostProfiles.ratingCount },
        primaryImage: sql<string | null>`(select object_key from vehicle_images vi where vi.vehicle_id = ${vehicles.id} order by position limit 1)`,
      })
      .from(vehicles)
      .innerJoin(hostProfiles, eq(hostProfiles.id, vehicles.hostProfileId))
      .innerJoin(vehiclePricing, eq(vehiclePricing.vehicleId, vehicles.id))
      .leftJoin(vehicleLocations, eq(vehicleLocations.vehicleId, vehicles.id))
      .where(and(...conditions));

    // Temporal availability (the hard gate): bookings, active holds, blocks,
    // buffers and expired documents.
    const [conflicts, expiredDocs] = await Promise.all([
      this.vehiclesService.conflictingVehicleIds(start, end),
      this.vehiclesService.documentExpiredVehicleIds(),
    ]);
    rows = rows.filter((r) => !conflicts.has(r.vehicle.id) && !expiredDocs.has(r.vehicle.id));

    // Minimum rental duration
    const durationHours = (end.getTime() - start.getTime()) / 3_600_000;
    rows = rows.filter((r) => durationHours + 1 / 60 >= (r.minimumRentalHours ?? 24));

    // Features (any/all of requested feature codes must match)
    if (q.features?.length) {
      const matching = await this.db
        .select({ vehicleId: vehicleFeatures.vehicleId, code: vehicleFeatures.featureCode })
        .from(vehicleFeatures)
        .where(inArray(vehicleFeatures.featureCode, q.features));
      const byVehicle = new Map<string, Set<string>>();
      for (const m of matching) {
        const set = byVehicle.get(m.vehicleId) ?? new Set<string>();
        set.add(m.code);
        byVehicle.set(m.vehicleId, set);
      }
      rows = rows.filter((r) => q.features!.every((f: string) => byVehicle.get(r.vehicle.id)?.has(f)));
    }

    // Location filters
    if (q.location || q.lat != null) {
      let target: { lat: number; lng: number; label: string } | null = null;
      if (q.lat != null && q.lng != null) {
        target = { lat: q.lat, lng: q.lng, label: q.location ?? '' };
      } else if (q.location) {
        const place = await this.geo.geocode(q.location);
        if (!place) {
          const dbPlace = await this.db
            .select()
            .from(locations)
            .where(sql`${locations.slug} = ${q.location!.toLowerCase()} or ${locations.name} ilike ${`%${q.location}%`}`)
            .limit(1);
          if (dbPlace[0]) target = { lat: dbPlace[0].lat, lng: dbPlace[0].lng, label: dbPlace[0].name };
        } else target = place;
      }
      rows = rows.filter((r) => {
        if (!r.location) return false;
        if (q.location) {
          const hay = `${r.location.locationName ?? ''}`.toLowerCase();
          if (hay.includes(q.location.toLowerCase())) return true;
        }
        if (target) {
          const distance = this.geo.distanceKm(target, { lat: r.location.lat, lng: r.location.lng });
          return distance <= q.radiusKm;
        }
        return false;
      });
    }

    if (q.delivery) rows = rows.filter((r) => r.location?.deliveryEnabled);

    // Sorting
    switch (q.sort) {
      case SearchSort.PRICE_ASC:
        rows.sort((a, b) => a.dailyPriceCents! - b.dailyPriceCents!);
        break;
      case SearchSort.PRICE_DESC:
        rows.sort((a, b) => b.dailyPriceCents! - a.dailyPriceCents!);
        break;
      case SearchSort.RATING:
        rows.sort((a, b) => b.vehicle.ratingAverage - a.vehicle.ratingAverage);
        break;
      case SearchSort.NEWEST:
        rows.sort((a, b) => b.vehicle.createdAt.getTime() - a.vehicle.createdAt.getTime());
        break;
      default:
        // Recommended: verified host weight, instant book, rating, price
        rows.sort((a, b) => {
          const score = (r: typeof a) =>
            r.vehicle.ratingAverage * 100 + (r.vehicle.instantBookEnabled ? 20 : 0) -
            r.dailyPriceCents! / 100000;
          return score(b) - score(a);
        });
    }

    const total = rows.length;
    const { limit, offset } = pagination(q.page, q.pageSize);
    const paged = rows.slice(offset, offset + limit);

    let facets: any = null;
    if (q.facets) {
      const prices = rows.map((r) => r.dailyPriceCents ?? 0);
      facets = {
        price: { minCents: prices.length ? Math.min(...prices) : 0, maxCents: prices.length ? Math.max(...prices) : 0 },
        categories: this.countBy(rows, (r) => r.vehicle.category),
        makes: this.countBy(rows, (r) => r.vehicle.make),
        transmissions: this.countBy(rows, (r) => r.vehicle.transmission ?? 'UNKNOWN'),
        fuels: this.countBy(rows, (r) => r.vehicle.fuelType ?? 'UNKNOWN'),
      };
    }

    return {
      data: paged.map((r) => ({
        id: r.vehicle.id,
        reference: r.vehicle.reference,
        slug: r.vehicle.slug,
        title: r.vehicle.title ?? `${r.vehicle.year} ${r.vehicle.make} ${r.vehicle.model}`,
        make: r.vehicle.make,
        model: r.vehicle.model,
        year: r.vehicle.year,
        category: r.vehicle.category,
        transmission: r.vehicle.transmission,
        fuelType: r.vehicle.fuelType,
        seats: r.vehicle.seats,
        ac: r.vehicle.ac,
        instantBookEnabled: r.vehicle.instantBookEnabled,
        ratingAverage: r.vehicle.ratingAverage,
        ratingCount: r.vehicle.ratingCount,
        dailyPriceCents: r.dailyPriceCents,
        mileagePolicyType: r.mileagePolicyType,
        locationName: r.location?.locationName,
        deliveryEnabled: r.location?.deliveryEnabled,
        primaryImage: r.primaryImage,
        host: r.host,
      })),
      page: q.page,
      pageSize: q.pageSize,
      total,
      facets,
    };
  }

  private countBy<T>(rows: T[], pick: (r: T) => string): Record<string, number> {
    return rows.reduce<Record<string, number>>((acc, r) => {
      const k = pick(r);
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    }, {});
  }
}

void featureCatalog;
void asc;
void desc;
