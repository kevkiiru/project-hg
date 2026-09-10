import { lateMinutes as lateMinutesFn, wholeHours } from '@hiregari/types';

export interface MileageChargeInput {
  pickupOdometerKm: number;
  returnOdometerKm: number;
  policyType: 'UNLIMITED' | 'PER_DAY' | 'PER_BOOKING';
  includedKmPerDay: number | null;
  includedKmTotal: number | null;
  billableDays: number;
  excessPerKmCents: number | null;
}

export function excessMileageCharge(input: MileageChargeInput): {
  distanceKm: number;
  includedKm: number;
  excessKm: number;
  chargeCents: number;
} {
  const distanceKm = Math.max(0, Math.round((input.returnOdometerKm - input.pickupOdometerKm) * 10) / 10);
  let includedKm = 0;
  if (input.policyType === 'UNLIMITED') includedKm = Number.POSITIVE_INFINITY;
  else if (input.policyType === 'PER_DAY') includedKm = (input.includedKmPerDay ?? 0) * input.billableDays;
  else includedKm = input.includedKmTotal ?? 0;
  const excessKm = input.policyType === 'UNLIMITED' ? 0 : Math.max(0, Math.ceil(distanceKm - includedKm));
  const chargeCents = excessKm * (input.excessPerKmCents ?? 0);
  return { distanceKm, includedKm, excessKm, chargeCents };
}

export interface LateChargeInput {
  scheduledReturn: Date;
  actualReturn: Date;
  graceMinutes: number;
  hourlyFeeCents: number;
  /** Cap at the daily rate to avoid runaway fees; caller passes daily cents. */
  dailyRateCapCents?: number;
}

export function lateReturnCharge(input: LateChargeInput): {
  lateMinutes: number;
  billableHours: number;
  chargeCents: number;
} {
  const lateMinutes = lateMinutesFn(input.scheduledReturn, input.actualReturn, input.graceMinutes);
  const billableHours = lateMinutes > 0 ? Math.ceil(lateMinutes / 60) : 0;
  let charge = billableHours * input.hourlyFeeCents;
  if (input.dailyRateCapCents != null) charge = Math.min(charge, input.dailyRateCapCents);
  return { lateMinutes, billableHours, chargeCents: charge };
}

export { wholeHours };
