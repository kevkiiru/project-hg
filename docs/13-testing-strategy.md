# Testing Strategy

## Test pyramid
1. **Unit (Vitest)** — pure domain, no DB: money rounding, pricing, quote
   building, availability conflict predicate, booking/payment/deposit/payout
   state machines, cancellation math, commission, mileage/late adjustments,
   reference id generation, RBAC matrix vs guards.
2. **Integration (Vitest + embedded PostgreSQL)** — real Postgres 18 via
   `@embedded-postgres` through `packages/testing`: Prisma client, exclusions,
   advisory locks, ledger immutability trigger, webhook idempotency,
   refund/payout flows, search eligibility across bookings/blocks/holds/
   buffers/doc-expiry.
3. **API tests (supertest + embedded PG, mock adapters)** — auth/OTP rate
   limits, quote→booking happy path, host/vehicle approval loop, permissions
   403s, idempotency replay, signed-URL upload flow, error envelopes.
4. **E2E (Playwright)** — critical journeys (below) against web+api+PG;
   provider clicks replaced by dev-only mock M-Pesa callback endpoint.
5. **Contract** — `packages/types` Zod schemas shared; response factories
   type-checked against contracts.

## Mandatory explicit scenarios (spec §64) — mapping

| Scenario | Where covered |
|---|---|
| Two customers attempt same car | integration `booking.concurrency.spec.ts` (exclusion + advisory lock) |
| Payment callback late | webhook spec: event before transition after timeout; reconciliation |
| Duplicate callback | same spec: re-POST same payload = one posting/transition |
| User closes page during payment | payment status remains PENDING; expiry job; retries new Payment |
| Host changes price mid-checkout | quote snapshot test; booking uses frozen snapshot |
| Availability changes during checkout | hold + revalidation tests (block created after quote → 409) |
| Licence expires | verification expiry job excludes driver/booking gating |
| Insurance/document expires | doc-expiry job suspends/blocks new bookings spec |
| Host cancels after payment | cancellation + refund + ledger spec |
| Customer cancels | policy-tier math specs (flexible/moderate/strict) |
| Partial refund | payment state PARTIALLY_REFUNDED + ledger spec |
| Damage dispute | inspection diff → claim → dispute → deposit deduction spec |
| Deposit deduction | deposit machine + postings spec |
| Payout failure | payout FAILED→retry→PAID spec; HELD rules |
| Booking across midnight | pricing duration specs (Africa/Nairobi dst-less, date boundaries) |
| Booking across year boundary | same |
| Extension conflicts next booking | availability extension spec |

## Commands & CI
`npm test` (turbo: vitest), `npm run typecheck`, `npm run lint`,
Playwright `web:e2e` (manual/CI with server startup). CI (future GitHub
Actions) provisions embedded PG automatically — no Docker dependency.

## Financial correctness safeguards
* Every ledger posting asserts balanced debit=credit in service + tests.
* Snapshot comparison tests lock quote → booking → completion totals.
* Reconciliation job test injects drift and asserts alert/queue result.

## Seed/demo isolation
Seeds are flagged `isDemoData`; seed runner refuses when
`NODE_ENV=production`. Demo ledgers use a clearly labelled demo host/customer.
