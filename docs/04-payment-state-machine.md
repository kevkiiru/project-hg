# Payment State Machine

Implementation: `apps/api/src/modules/payments/payment.machine.ts`.
Payments are independent of bookings; a booking may have many payments
(rental, deposit, extension, adjustments) and never a `paid` boolean.

## States

`CREATED → PENDING → PROCESSING → SUCCEEDED`
branching to `FAILED` / `CANCELLED`, and from `SUCCEEDED` →
`PARTIALLY_REFUNDED` → `REFUNDED`.

| State | Meaning |
|---|---|
| `CREATED` | Intent row created; provider not yet contacted. |
| `PENDING` | STK push/card checkout sent; awaiting customer authorisation. |
| `PROCESSING` | Provider accepted; callback/confirmation in flight. |
| `SUCCEEDED` | Verified provider callback (or reconciliation match); money confirmed. |
| `FAILED` | Provider rejection/timeout; failure code stored; booking may retry with new Payment. |
| `CANCELLED` | Customer cancelled the prompt or it expired unauthorised. |
| `PARTIALLY_REFUNDED` | One or more refunds, sum < captured amount. |
| `REFUNDED` | Refunded amount equals captured amount. |

## Transitions & triggers

* Request (adapter `initiate`) → `PENDING` (provider ref stored).
* Authentic webhook result:
  `PENDING|PROCESSING → PROCESSING` (processing events, idempotent)
  `PENDING|PROCESSING → SUCCEEDED` only on verified success event; the webhook
  handler re-queries the provider (don't trust payload alone where the
  provider supports status query).
  `PENDING|PROCESSING → FAILED` on failure/cancel events.
* Reconciliation job may move stuck `PENDING/PROCESSING` by querying provider.
* Refund service moves `SUCCEEDED → PARTIALLY_REFUNDED|REFUNDED` based on
  cumulative refund totals (computed from Refund rows, never a mutated total).
* Retries create a **new** Payment row; old one stays `FAILED/CANCELLED`.

## Async rules (spec §26)

* Webhook events are persisted first (`PaymentWebhookEvent`: provider event id
  unique, signature validity, hash, attempts). Duplicates → same outcome, no
  double effects (idempotent state machine + unique ledger idempotency keys).
* Out-of-order and late callbacks are handled by comparing current state;
  backwards transitions are ignored with an `IGNORED` event record.
* Browser redirects only poll status; they never cause `SUCCEEDED`.
* Repeated webhook failures alert; dead-lettered after configurable attempts.
* No card data ever touches Hiregari servers (hosted/tokenized checkout).

M-Pesa (Daraja-style STK) adapter and card adapter implement one
`PaymentProviderPort`; sandbox/mock adapter simulates the async callback and
is disabled via boot guard in production (see provider plan doc).
