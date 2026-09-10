// Time rules: store UTC; render Africa/Nairobi. Kenya has no DST (UTC+3 all year).
export const NAIROBI_TZ = 'Africa/Nairobi';

export const requireFutureRange = (pickupAt: Date, returnAt: Date, now: Date = new Date()): void => {
  if (returnAt.getTime() <= pickupAt.getTime()) {
    throw new Error('RETURN_BEFORE_PICKUP');
  }
  if (pickupAt.getTime() <= now.getTime()) {
    throw new Error('PICKUP_IN_PAST');
  }
};

export const wholeMinutes = (ms: number): number => Math.floor(ms / 60000);
export const wholeHours = (ms: number): number => Math.floor(ms / 3_600_000);
export const wholeDays = (ms: number): number => Math.floor(ms / 86_400_000);

/**
 * Billable rental days: pickup day to return day counts a day per started 24h,
 * with an industry-standard grace (default 59m) configurable.
 */
export const billableDays = (
  start: Date,
  end: Date,
  graceMinutes = 59,
): { days: number; exactHours: number } => {
  const ms = end.getTime() - start.getTime();
  const exactHours = ms / 3_600_000;
  const withGrace = ms - graceMinutes * 60000;
  const days = Math.max(1, Math.ceil(withGrace / 86_400_000));
  return { days, exactHours };
};

/** Late minutes against scheduled return; 0 when not late. */
export const lateMinutes = (scheduledReturn: Date, actualReturn: Date, graceMinutes = 0): number =>
  Math.max(0, wholeMinutes(actualReturn.getTime() - scheduledReturn.getTime() - graceMinutes * 60000));

export const overlap = (
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean => aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();

export const formatNairobiDate = new Intl.DateTimeFormat('en-KE', {
  timeZone: NAIROBI_TZ,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
export const formatNairobiTime = new Intl.DateTimeFormat('en-KE', {
  timeZone: NAIROBI_TZ,
  hour: 'numeric',
  minute: '2-digit',
});
export const formatNairobiDateTime = new Intl.DateTimeFormat('en-KE', {
  timeZone: NAIROBI_TZ,
  dateStyle: 'medium',
  timeStyle: 'short',
});
