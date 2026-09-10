import { CancellationTier } from '@hiregari/types';

export interface CancellationRule {
  /** Hours before pickup at/above which this tier applies (descending). */
  beforeHours: number;
  /** Basis points of paid charges refunded (0..10000). Placeholder policy. */
  refundBps: number;
  /** Flat/percent fee retained (informational; refund math is authoritative). */
  feeBps?: number;
}

export interface CancellationPolicyConfig {
  code: string;
  tier: CancellationTier;
  rules: CancellationRule[];
  depositBehavior: 'RELEASE' | 'RETAIN';
}

export interface CancellationOutcome {
  refundBps: number;
  /** Refund on rental charges (excluding deposit), integer cents. */
  rentalRefundCents: number;
  /** Deposit always releases before pickup unless policy says RETAIN. */
  depositReleased: boolean;
  matchedRule: CancellationRule;
}

const PLACEHOLDER_POLICIES: Record<string, CancellationPolicyConfig> = {
  // BLED-008: placeholder values pending legal/business confirmation.
  FLEXIBLE: {
    code: 'FLEXIBLE',
    tier: CancellationTier.FLEXIBLE,
    depositBehavior: 'RELEASE',
    rules: [
      { beforeHours: 48, refundBps: 10000 },
      { beforeHours: 24, refundBps: 9000 },
      { beforeHours: 0, refundBps: 5000 },
    ],
  },
  MODERATE: {
    code: 'MODERATE',
    tier: CancellationTier.MODERATE,
    depositBehavior: 'RELEASE',
    rules: [
      { beforeHours: 72, refundBps: 10000 },
      { beforeHours: 48, refundBps: 5000 },
      { beforeHours: 0, refundBps: 0 },
    ],
  },
  STRICT: {
    code: 'STRICT',
    tier: CancellationTier.STRICT,
    depositBehavior: 'RELEASE',
    rules: [
      { beforeHours: 168, refundBps: 5000 },
      { beforeHours: 0, refundBps: 0 },
    ],
  },
};

export const placeholderPolicies = PLACEHOLDER_POLICIES;

export function calculateCancellation(params: {
  policy: CancellationPolicyConfig;
  now: Date;
  scheduledPickupAt: Date;
  paidCents: number;
  hasPickupHappened: boolean;
}): CancellationOutcome {
  const { policy, now, scheduledPickupAt, paidCents, hasPickupHappened } = params;
  const sorted = [...policy.rules].sort((a, b) => b.beforeHours - a.beforeHours);
  const hoursBefore = (scheduledPickupAt.getTime() - now.getTime()) / 3_600_000;
  let matched = sorted[sorted.length - 1]!;
  for (const rule of sorted) {
    if (hoursBefore >= rule.beforeHours) {
      matched = rule;
      break;
    }
  }
  const refundBps = hasPickupHappened ? 0 : matched.refundBps;
  const rentalRefundCents = Math.round((paidCents * refundBps) / 10000);
  return {
    refundBps,
    rentalRefundCents,
    depositReleased: !hasPickupHappened && policy.depositBehavior === 'RELEASE',
    matchedRule: matched,
  };
}
