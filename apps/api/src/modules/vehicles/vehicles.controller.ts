import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { z } from 'zod';
import {
  DepositRule,
  FuelPolicy,
  MileagePolicyType,
  Permission,
  VehicleCategory,
} from '@hiregari/types';
import { CurrentUser, Public, RequirePermission, ZodBody } from '../../core/http/decorators';
import type { AuthUser } from '../../core/http/types';
import { VehiclesService } from './vehicles.service';

const createSchema = z.object({
  make: z.string().trim().min(1).max(60),
  model: z.string().trim().min(1).max(60),
  year: z.number().int().min(1990).max(2100),
  category: z.nativeEnum(VehicleCategory),
});

const updateSchema = z
  .object({
    title: z.string().max(140).optional(),
    make: z.string().max(60).optional(),
    model: z.string().max(60).optional(),
    year: z.number().int().min(1990).optional(),
    category: z.nativeEnum(VehicleCategory).optional(),
    transmission: z.enum(['AUTOMATIC', 'MANUAL']).optional(),
    fuelType: z.enum(['PETROL', 'DIESEL', 'HYBRID', 'ELECTRIC']).optional(),
    seats: z.number().int().min(2).max(60).optional(),
    doors: z.number().int().min(1).max(10).optional(),
    engineCapacityCc: z.number().int().min(50).max(10000).optional(),
    drivetrain: z.enum(['FWD', 'RWD', 'AWD', 'FOUR_WD']).optional(),
    bodyColour: z.string().max(40).optional(),
    instantBookEnabled: z.boolean().optional(),
    selfDriveEnabled: z.boolean().optional(),
    chauffeurEnabled: z.boolean().optional(),
    ac: z.boolean().optional(),
    description: z.string().max(8000).optional(),
    licensePlate: z.string().max(20).optional(),
    metadata: z.record(z.any()).optional(),
  })
  .strict();

const pricingSchema = z.object({
  dailyPriceCents: z.number().int().positive(),
  weeklyDiscountBps: z.number().int().min(0).max(9000).optional(),
  monthlyDiscountBps: z.number().int().min(0).max(9000).optional(),
  minimumRentalHours: z.number().int().min(1).optional(),
  minimumRentalDays: z.number().int().min(1).optional(),
  depositRule: z.nativeEnum(DepositRule).optional(),
  depositAmountCents: z.number().int().nonnegative().optional(),
  depositPercentBps: z.number().int().min(0).max(10000).optional(),
  depositDailyMultiplierBps: z.number().int().min(0).max(1000).optional(),
  mileagePolicyType: z.nativeEnum(MileagePolicyType).optional(),
  includedKmPerDay: z.number().int().nonnegative().optional().nullable(),
  includedKmTotal: z.number().int().nonnegative().optional().nullable(),
  excessPerKmCents: z.number().int().nonnegative().optional().nullable(),
  fuelPolicy: z.nativeEnum(FuelPolicy).optional(),
  lateGraceMinutes: z.number().int().min(0).optional(),
  lateHourlyFeeCents: z.number().int().nonnegative().optional(),
  cancellationPolicyId: z.string().uuid().optional().nullable(),
});

const locationSchema = z.object({
  locationId: z.string().uuid().optional(),
  locationName: z.string().optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  pickupInstruction: z.string().max(1000).optional(),
  deliveryEnabled: z.boolean().optional(),
  defaultAirportFeeCents: z.number().int().nonnegative().optional().nullable(),
  zones: z
    .array(
      z.object({
        name: z.string().min(1),
        feeCents: z.number().int().nonnegative(),
        radiusKm: z.number().positive().optional(),
        isAirport: z.boolean().optional(),
      }),
    )
    .optional(),
});

const imageSchema = z.object({
  objectKey: z.string().min(4),
  altText: z.string().max(140).optional(),
  isPrimary: z.boolean().optional(),
  width: z.number().int().optional(),
  height: z.number().int().optional(),
});

const docSchema = z.object({
  documentType: z.string().min(2),
  objectKey: z.string().min(4),
  fileName: z.string().min(1),
  contentType: z.string().min(3),
  issuedAt: z.string().datetime({ offset: true }).optional(),
  expiresAt: z.string().datetime({ offset: true }).optional(),
  insurerName: z.string().max(120).optional(),
  coverType: z.string().max(120).optional(),
  restrictionsNote: z.string().max(2000).optional(),
  mandatory: z.boolean().optional(),
});

@Controller('api/v1')
export class VehiclesController {
  constructor(private readonly vehicles: VehiclesService) {}

  // ── Host / owner ───────────────────────────────────────────────────────
  @Post('vehicles')
  @RequirePermission(Permission.VEHICLE_CREATE)
  create(@CurrentUser() user: AuthUser, @ZodBody(createSchema) body: any) {
    return this.vehicles.createDraft(user.id, body);
  }

  @Get('vehicles/mine')
  @RequirePermission(Permission.VEHICLE_READ_OWN)
  mine(@CurrentUser() user: AuthUser, @Query('status') status?: string) {
    return this.vehicles.listMine(user.id, status);
  }

  @Get('vehicles/:id/owner')
  @RequirePermission(Permission.VEHICLE_READ_OWN)
  ownerView(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.vehicles.getOwnerVehicle(user.id, id);
  }

  @Patch('vehicles/:id')
  @RequirePermission(Permission.VEHICLE_UPDATE_OWN)
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @ZodBody(updateSchema) body: any) {
    return this.vehicles.updateWizard(user.id, id, body);
  }

  @Put('vehicles/:id/features')
  @RequirePermission(Permission.VEHICLE_UPDATE_OWN)
  features(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @ZodBody(z.object({ codes: z.array(z.string()).max(100) })) body: any,
  ) {
    return this.vehicles.setFeatures(user.id, id, body.codes);
  }

  @Post('vehicles/:id/images')
  @RequirePermission(Permission.VEHICLE_UPDATE_OWN)
  image(@CurrentUser() user: AuthUser, @Param('id') id: string, @ZodBody(imageSchema) body: any) {
    return this.vehicles.addImage(user.id, id, body);
  }

  @Post('vehicles/:id/documents')
  @RequirePermission(Permission.VEHICLE_UPDATE_OWN)
  document(@CurrentUser() user: AuthUser, @Param('id') id: string, @ZodBody(docSchema) body: any) {
    return this.vehicles.addDocument(user.id, id, body);
  }

  @Put('vehicles/:id/pricing')
  @RequirePermission(Permission.PRICING_MANAGE_OWN)
  pricing(@CurrentUser() user: AuthUser, @Param('id') id: string, @ZodBody(pricingSchema) body: any) {
    return this.vehicles.upsertPricing(user.id, id, body);
  }

  @Put('vehicles/:id/location')
  @RequirePermission(Permission.VEHICLE_UPDATE_OWN)
  location(@CurrentUser() user: AuthUser, @Param('id') id: string, @ZodBody(locationSchema) body: any) {
    return this.vehicles.upsertLocation(user.id, id, body);
  }

  @Post('vehicles/:id/submit')
  @RequirePermission(Permission.VEHICLE_SUBMIT)
  submit(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.vehicles.submit(user.id, id);
  }

  @Post('vehicles/:id/pause')
  @RequirePermission(Permission.VEHICLE_UPDATE_OWN)
  pause(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.vehicles.pauseOrArchive(user.id, id, 'pause');
  }

  @Post('vehicles/:id/archive')
  @RequirePermission(Permission.VEHICLE_UPDATE_OWN)
  archive(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.vehicles.pauseOrArchive(user.id, id, 'archive');
  }

  @Post('vehicles/:id/resume')
  @RequirePermission(Permission.VEHICLE_UPDATE_OWN)
  resume(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.vehicles.pauseOrArchive(user.id, id, 'resume');
  }

  // ── Public ─────────────────────────────────────────────────────────────
  @Public()
  @Get('vehicles/:slug')
  bySlug(@Param('slug') slug: string) {
    return this.vehicles.getPublicBySlug(slug);
  }
}

