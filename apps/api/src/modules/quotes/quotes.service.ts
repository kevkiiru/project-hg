import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gte, lte } from 'drizzle-orm';
import {
  DepositRule,
  ExtraChargeType,
  QuoteStatus,
  quoteReference,
  PriceItemKind,
} from '@hiregari/types';
import { DB, type Db } from '../../db/db.module';
import { quotes, quoteItems, promoCodes, promoRedemptions, bookings } from '../../db/schema/commerce';
import {
  deliveryZones,
  rentalExtras,
  vehiclePricing,
  vehicles,
  vehicleLocations,
} from '../../db/schema/catalogue';
import { config } from '../../core/config/config';
import { gone, notFound, unprocessable } from '../../core/http/errors';
import { computeQuote, type ExtraInput, type QuoteComputation } from '../../domain/pricing';
import { VehiclesService } from '../vehicles/vehicles.service';
import { sha256 } from '../../core/crypto';

export interface CreateQuoteDto {
  vehicleId: string;
  pickupAt: string;
  returnAt: string;
  timezone?: string;
  pickupOption: any;
  deliveryZoneId?: string;
  extras: { code: string; quantity: number }[];
  promoCode?: string;
}

@Injectable()
export class QuotesService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly vehiclesService: VehiclesService,
  ) {}

  private async loadPricingContext(vehicleId: string) {
    const vehicle = (await this.db.select().from(vehicles).where(eq(vehicles.id, vehicleId)).limit(1))[0];
    if (!vehicle) throw notFound('Vehicle');
    const pricing = (
      await this.db.select().from(vehiclePricing).where(eq(vehiclePricing.vehicleId, vehicleId)).limit(1)
    )[0];
    if (!pricing) throw unprocessable('NO_PRICING', 'This vehicle has no pricing configured.');
    const extras = await this.db.select().from(rentalExtras).where(
      and(eq(rentalExtras.vehicleId, vehicleId), eq(rentalExtras.active, true)),
    );
    return { vehicle, pricing, extras };
  }

  async create(userId: string, dto: CreateQuoteDto) {
    const pickupAt = new Date(dto.pickupAt);
    const returnAt = new Date(dto.returnAt);
    if (returnAt <= pickupAt) throw unprocessable('INVALID_DATES', 'Return must be after pickup.');
    if (pickupAt <= new Date()) throw unprocessable('PICKUP_IN_PAST', 'Pickup must be in the future.');

    // Eligibility gate (approved vehicle/host/docs, no conflicts)
    await this.vehiclesService.assertBookable(dto.vehicleId, pickupAt, returnAt);
    const { vehicle, pricing, extras } = await this.loadPricingContext(dto.vehicleId);

    // Delivery fee
    let deliveryFeeCents = 0;
    let deliveryZoneId: string | null = null;
    if (dto.pickupOption && dto.pickupOption !== 'AT_LOCATION') {
      if (dto.deliveryZoneId) {
        const zone = (
          await this.db
            .select()
            .from(deliveryZones)
            .where(eq(deliveryZones.id, dto.deliveryZoneId))
            .limit(1)
        )[0];
        if (!zone) throw unprocessable('BAD_ZONE', 'That delivery option is unavailable.');
        deliveryFeeCents = zone.feeCents;
        deliveryZoneId = zone.id;
      } else {
        const loc = (
          await this.db
            .select()
            .from(vehicleLocations)
            .where(eq(vehicleLocations.vehicleId, vehicle.id))
            .limit(1)
        )[0];
        deliveryFeeCents = loc?.defaultAirportFeeCents ?? 0;
      }
    }

    const selectedExtras: ExtraInput[] = [];
    for (const sel of dto.extras ?? []) {
      const e = extras.find((x) => x.code === sel.code);
      if (!e) continue;
      const qty = Math.min(sel.quantity, e.maxQuantity);
      selectedExtras.push({
        code: e.code,
        label: e.label,
        chargeType: e.chargeType as ExtraChargeType,
        unitCents: e.unitCents,
        quantity: qty,
      });
    }

    // Promo validation
    let promo: any = null;
    let promoCodeId: string | null = null;
    if (dto.promoCode) {
      promo = (
        await this.db
          .select()
          .from(promoCodes)
          .where(eq(promoCodes.code, dto.promoCode.trim().toUpperCase()))
          .limit(1)
      )[0];
      if (!promo || !promo.active) throw unprocessable('PROMO_INVALID', 'That promo code is not valid.');
      const now = new Date();
      if (promo.startsAt && promo.startsAt > now) throw unprocessable('PROMO_INVALID', 'That promo code is not active yet.');
      if (promo.endsAt && promo.endsAt < now) throw unprocessable('PROMO_INVALID', 'That promo code has expired.');
      if (promo.perUserOnce) {
        const used = await this.db
          .select({ id: promoRedemptions.id })
          .from(promoRedemptions)
          .where(and(eq(promoRedemptions.promoId, promo.id), eq(promoRedemptions.userId, userId)));
        if (used.length) throw unprocessable('PROMO_USED', 'You have already used this promo code.');
      }
      promoCodeId = promo.id;
    }

    const computation: QuoteComputation = computeQuote({
      dailyPriceCents: pricing.dailyPriceCents,
      weeklyDiscountBps: pricing.weeklyDiscountBps,
      monthlyDiscountBps: pricing.monthlyDiscountBps,
      minimumRentalHours: pricing.minimumRentalHours,
      minimumRentalDays: pricing.minimumRentalDays,
      pickupAt,
      returnAt,
      extras: selectedExtras,
      deliveryFeeCents,
      promo: promo
        ? {
            kind: promo.kind,
            percentBps: promo.percentBps,
            amountCents: promo.amountCents,
            maxDiscountCents: promo.maxDiscountCents,
            minBookingCents: promo.minBookingCents,
          }
        : null,
      commissionBps: config().COMMISSION_BPS,
      renterServiceFeeBps: config().RENTER_SERVICE_FEE_BPS,
      taxBps: config().TAX_BPS,
      depositRule: pricing.depositRule as DepositRule,
      depositFixedCents: pricing.depositAmountCents || config().DEPOSIT_FIXED_CENTS,
      depositPercentBps: pricing.depositPercentBps || config().DEPOSIT_PERCENT_BPS,
      depositDailyMultiplierBps:
        pricing.depositDailyMultiplierBps || config().DEPOSIT_DAILY_MULTIPLIER_BPS,
      currency: pricing.currency,
      mileagePolicyType: pricing.mileagePolicyType,
      fuelPolicy: pricing.fuelPolicy,
    });

    const fingerprint = sha256(
      JSON.stringify({
        v: 1,
        price: pricing.dailyPriceCents,
        pickup: pickupAt.toISOString(),
        ret: returnAt.toISOString(),
        extras: selectedExtras.map((e) => [e.code, e.quantity, e.unitCents]),
        delivery: deliveryFeeCents,
        promo: promo?.id ?? null,
        rule: pricing.depositRule,
      }),
    );

    const reference = quoteReference();
    const expiresAt = new Date(Date.now() + config().QUOTE_TTL_MINUTES * 60_000);
    const quote = (
      await this.db
        .insert(quotes)
        .values({
          reference,
          userId,
          vehicleId: vehicle.id,
          status: QuoteStatus.ACTIVE,
          pickupAt,
          returnAt,
          timezone: dto.timezone ?? 'Africa/Nairobi',
          pickupOption: dto.pickupOption,
          deliveryZoneId,
          promoCodeId,
          rentalSubtotalCents: computation.rentalSubtotalCents,
          extrasCents: computation.extrasCents,
          deliveryCents: computation.deliveryCents,
          serviceFeeCents: computation.serviceFeeCents,
          discountCents: computation.discountCents,
          taxCents: computation.taxCents,
          depositCents: computation.depositCents,
          totalCents: computation.totalCents,
          refundableCents: computation.refundableCents,
          commissionBps: config().COMMISSION_BPS,
          currency: computation.currency,
          extrasSelection: selectedExtras,
          pricingFingerprint: fingerprint,
          expiresAt,
        })
        .returning()
    )[0]!;

    await this.db.insert(quoteItems).values(
      computation.items.map((i) => ({
        quoteId: quote.id,
        kind: i.kind,
        code: i.code,
        label: i.label,
        quantity: i.quantity,
        unitCents: i.unitCents,
        amountCents: i.amountCents,
        metadata: (i.metadata ?? null) as any,
      })),
    );

    return { quote: { ...quote, items: computation.items }, fingerprint };
  }

  async getActive(id: string, userId: string) {
    const quote = (await this.db.select().from(quotes).where(eq(quotes.id, id)).limit(1))[0];
    if (!quote || quote.userId !== userId) throw notFound('Quote');
    if (quote.status !== QuoteStatus.ACTIVE) throw gone('QUOTE_INACTIVE', 'This quote has been used. Start a new booking.');
    if (quote.expiresAt < new Date()) {
      await this.db.update(quotes).set({ status: QuoteStatus.EXPIRED }).where(eq(quotes.id, id));
      throw gone('QUOTE_EXPIRED', 'Your quote expired. Prices and availability will be refreshed.');
    }
    const items = await this.db.select().from(quoteItems).where(eq(quoteItems.quoteId, id));
    return { ...quote, items };
  }

  /** Recompute against current catalogue data; reject if price moved or quote expired. */
  async assertStillValid(quoteId: string): Promise<void> {
    const quote = (await this.db.select().from(quotes).where(eq(quotes.id, quoteId)).limit(1))[0]!;
    if (!quote) throw notFound('Quote');
    if (quote.status !== QuoteStatus.ACTIVE) {
      throw gone('QUOTE_INACTIVE', 'This quote has already been used.');
    }
    if (quote.expiresAt < new Date()) {
      await this.db.update(quotes).set({ status: QuoteStatus.EXPIRED }).where(eq(quotes.id, quoteId));
      throw gone('QUOTE_EXPIRED', 'Your quote expired. Please review the updated price and try again.');
    }
    const { pricing } = await this.loadPricingContext(quote.vehicleId);
    const fingerprint = sha256(
      JSON.stringify({
        v: 1,
        price: pricing.dailyPriceCents,
        pickup: quote.pickupAt.toISOString(),
        ret: quote.returnAt.toISOString(),
        extras: (quote.extrasSelection as any[]).map((e) => [e.code, e.quantity, e.unitCents]),
        delivery: quote.deliveryCents,
        promo: quote.promoCodeId,
        rule: pricing.depositRule,
      }),
    );
    if (fingerprint !== quote.pricingFingerprint) {
      throw gone(
        'PRICE_CHANGED',
        'The price or an extra changed while you were checking out. Please review and confirm again.',
      );
    }
  }

  async countUncancelledBetween(vehicleId: string, from: Date, to: Date) {
    const rows = await this.db
      .select({ id: bookings.id })
      .from(bookings)
      .where(
        and(
          eq(bookings.vehicleId, vehicleId),
          lte(bookings.scheduledPickupAt, to),
          gte(bookings.scheduledReturnAt, from),
        ),
      );
    return rows.length;
  }
}
