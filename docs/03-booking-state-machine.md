# Booking State Machine

Authoritative implementation: `apps/api/src/modules/bookings/booking.machine.ts`
(declarative transition table; the only code allowed to write `Booking.status`).

## States

| State | Meaning |
|---|---|
| `DRAFT` | Intent created pre-quote (rare; usually skipped). |
| `AWAITING_VERIFICATION` | Renter driver verification incomplete/expired. |
| `PENDING_HOST` | Request-to-book: awaiting host accept/decline. |
| `PAYMENT_PENDING` | Accepted (request) or instant-book; quote locked, hold active, awaiting payment. |
| `CONFIRMED` | Paid (rental + deposit per rules); calendar blocked; reminders scheduled. |
| `PICKUP_PENDING` | Within pickup window (e.g. ≤24h, configurable); awaiting handover. |
| `ACTIVE` | Pickup inspection signed by both; car in renter possession. |
| `RETURN_PENDING` | Scheduled return reached / renter initiated return; awaiting return inspection. |
| `COMPLETED` | Return inspection done; adjustments & deposit finalised; payout clock starts. |
| `CANCELLED` | Cancellation policy executed; refund (if any) initiated; never deleted. |
| `DECLINED` | Host declined a request, or system-declined on failed validation. |
| `EXPIRED` | Request not accepted / payment not completed before hold/quote expiry. |
| `DISPUTED` | Sub-state overlay (any of CONFIRMED…COMPLETED): a dispute is open; resolution returns to prior state or COMPLETED/CANCELLED. |

## Allowed transitions

```
DRAFT                 → AWAITING_VERIFICATION, PENDING_HOST, PAYMENT_PENDING, EXPIRED
AWAITING_VERIFICATION → PENDING_HOST, PAYMENT_PENDING (instant), CANCELLED
PENDING_HOST          → PAYMENT_PENDING (host accept), DECLINED (host/system), EXPIRED (timeout), CANCELLED (renter)
PAYMENT_PENDING       → CONFIRMED (payment success + deposit per policy), EXPIRED (hold/quote), CANCELLED (renter/abandon)
CONFIRMED             → PICKUP_PENDING (time job), ACTIVE (pickup inspection), CANCELLED (policy), DISPUTED
PICKUP_PENDING        → ACTIVE (inspection signed), CANCELLED (policy/no-show rules*), DISPUTED
ACTIVE                → RETURN_PENDING, DISPUTED
RETURN_PENDING        → ACTIVE (return not completed), COMPLETED (return inspection + money finalised), DISPUTED
DISPUTED              → state at dispute open (CONFIRMED/PICKUP_PENDING/ACTIVE/RETURN_PENDING/COMPLETED), CANCELLED
COMPLETED             → DISPUTED (post-return dispute window), then COMPLETED on resolution
CANCELLED/DECLINED/EXPIRED/COMPLETED → terminal (except COMPLETED ↔ DISPUTED overlay)
```

`*` no-show handling: REQUIRES BUSINESS/LEGAL DECISION (configurable job, default
marked no-show after grace period with no refund without admin review).

## Guard conditions (evaluated server-side, inside transactions)

* Enter `PAYMENT_PENDING`: quote valid & revalidated, availability hold taken,
  host VERIFIED, vehicle APPROVED & documents valid (insurance/registration not
  expired), minimum duration satisfied.
* Enter `CONFIRMED`: required payment intent `SUCCEEDED` and verified webhook;
  deposit status REQUIRED→HELD/COLLECTED (or policy says collect at pickup);
  commission posting created; confirmation notifications enqueued.
* Enter `ACTIVE`: pickup inspection exists, both acknowledgement signatures
  present (or admin override audited), odometer/fuel captured, status time ≤
  allowed pickup window; deposit guarantee confirmed.
* Enter `COMPLETED`: return inspection exists, distance/late computed,
  adjustments resolved/approved, deposit finalised, ledger balanced, payout
  record scheduled.
* Extensions: permitted from CONFIRMED/PICKUP_PENDING/ACTIVE only if no overlap
  with confirmed bookings/blocks on the extended range; extension quote paid
  before end moves; implemented as range update + snapshot line items + history.

Every transition appends `BookingStatusHistory` (from, to, actor, reason, meta)
and emits an outbox event. Illegal transitions raise
`ILLEGAL_BOOKING_TRANSITION` (409) and are covered by unit tests.
