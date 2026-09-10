import {
  BookingStatus,
  DepositStatus,
  PaymentStatus,
  PayoutStatus,
} from '@hiregari/types';

export class IllegalTransitionError extends Error {
  constructor(
    public entity: string,
    public from: string,
    public to: string,
  ) {
    super(`Illegal ${entity} transition ${from} → ${to}`);
  }
}

function assertTransition<S extends string>(
  entity: string,
  allowed: Record<S, S[]>,
  from: S,
  to: S,
) {
  if (from === to) return;
  if (!allowed[from]?.includes(to)) {
    throw new IllegalTransitionError(entity, from, to);
  }
}

// ── Booking (spec §19) ──────────────────────────────────────────────────────
const BOOKING: Record<BookingStatus, BookingStatus[]> = {
  DRAFT: [
    BookingStatus.AWAITING_VERIFICATION,
    BookingStatus.PENDING_HOST,
    BookingStatus.PAYMENT_PENDING,
    BookingStatus.EXPIRED,
    BookingStatus.CANCELLED,
  ],
  AWAITING_VERIFICATION: [
    BookingStatus.PENDING_HOST,
    BookingStatus.PAYMENT_PENDING,
    BookingStatus.CANCELLED,
  ],
  PENDING_HOST: [
    BookingStatus.PAYMENT_PENDING,
    BookingStatus.DECLINED,
    BookingStatus.EXPIRED,
    BookingStatus.CANCELLED,
  ],
  PAYMENT_PENDING: [
    BookingStatus.CONFIRMED,
    BookingStatus.EXPIRED,
    BookingStatus.CANCELLED,
  ],
  CONFIRMED: [
    BookingStatus.PICKUP_PENDING,
    BookingStatus.ACTIVE,
    BookingStatus.CANCELLED,
    BookingStatus.DISPUTED,
  ],
  PICKUP_PENDING: [
    BookingStatus.ACTIVE,
    BookingStatus.CANCELLED,
    BookingStatus.DISPUTED,
  ],
  ACTIVE: [BookingStatus.RETURN_PENDING, BookingStatus.DISPUTED],
  RETURN_PENDING: [
    BookingStatus.ACTIVE,
    BookingStatus.COMPLETED,
    BookingStatus.DISPUTED,
  ],
  COMPLETED: [BookingStatus.DISPUTED],
  DISPUTED: [
    BookingStatus.CONFIRMED,
    BookingStatus.PICKUP_PENDING,
    BookingStatus.ACTIVE,
    BookingStatus.RETURN_PENDING,
    BookingStatus.COMPLETED,
    BookingStatus.CANCELLED,
  ],
  CANCELLED: [],
  DECLINED: [] as BookingStatus[],
  EXPIRED: [] as BookingStatus[],
};

export const assertBookingTransition = (from: BookingStatus, to: BookingStatus) =>
  assertTransition('booking', BOOKING, from, to);

export const BOOKING_OCCUPYING: ReadonlySet<BookingStatus> = new Set([
  BookingStatus.PAYMENT_PENDING,
  BookingStatus.CONFIRMED,
  BookingStatus.PICKUP_PENDING,
  BookingStatus.ACTIVE,
  BookingStatus.RETURN_PENDING,
]);

// ── Payment (spec §25) ──────────────────────────────────────────────────────
const PAYMENT: Record<PaymentStatus, PaymentStatus[]> = {
  CREATED: [PaymentStatus.PENDING, PaymentStatus.FAILED, PaymentStatus.CANCELLED],
  PENDING: [
    PaymentStatus.PROCESSING,
    PaymentStatus.SUCCEEDED,
    PaymentStatus.FAILED,
    PaymentStatus.CANCELLED,
  ],
  PROCESSING: [
    PaymentStatus.SUCCEEDED,
    PaymentStatus.FAILED,
    PaymentStatus.CANCELLED,
  ],
  SUCCEEDED: [PaymentStatus.PARTIALLY_REFUNDED, PaymentStatus.REFUNDED],
  FAILED: [],
  CANCELLED: [],
  PARTIALLY_REFUNDED: [PaymentStatus.PARTIALLY_REFUNDED, PaymentStatus.REFUNDED],
  REFUNDED: [],
};

export const assertPaymentTransition = (from: PaymentStatus, to: PaymentStatus) =>
  assertTransition('payment', PAYMENT, from, to);

export const refundDerivedPaymentStatus = (
  capturedCents: number,
  refundedCents: number,
): PaymentStatus => {
  if (refundedCents <= 0) return PaymentStatus.SUCCEEDED;
  if (refundedCents >= capturedCents) return PaymentStatus.REFUNDED;
  return PaymentStatus.PARTIALLY_REFUNDED;
};

// ── Deposit (spec §27) ──────────────────────────────────────────────────────
const DEPOSIT: Record<DepositStatus, DepositStatus[]> = {
  REQUIRED: [DepositStatus.PENDING, DepositStatus.RELEASED],
  PENDING: [
    DepositStatus.HELD,
    DepositStatus.COLLECTED,
    DepositStatus.REQUIRED,
    DepositStatus.RELEASED,
  ],
  HELD: [DepositStatus.COLLECTED, DepositStatus.RELEASE_PENDING, DepositStatus.RELEASED],
  COLLECTED: [
    DepositStatus.RELEASE_PENDING,
    DepositStatus.PARTIALLY_DEDUCTED,
    DepositStatus.DEDUCTED,
    DepositStatus.REFUNDED,
  ],
  RELEASE_PENDING: [
    DepositStatus.RELEASED,
    DepositStatus.PARTIALLY_DEDUCTED,
    DepositStatus.DEDUCTED,
    DepositStatus.DISPUTED,
  ],
  PARTIALLY_DEDUCTED: [DepositStatus.RELEASED, DepositStatus.DISPUTED],
  DEDUCTED: [DepositStatus.DISPUTED],
  DISPUTED: [
    DepositStatus.RELEASED,
    DepositStatus.PARTIALLY_DEDUCTED,
    DepositStatus.DEDUCTED,
  ],
  RELEASED: [],
  REFUNDED: [],
};

export const assertDepositTransition = (from: DepositStatus, to: DepositStatus) =>
  assertTransition('deposit', DEPOSIT, from, to);

// ── Payout (spec §29) ───────────────────────────────────────────────────────
const PAYOUT: Record<PayoutStatus, PayoutStatus[]> = {
  PENDING: [PayoutStatus.SCHEDULED, PayoutStatus.HELD],
  SCHEDULED: [PayoutStatus.PROCESSING, PayoutStatus.HELD],
  PROCESSING: [PayoutStatus.PAID, PayoutStatus.FAILED],
  FAILED: [PayoutStatus.SCHEDULED, PayoutStatus.HELD],
  HELD: [PayoutStatus.SCHEDULED],
  PAID: [],
};

export const assertPayoutTransition = (from: PayoutStatus, to: PayoutStatus) =>
  assertTransition('payout', PAYOUT, from, to);
