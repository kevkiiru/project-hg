// Integer-safe money. KES is stored in integer CENTS (minor units).
// Never use floating point for authoritative math.

export const KES = 'KES';

export interface Money {
  amountCents: number;
  currency: string;
}

export const money = (amountCents: number, currency: string = KES): Money => {
  if (!Number.isInteger(amountCents)) {
    throw new Error(`money amount must be integer cents, got ${amountCents}`);
  }
  return { amountCents, currency };
};

export const shillings = (kes: number, currency: string = KES): Money =>
  money(Math.round(kes * 100), currency);

export const addCents = (a: number, b: number): number => {
  if (!Number.isInteger(a) || !Number.isInteger(b)) throw new Error('integer cents required');
  return a + b;
};

export const sumCents = (...values: number[]): number => values.reduce((a, b) => a + b, 0);

/** Basis points (1bp = 0.01%). Rounding rule: round half away from zero. */
export const bpsOf = (amountCents: number, bps: number): number => {
  if (!Number.isInteger(amountCents) || !Number.isInteger(bps)) {
    throw new Error('bpsOf requires integer inputs');
  }
  const product = amountCents * bps;
  const sign = product < 0 ? -1 : 1;
  return sign * Math.round(Math.abs(product) / 10000);
};

export const neg = (cents: number): number => -cents;

/** Format integer cents as KES for display: KSh 6,500/day handled by caller. */
export const formatKES = (amountCents: number, opts: { decimals?: boolean } = {}): string => {
  const wholeShillings = amountCents / 100;
  const formatted = new Intl.NumberFormat('en-KE', {
    minimumFractionDigits: opts.decimals && amountCents % 100 !== 0 ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(wholeShillings);
  return `KSh ${formatted}`;
};

export const formatMoney = (m: Money): string =>
  m.currency === KES ? formatKES(m.amountCents) : `${m.currency} ${(m.amountCents / 100).toFixed(2)}`;

export const isNonNegative = (cents: number): boolean => cents >= 0;
