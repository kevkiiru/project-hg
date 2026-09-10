/**
 * DEMO SEED — Nairobi marketplace data for local development / demos only.
 *
 * Refuses to run against NODE_ENV=production. All rows are flagged isDemo and
 * every identity is clearly synthetic. Re-runnable: existing demo identities
 * (matched on phone/email) are replaced.
 */
import { eq, inArray, or, sql } from 'drizzle-orm';
import {
  FuelType,
  KycIdType,
  Transmission,
  UserStatus,
  VehicleCategory,
  VehicleStatus,
  HostStatus,
  VerificationStatus,
  RoleName,
  ScopeType,
  LocationKind,
  Drivetrain,
  ExtraChargeType,
  vehicleReference,
} from '@hiregari/types';
import { getPool, closeDb } from './client';
import { db } from './db.module';
import {
  users,
  roleAssignments,
  customerProfiles,
  driverVerifications,
} from './schema/identity';
import { hostProfiles, businesses, locations } from './schema/hosts';
import {
  bookings,
  bookingHolds,
  quotes,
} from './schema/commerce';
import {
  payments,
  refunds,
  payouts,
  payoutBookings,
  ledgerEntries,
} from './schema/money';
import {
  vehicles,
  vehicleImages,
  vehicleFeatures,
  vehiclePricing,
  vehicleLocations,
  rentalExtras,
  featureCatalog,
  deliveryZones,
} from './schema/catalogue';
import { hashPassword } from '../core/crypto';
import { config } from '../core/config/config';

const RENTER_PHONE = '+254700000001';
const HOST_PHONE = '+254711000001';
const ADMIN_EMAIL = 'admin@hiregari.dev';

const NAIROBI_AREAS: Array<[string, string, number, number]> = [
  ['Westlands', 'westlands', -1.2683, 36.8116],
  ['Kilimani', 'kilimani', -1.2906, 36.7833],
  ['Karen', 'karen', -1.3139, 36.7062],
  ['Lavington', 'lavington', -1.2858, 36.7639],
  ['Nairobi CBD', 'nairobi-cbd', -1.2864, 36.8172],
  ['Jomo Kenyatta International Airport', 'jkia', -1.3192, 36.9278],
  ['Wilson Airport', 'wilson-airport', -1.3223, 36.8144],
  ['Kilileshwa', 'kileleshwa', -1.2776, 36.7792],
];

const CARS: Array<{
  make: string;
  model: string;
  year: number;
  category: VehicleCategory;
  dailyCents: number;
  seats: number;
  transmission: Transmission;
  fuel: FuelType;
  drivetrain: Drivetrain;
  area: string;
  features: string[];
  instant: boolean;
  description: string;
}> = [
  { make: 'Toyota', model: 'Vitz', year: 2017, category: VehicleCategory.ECONOMY, dailyCents: 650_000, seats: 4, transmission: Transmission.AUTOMATIC, fuel: FuelType.PETROL, drivetrain: Drivetrain.FWD, area: 'westlands', instant: true, features: ['AC', 'BLUETOOTH', 'POWER_STEERING', 'AIRBAGS', 'USB_CHARGING'], description: 'Zippy, fuel-sippy city hatchback. Perfect for CBD and Westlands errands.' },
  { make: 'Mazda', model: 'Demio', year: 2018, category: VehicleCategory.ECONOMY, dailyCents: 680_000, seats: 5, transmission: Transmission.AUTOMATIC, fuel: FuelType.PETROL, drivetrain: Drivetrain.FWD, area: 'kilimani', instant: true, features: ['AC', 'BLUETOOTH', 'AIRBAGS', 'REVERSE_CAMERA', 'POWER_STEERING'], description: 'Reliable compact hatch with a light footprint on fuel.' },
  { make: 'Toyota', model: 'Axio', year: 2019, category: VehicleCategory.SEDAN, dailyCents: 850_000, seats: 5, transmission: Transmission.AUTOMATIC, fuel: FuelType.HYBRID, drivetrain: Drivetrain.FWD, area: 'kileleshwa', instant: false, features: ['AC', 'BLUETOOTH', 'AIRBAGS', 'CRUISE_CONTROL', 'USB_CHARGING', 'REVERSE_CAMERA'], description: 'Comfortable hybrid sedan for business trips around Nairobi.' },
  { make: 'Toyota', model: 'Fielder', year: 2019, category: VehicleCategory.SEDAN, dailyCents: 900_000, seats: 5, transmission: Transmission.AUTOMATIC, fuel: FuelType.HYBRID, drivetrain: Drivetrain.FWD, area: 'nairobi-cbd', instant: true, features: ['AC', 'AIRBAGS', 'BLUETOOTH', 'LARGE_BOOT', 'POWER_STEERING'], description: 'Spacious station wagon — big boot for luggage and airport runs.' },
  { make: 'Toyota', model: 'RAV4', year: 2020, category: VehicleCategory.SUV, dailyCents: 1_250_000, seats: 5, transmission: Transmission.AUTOMATIC, fuel: FuelType.PETROL, drivetrain: Drivetrain.AWD, area: 'lavington', instant: false, features: ['AC', 'AWD', 'AIRBAGS', 'REVERSE_CAMERA', 'ROOF_RACK', 'BLUETOOTH'], description: 'Compact SUV ready for rough roads and weekend getaways.' },
  { make: 'Mazda', model: 'CX-5', year: 2021, category: VehicleCategory.SUV, dailyCents: 1_350_000, seats: 5, transmission: Transmission.AUTOMATIC, fuel: FuelType.DIESEL, drivetrain: Drivetrain.AWD, area: 'karen', instant: true, features: ['AC', 'AWD', 'LEATHER_SEATS', 'REVERSE_CAMERA', 'CRUISE_CONTROL', 'AIRBAGS'], description: 'Premium SUV with premium cabin — great for Karen and safari day trips.' },
  { make: 'Toyota', model: 'Prado', year: 2020, category: VehicleCategory.FOUR_X_FOUR, dailyCents: 2_400_000, seats: 7, transmission: Transmission.AUTOMATIC, fuel: FuelType.DIESEL, drivetrain: Drivetrain.FOUR_WD, area: 'karen', instant: false, features: ['AC', 'FOUR_WD', '7_SEATER', 'LEATHER_SEATS', 'ROOF_RACK', 'REVERSE_CAMERA', 'AIRBAGS'], description: 'Seven-seater 4x4 for serious terrain and family safaris.' },
  { make: 'Nissan', model: 'X-Trail', year: 2019, category: VehicleCategory.SUV, dailyCents: 1_150_000, seats: 7, transmission: Transmission.AUTOMATIC, fuel: FuelType.PETROL, drivetrain: Drivetrain.AWD, area: 'wilson-airport', instant: true, features: ['AC', 'AWD', '7_SEATER', 'AIRBAGS', 'BLUETOOTH', 'USB_CHARGING'], description: 'Versatile seven-seater SUV, handy for group airport pickups.' },
];

const FEATURE_LABELS: Record<string, string> = {
  AC: 'Air conditioning', BLUETOOTH: 'Bluetooth audio', POWER_STEERING: 'Power steering',
  AIRBAGS: 'Airbags', USB_CHARGING: 'USB charging', REVERSE_CAMERA: 'Reverse camera',
  CRUISE_CONTROL: 'Cruise control', AWD: 'All-wheel drive', FOUR_WD: '4x4',
  LEATHER_SEATS: 'Leather seats', ROOF_RACK: 'Roof rack', LARGE_BOOT: 'Large boot',
  '7_SEATER': '7 seats',
};

function slugify(make: string, model: string, year: number) {
  return `${make}-${model}-${year}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function main() {
  if (config().NODE_ENV === 'production') {
    throw new Error('Refusing to seed a production database.');
  }
  console.log('Seeding demo data…');

  // Idempotent reset of previous demo identities. Several financial tables
  // intentionally use RESTRICT FKs (bookings→host_profiles, payments,
  // payouts, refunds, quotes), so transactional data created during a prior
  // demo/seed run is removed explicitly before identity cascades fire.
  const oldUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`${users.phoneE164} in (${RENTER_PHONE}, ${HOST_PHONE}) or ${users.email} = ${ADMIN_EMAIL}`);
  if (oldUsers.length) {
    const userIds = oldUsers.map((u) => u.id);
    await db.transaction(async (tx) => {
      // Dev-only demo reset: suspend the append-only ledger guard for this
      // transaction (re-enabled below) while keeping all cascade hooks. This
      // file refuses production above, so immutable financial history can only
      // be reset in local/demo databases.
      // Append-only guard triggers (financial/audit immutability). Every table
      // with trg_immutable must be suspended for the demo reset, since some are
      // reached via ON DELETE CASCADE from bookings/vehicles.
      const appendOnlyTables = [
        'ledger_entries',
        'booking_price_snapshots',
        'booking_price_items',
        'booking_status_history',
        'inspection_photos',
        'audit_logs',
      ] as const;
      for (const t of appendOnlyTables) {
        await tx.execute(sql`alter table ${sql.identifier(t)} disable trigger trg_immutable`);
      }
      // Union in demo-flagged hosts/vehicles too, so orphaned rows left behind
      // by earlier interrupted runs are also swept.
      const hostRows = await tx.execute<{ id: string }>(sql`
        select hp.id from ${hostProfiles} hp
        where hp.is_demo = true
           or hp.user_id = any(array[${sql.join(userIds.map((id) => sql`${id}`), sql`, `)}]::uuid[])
           or hp.id in (select distinct host_profile_id from ${vehicles} where is_demo = true)`);
      const hostIds = hostRows.rows.map((r) => r.id);
      const vehicleRows = await tx
        .select({ id: vehicles.id })
        .from(vehicles)
        .where(or(eq(vehicles.isDemo, true), hostIds.length ? inArray(vehicles.hostProfileId, hostIds) : sql`false`));
      const vehicleIds = vehicleRows.map((r) => r.id);
      const bookingRows = await tx
        .select({ id: bookings.id })
        .from(bookings)
        .where(
          or(
            eq(bookings.isDemo, true),
            inArray(bookings.customerId, userIds),
            hostIds.length ? inArray(bookings.hostProfileId, hostIds) : sql`false`,
          ),
        );
      const bookingIds = bookingRows.map((r) => r.id);
      const payoutRows = hostIds.length
        ? await tx.select({ id: payouts.id }).from(payouts).where(inArray(payouts.hostProfileId, hostIds))
        : [];
      const payoutIds = payoutRows.map((r) => r.id);

      if (payoutIds.length) {
        await tx.delete(ledgerEntries).where(
          or(
            bookingIds.length ? inArray(ledgerEntries.bookingId, bookingIds) : sql`false`,
            inArray(ledgerEntries.payoutId, payoutIds),
          ),
        );
      } else if (bookingIds.length) {
        await tx.delete(ledgerEntries).where(inArray(ledgerEntries.bookingId, bookingIds));
      }
      if (bookingIds.length) {
        await tx.delete(refunds).where(inArray(refunds.bookingId, bookingIds));
        await tx.delete(payments).where(inArray(payments.bookingId, bookingIds));
        await tx.delete(payoutBookings).where(
          or(
            inArray(payoutBookings.bookingId, bookingIds),
            payoutIds.length ? inArray(payoutBookings.payoutId, payoutIds) : sql`false`,
          ),
        );
      }
      if (payoutIds.length) {
        await tx.delete(payouts).where(inArray(payouts.id, payoutIds));
      }
      if (bookingIds.length) {
        await tx.delete(bookings).where(inArray(bookings.id, bookingIds));
      }
      if (vehicleIds.length) {
        await tx.delete(bookingHolds).where(inArray(bookingHolds.vehicleId, vehicleIds));
        await tx.delete(deliveryZones).where(inArray(deliveryZones.hostProfileId, hostIds));
        await tx.delete(quotes).where(inArray(quotes.vehicleId, vehicleIds));
        await tx.delete(vehicles).where(inArray(vehicles.id, vehicleIds));
      }
      // Orphaned demo host profiles (no matching user left) are removed too;
      // businesses cascade from host_profiles.
      if (hostIds.length) {
        await tx.delete(hostProfiles).where(inArray(hostProfiles.id, hostIds));
      }
      for (const u of oldUsers) {
        await tx.delete(roleAssignments).where(eq(roleAssignments.userId, u.id));
        await tx.delete(users).where(eq(users.id, u.id));
      }
      for (const t of appendOnlyTables) {
        await tx.execute(sql`alter table ${sql.identifier(t)} enable trigger trg_immutable`);
      }
    });
  }

  // ── Admin ──────────────────────────────────────────────────────────────
  const admin = (
    await db
      .insert(users)
      .values({
        email: ADMIN_EMAIL,
        emailNormalized: ADMIN_EMAIL,
        phoneE164: '+254700000099',
        passwordHash: hashPassword('Admin123!'),
        firstName: 'Ada',
        lastName: 'Admin',
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        phoneVerifiedAt: new Date(),
        isDemo: true,
      })
      .returning()
  )[0]!;
  await db.insert(roleAssignments).values({
    userId: admin.id,
    role: RoleName.SUPER_ADMIN,
    scopeType: ScopeType.GLOBAL,
  });

  // ── Host ───────────────────────────────────────────────────────────────
  const hostUser = (
    await db
      .insert(users)
      .values({
        phoneE164: HOST_PHONE,
        email: 'host@hiregari.dev',
        emailNormalized: 'host@hiregari.dev',
        passwordHash: hashPassword('Host123!'),
        firstName: 'Jabali',
        lastName: 'Mwangi',
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        phoneVerifiedAt: new Date(),
        isDemo: true,
      })
      .returning()
  )[0]!;
  await db.insert(roleAssignments).values({
    userId: hostUser.id,
    role: RoleName.HOST,
    scopeType: ScopeType.GLOBAL,
  });
  const host = (
    await db
      .insert(hostProfiles)
      .values({
        userId: hostUser.id,
        type: 'BUSINESS',
        status: HostStatus.VERIFIED,
        brandName: 'Jabali Auto Rentals',
        bio: 'Demonstration host fleet across Nairobi. Not a real rental company.',
        submittedAt: new Date(),
        decidedAt: new Date(),
        decidedById: admin.id,
        payoutReadyAt: new Date(),
        isDemo: true,
      })
      .returning()
  )[0]!;
  await db.insert(businesses).values({
    hostProfileId: host.id,
    name: 'Jabali Auto Rentals Ltd',
    registrationNumber: 'DEMO-PVT-0001',
    phone: HOST_PHONE,
    email: 'host@hiregari.dev',
    verificationStatus: VerificationStatus.VERIFIED,
    decidedAt: new Date(),
    decidedById: admin.id,
  });

  // ── Renter (driver-verified) ───────────────────────────────────────────
  const renter = (
    await db
      .insert(users)
      .values({
        phoneE164: RENTER_PHONE,
        email: 'renter@hiregari.dev',
        emailNormalized: 'renter@hiregari.dev',
        passwordHash: hashPassword('Renter123!'),
        firstName: 'Zawadi',
        lastName: 'Achieng',
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        phoneVerifiedAt: new Date(),
        isDemo: true,
      })
      .returning()
  )[0]!;
  await db.insert(roleAssignments).values({
    userId: renter.id,
    role: RoleName.CUSTOMER,
    scopeType: ScopeType.GLOBAL,
  });
  const customer = (
    await db
      .insert(customerProfiles)
      .values({
        userId: renter.id,
        legalFirstName: 'Zawadi',
        legalLastName: 'Achieng',
        nationality: 'KE',
        countryOfResidence: 'KE',
        verificationStatus: VerificationStatus.VERIFIED,
        verifiedAt: new Date(),
      })
      .returning()
  )[0]!;
  await db.insert(driverVerifications).values({
    customerProfileId: customer.id,
    status: VerificationStatus.VERIFIED,
    legalFirstName: 'Zawadi',
    legalLastName: 'Achieng',
    idType: KycIdType.KENYAN_ID,
    licenceCountry: 'KE',
    licenceIssuedAt: new Date('2022-01-15T00:00:00Z'),
    licenceExpiresAt: new Date('2028-01-15T00:00:00Z'),
    effectiveExpiryAt: new Date('2028-01-15T00:00:00Z'),
    submittedAt: new Date(),
    reviewerId: admin.id,
    reviewedAt: new Date(),
  });

  // ── Locations ──────────────────────────────────────────────────────────
  for (const [name, slug, lat, lng] of NAIROBI_AREAS) {
    const isAirport = slug === 'jkia' || slug === 'wilson-airport';
    await db
      .insert(locations)
      .values({
        kind: isAirport ? LocationKind.AIRPORT : LocationKind.NEIGHBOURHOOD,
        county: 'Nairobi',
        city: 'Nairobi',
        neighbourhood: name,
        name,
        slug,
        lat,
        lng,
        suggested: true,
        sortOrder: 0,
      })
      .onConflictDoNothing();
  }
  const areaRows = await db.select().from(locations);
  const locBySlug = new Map(areaRows.map((l) => [l.slug, l]));

  // ── Feature catalogue ──────────────────────────────────────────────────
  for (const [code, label] of Object.entries(FEATURE_LABELS)) {
    await db
      .insert(featureCatalog)
      .values({ code, label, category: 'COMFORT', active: true })
      .onConflictDoNothing();
  }

  // ── Vehicles ───────────────────────────────────────────────────────────
  for (const car of CARS) {
    const slug = `${slugify(car.make, car.model, car.year)}-demo`;
    const loc = locBySlug.get(car.area)!;
    const vehicle = (
      await db
        .insert(vehicles)
        .values({
          hostProfileId: host.id,
          reference: vehicleReference(),
          slug,
          status: VehicleStatus.APPROVED,
          title: `${car.year} ${car.make} ${car.model}`,
          make: car.make,
          model: car.model,
          year: car.year,
          category: car.category,
          transmission: car.transmission,
          fuelType: car.fuel,
          seats: car.seats,
          doors: 4,
          drivetrain: car.drivetrain,
          bodyColour: 'Silver',
          instantBookEnabled: car.instant,
          selfDriveEnabled: true,
          ac: true,
          description: `${car.description} [DEMO DATA — not a real vehicle]`,
          submittedAt: new Date(),
          decidedAt: new Date(),
          decidedById: admin.id,
          isDemo: true,
        })
        .returning()
    )[0]!;

    await db.insert(vehiclePricing).values({
      vehicleId: vehicle.id,
      currency: 'KES',
      dailyPriceCents: car.dailyCents,
      weeklyDiscountBps: 500,
      monthlyDiscountBps: 1000,
      minimumRentalHours: 24,
      minimumRentalDays: 1,
      depositRule: 'FIXED',
      depositAmountCents: 2_000_000,
      mileagePolicyType: 'PER_BOOKING',
      includedKmTotal: 1050,
      excessPerKmCents: 2500,
      fuelPolicy: 'SAME_TO_SAME',
      lateGraceMinutes: 60,
      lateHourlyFeeCents: Math.round(car.dailyCents / 12),
    });
    await db.insert(vehicleLocations).values({
      vehicleId: vehicle.id,
      locationId: loc.id,
      locationName: loc.name,
      pickupInstruction: `Meet at ${loc.name}. Exact pin shared after booking. [DEMO]`,
      lat: loc.lat,
      lng: loc.lng,
      deliveryEnabled: true,
      defaultAirportFeeCents: 150_000,
    });
    await db.insert(vehicleFeatures).values(
      car.features.map((code) => ({ vehicleId: vehicle.id, featureCode: code })),
    );
    // Placeholder demo image keys (UI falls back to a branded placeholder if absent).
    await db.insert(vehicleImages).values([
      {
        vehicleId: vehicle.id,
        objectKey: `demo/${slug}-1.jpg`,
        isPrimary: true,
        position: 0,
        altText: `${car.year} ${car.make} ${car.model} exterior`,
        status: 'VERIFIED',
      },
      {
        vehicleId: vehicle.id,
        objectKey: `demo/${slug}-2.jpg`,
        isPrimary: false,
        position: 1,
        altText: `${car.make} ${car.model} interior`,
        status: 'VERIFIED',
      },
    ]);
    await db.insert(rentalExtras).values([
      { vehicleId: vehicle.id, code: 'CHILD_SEAT', label: 'Child/booster seat', chargeType: ExtraChargeType.ONE_OFF, unitCents: 80_000, maxQuantity: 2, active: true },
      { vehicleId: vehicle.id, code: 'GPS_UNIT', label: 'GPS unit', chargeType: ExtraChargeType.DAILY, unitCents: 50_000, maxQuantity: 1, active: true },
      { vehicleId: vehicle.id, code: 'AIRPORT_DELIVERY', label: 'Airport delivery (JKIA/Wilson)', chargeType: ExtraChargeType.ONE_OFF, unitCents: 150_000, maxQuantity: 1, active: true },
    ]);
  }

  console.log(`Seed complete: ${CARS.length} demo vehicles across ${NAIROBI_AREAS.length} locations.`);
  console.log('Sign in — admin:', ADMIN_EMAIL, '/ Admin123!');
  console.log('Sign in — host:', HOST_PHONE, '/ Host123!');
  console.log('Sign in — renter:', RENTER_PHONE, '/ Renter123!');
  await closeDb();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
