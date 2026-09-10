import {
  bpsOf,
  DepositRule,
  ExtraChargeType,
  FuelPolicy,
  MileagePolicyType,
  PriceItemKind,
  sumCents,
} from '@hiregari/types';
import { billableDays } from '@hiregari/types';

export interface ExtraInput {
  code: string;
  label: string;
  chargeType: ExtraChargeType;
  unitCents: number;
  quantity: number;
}

export interface PromoInput {
  kind: 'PERCENT' | 'FIXED';
  percentBps?: number | null;
  amountCents?: number | null;
  maxDiscountCents?: number | null;
  minBookingCents: number;
}

export interface PricingInput {
  dailyPriceCents: number;
  weeklyDiscountBps: number;
  monthlyDiscountBps: number;
  minimumRentalHours: number;
  minimumRentalDays: number;
  pickupAt: Date;
  returnAt: Date;
  extras: ExtraInput[];
  deliveryFeeCents: number;
  promo?: PromoInput | null;
  /** Host-side marketplace commission, snapshotted for payout statements. */
  commissionBps: number;
  /** Optional renter-facing service fee; 0 unless Finance enables it. */
  renterServiceFeeBps?: number;
  taxBps: number;
  depositRule: DepositRule;
  depositFixedCents: number;
  depositPercentBps: number;
  depositDailyMultiplierBps: number;
  currency: string;
  mileagePolicyType: MileagePolicyType;
  fuelPolicy: FuelPolicy;
}

export interface PriceLine {
  kind: PriceItemKind;
  code: string;
  label: string;
  quantity: number;
  unitCents: number;
  amountCents: number;
  metadata?: Record<string, unknown>;
}

export interface QuoteComputation {
  billableDays: number;
  dailyRateCents: number;
  rentalSubtotalCents: number;
  extrasCents: number;
  deliveryCents: number;
  serviceFeeCents: number;
  discountCents: number;
  taxCents: number;
  depositCents: number;
  totalCents: number;
  amountDueCents: number;
  refundableCents: number;
  currency: string;
  items: PriceLine[];
}

export class PricingError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export function computeQuote(input: PricingInput): QuoteComputation {
  const durationMs = input.returnAt.getTime() - input.pickupAt.getTime();
  if (durationMs <= 0) throw new PricingError('INVALID_DATES', 'Return must be after pickup.');
  const durationHours = durationMs / 3_600_000;
  if (durationHours + 1 / 60 < input.minimumRentalHours) {
    throw new PricingError(
      'MIN_DURATION',
      `This vehicle requires a minimum rental of ${Math.max(input.minimumRentalDays, 1)} day(s).`,
    );
  }

  const { days: billableDaysCount } = billableDays(input.pickupAt, input.returnAt, 59);
  let effectiveDaily = input.dailyPriceCents;
  let discountBps = 0;
  if (billableDaysCount >= 28 && input.monthlyDiscountBps > 0) discountBps = input.monthlyDiscountBps;
  else if (billableDaysCount >= 7 && input.weeklyDiscountBps > 0) discountBps = input.weeklyDiscountBps;
  effectiveDaily = input.dailyPriceCents - bpsOf(input.dailyPriceCents, discountBps);

  const rentalSubtotal = effectiveDaily * billableDaysCount;
  const items: PriceLine[] = [
    {
      kind: PriceItemKind.RENTAL,
      code: 'RENTAL_DAYS',
      label: `Rental · ${billableDaysCount} day${billableDaysCount > 1 ? 's' : ''}`,
      quantity: billableDaysCount,
      unitCents: effectiveDaily,
      amountCents: rentalSubtotal,
      metadata: discountBps ? { discountedFromCents: input.dailyPriceCents } : undefined,
    },
  ];

  let extrasTotal = 0;
  for (const e of input.extras) {
    const multiplier = e.chargeType === ExtraChargeType.DAILY ? billableDaysCount : 1;
    const amount = e.unitCents * e.quantity * multiplier;
    extrasTotal += amount;
    items.push({
      kind: PriceItemKind.EXTRA,
      code: e.code,
      label: e.label,
      quantity: e.quantity * multiplier,
      unitCents: e.unitCents,
      amountCents: amount,
    });
  }

  if (input.deliveryFeeCents > 0) {
    items.push({
      kind: PriceItemKind.DELIVERY,
      code: 'DELIVERY',
      label: 'Delivery',
      quantity: 1,
      unitCents: input.deliveryFeeCents,
      amountCents: input.deliveryFeeCents,
    });
  }

  // Optional renter-facing service fee. The documented model takes
  // commission from the host payout, so this defaults to 0
  // (RENTER_SERVICE_FEE_BPS); enabling both sides is a BLED-001 decision.
  const feeBps = input.renterServiceFeeBps ?? 0;
  const serviceFee = bpsOf(rentalSubtotal, feeBps);
  if (serviceFee > 0) {
    items.push({
      kind: PriceItemKind.FEE,
      code: 'SERVICE_FEE',
      label: 'Hiregari service fee',
      quantity: 1,
      unitCents: serviceFee,
      amountCents: serviceFee,
      metadata: { bps: feeBps },
    });
  }

  const beforeDiscount = sumCents(rentalSubtotal, extrasTotal, input.deliveryFeeCents, serviceFee);

  let discount = 0;
  if (input.promo) {
    const promo = input.promo;
    if (rentalSubtotal < promo.minBookingCents) {
      throw new PricingError('PROMO_MIN_NOT_MET', 'This promo code does not apply to bookings this small.');
    }
    if (promo.kind === 'PERCENT') discount = bpsOf(rentalSubtotal, promo.percentBps ?? 0);
    if (promo.kind === 'FIXED') discount = promo.amountCents ?? 0;
    if (promo.maxDiscountCents != null) discount = Math.min(discount, promo.maxDiscountCents);
    discount = Math.min(discount, rentalSubtotal);
    if (discount > 0) {
      items.push({
        kind: PriceItemKind.DISCOUNT,
        code: 'PROMO',
        label: 'Promo discount',
        quantity: 1,
        unitCents: -discount,
        amountCents: -discount,
      });
    }
  }

  const taxable = beforeDiscount - discount;
  const tax = bpsOf(Math.max(0, taxable), input.taxBps);
  if (tax > 0) {
    items.push({
      kind: PriceItemKind.TAX,
      code: 'TAX',
      label: 'Tax',
      quantity: 1,
      unitCents: tax,
      amountCents: tax,
    });
  }

  const total = sumCents(
    rentalSubtotal,
    extrasTotal,
    input.deliveryFeeCents,
    serviceFee,
    tax,
    -discount,
  );

  // Security deposit (refundable liability, never revenue).
  let deposit = 0;
  switch (input.depositRule) {
    case DepositRule.FIXED:
      deposit = input.depositFixedCents;
      break;
    case DepositRule.PERCENT_OF_TOTAL:
      deposit = bpsOf(total, input.depositPercentBps);
      break;
    case DepositRule.DAILY_RATE_MULTIPLE:
      deposit = Math.round((input.dailyPriceCents * input.depositDailyMultiplierBps) / 10000);
      break;
  }
  if (deposit > 0) {
    items.push({
      kind: PriceItemKind.DEPOSIT,
      code: 'SECURITY_DEPOSIT',
      label: 'Refundable security deposit',
      quantity: 1,
      unitCents: deposit,
      amountCents: deposit,
    });
  }

  return {
    billableDays: billableDaysCount,
    dailyRateCents: input.dailyPriceCents,
    rentalSubtotalCents: rentalSubtotal,
    extrasCents: extrasTotal,
    deliveryCents: input.deliveryFeeCents,
    serviceFeeCents: serviceFee,
    discountCents: discount,
    taxCents: tax,
    depositCents: deposit,
    totalCents: total,
    amountDueCents: total + deposit,
    refundableCents: deposit,
    currency: input.currency,
    items,
  };
}

/** Deposit amount for an already computed total, reusable by services. */
export function computeDeposit(
  rule: DepositRule,
  totalCents: number,
  dailyCents: number,
  fixed: number,
  percentBps: number,
  multiplierBps: number,
): number {
  switch (rule) {
    case DepositRule.FIXED:
      return fixed;
    case DepositRule.PERCENT_OF_TOTAL:
      return bpsOf(totalCents, percentBps);
    case DepositRule.DAILY_RATE_MULTIPLE:
      return Math.round((dailyCents * multiplierBps) / 10000);
  }
}
