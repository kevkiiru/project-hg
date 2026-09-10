# Hiregari — Technical Architecture

> Status: approved for MVP build · Owner: Platform · Last reviewed: 2026-09-10

## 1. Principles

1. **Modular monolith.** One deployable API (`apps/api`) with strict NestJS module
   boundaries. No microservices in the MVP; module boundaries are enforced via
   ESLint import rules and by only exporting through each module's public service.
2. **PostgreSQL is the single canonical transactional store.** Redis is an
   optimisation layer (holds, queues, caching), never the source of truth.
3. **Server-authoritative domain logic.** Pricing, quotes, availability, state
   transitions, commissions and refunds are computed only on the server. Browsers
   send intents; they never send authoritative totals.
4. **Money is integer minor units** (cents of KES, `Int`/`BIGINT`); all arithmetic
   uses integer math. No JS floats for money anywhere.
5. **Time is UTC** (`timestamptz`); the timezone name (`Africa/Nairobi`) is stored
   where human interpretation matters and all rendering converts in the client.
6. **Explicit state machines** for bookings, payments, deposits, payouts and
   verifications. UI can never write status columns directly.
7. **Append-only financial records.** Ledger entries, audit logs and status history
   are immutable; corrections are reversing/adjusting records.
8. **Provider adapters behind interfaces.** M-Pesa, cards, SMS, email, maps, KYC,
   object storage and analytics each have a port + sandbox/mock adapter. Mocks are
   hard-blocked when `NODE_ENV=production`.
9. **Security & correctness first.** Server RBAC on every mutating endpoint,
   idempotency keys on financial operations, webhook signature verification,
   signed URLs for private documents.

## 2. Repository layout (Turborepo, npm workspaces)

```
apps/
  api/            NestJS modular monolith (REST, versioned /api/v1)
  web/            Next.js customer + host PWA
  admin/          Next.js internal operations console
packages/
  types/          Shared enums, DTO contracts, Zod schemas, constants
  ui/             Hiregari design system (React + Tailwind)
  config/         Shared config (design tokens, eslint, tailwind preset)
  testing/        Embedded-Postgres test harness & factories
scripts/          Local embedded-postgres control
docs/             Architecture & decision records (this folder)
```

## 3. Backend module map

```
core/        config, logging (correlation IDs), errors, pagination, ids (HG-xxxxx)
auth/        sessions (httpOnly cookies), phone OTP, email verification, OAuth ports
users/       accounts, customer profiles, addresses, consent
rbac/        roles, permissions, guards, staff membership scoping
hosts/       host profiles, businesses, business members, staff invites
verification/ driver verification (KYC port), host/business document review
vehicles/    wizard, images, documents, features, specs, status workflow
locations/   hierarchical Kenyan locations, geocoding port
search/      search API, filters, sorting, faceting
availability/ blocks, maintenance, buffers, conflict detection, holds
pricing/     pricing engine, cancellation math, commission (pure, table-tested)
quotes/      server quotes w/ expiry + revalidation
bookings/    booking aggregate, state machine, timeline, extensions, cancel
payments/    payment ports (M-Pesa STK, card), intents, reconciliation
webhooks/    signed, idempotent provider event intake + outbox-driven effects
deposits/    deposit lifecycle & reservation logic
refunds/     refund requests & provider execution
ledger/      immutable double-entry ledger + postings
payouts/     payout scheduling, eligibility rules, provider port
inspections/ pickup/return handover, photos, odometer/fuel, diff
damage/      damage claims & evidence
disputes/    dispute casework
incidents/   accident/breakdown/theft/safety reports
reviews/     verified reviews only + moderation
messaging/   conversations, messages, system messages, attachments
notifications/ event bus → email/SMS/WhatsApp/push ports + templates
promotions/  promo codes & redemptions
admin/       operational queues & admin actions (all audited)
audit/       audit log writer & query API
analytics/   funnel events, KPI rollups, PostHog port
queue/       in-process worker runner; BullMQ/Redis swap in production
storage/     S3-compatible object storage port + local-disk dev adapter
health/      liveness/readiness, queue depth, dependency checks
```

Cross-module calls go through service interfaces exported from a module's
`public/` barrel; modules never reach into another module's Prisma models
directly except via its service.

## 4. Request lifecycle

```
HTTP
 → correlation-id middleware
 → global validation pipe (ZOD DTOs)
 → auth guard (session cookie / bearer)
 → permission guard (@RequirePermission)
 → idempotency guard (Idempotency-Key on money endpoints)
 → controller (thin) → domain service (transactional)
 → Prisma ($transaction, SERIALIZABLE/row locks/advisory locks where required)
 → domain events (in-process bus) → notifications/ledger/audit/queue
 → uniform error envelope
```

## 5. Key flows (sequence summaries)

### 5.1 Search → quote → hold → booking

1. `GET /v1/vehicles/search?location&pickupAt&returnAt&...` runs the
   availability query (confirmed bookings + unexpired holds + blocks + maintenance
   + buffers + min duration + eligibility), returns eligible vehicles.
2. `POST /v1/quotes` re-checks availability and prices server-side; quote expires
   (default 15 min, configurable).
3. `POST /v1/bookings` (with `quoteId` + `Idempotency-Key`): inside one
   SERIALIZABLE transaction: revalidate quote → revalidate availability →
   `pg_advisory_xact_lock(hashtext(vehicleId))` → upsert hold → create booking
   (PENDING_HOST / PAYMENT_PENDING) + immutable price snapshot + status history.
4. Payment intent via adapter; browser redirect is **never** trusted.
5. Provider webhook → signature check → stored as `PaymentWebhookEvent`
   (deduplicated by provider event id) → idempotent state transition → booking
   transition + ledger postings + notifications via event handlers.

### 5.2 Double-booking prevention

* Confirmed-overlap prevention at three layers:
  1. Temporal range query excluding vehicles with overlapping
     confirmed/booked intervals, blocks, maintenance, and unexpired holds.
  2. Transaction-level advisory lock per vehicle during booking creation.
  3. Partial exclusion constraint using a Postgres `btree_gist` exclusion
     constraint over `(vehicle_id, booking_range)` for confirmed ranges;
     holds/blocks are constrained by the same mechanism on their own tables.
* Final booking creation revalidates the quote and the hold.

### 5.3 Inspections → completion → money

Pickup inspection (photos, odometer, fuel, both-party acknowledgement) moves
CONFIRMED → ACTIVE. Return inspection computes distance, late duration, fuel
state; adjustments (excess mileage, late, fuel, damage) are proposed, reviewed
where required, deposit is resolved (released/partially deducted/deducted),
ledger postings created, booking COMPLETED, payout eligibility clock starts,
review requests fire.

## 6. Frontend architecture

* Next.js 15 App Router, React 19, TypeScript, Tailwind 3.4, mobile-first.
* `apps/web` serves marketplace + renter dashboard + host dashboard under
  route groups `(market)`, `(renter)`, `(host)`; `apps/admin` is separate.
* Data: server components for read/SEO surfaces; a typed REST client
  (`packages/types` contracts) for mutations; RSC-proxied API calls keep the API
  host private and cookies same-origin.
* PWA: manifest, service worker, offline shell, install prompt.
* Images: server-side image pipeline (Next/Image + object storage), AVIF/WebP,
  responsive sizes; never serve raw uploads to mobile.

## 7. Environments & configuration

| Env | DB | Queue | Providers |
|---|---|---|---|
| local | embedded PostgreSQL (npm) or docker-compose | in-process | sandbox/mock adapters |
| staging | managed PG 16 + Redis | BullMQ | provider sandbox keys |
| production | managed PG 16 (HA, PITR) + Redis (HA) | BullMQ | live keys; mock adapters refused at boot |

Config is validated with Zod at bootstrap; missing required config fails fast.
See [10-environment-variables.md](./10-environment-variables.md).

## 8. Observability

* Structured JSON logs (`pino`) with `correlationId`, `userId`, `bookingRef`.
* Sentry port; health `/health/live` `/health/ready`; metrics for API latency,
  queue failures, webhook failures, payment failure rates, search latency.
* Financial reconciliation job: payments ↔ ledger ↔ bookings, alerts on drift.

## 9. Scale & expansion

Locations, currency and phone-country are data, not code: Nairobi seed data
ships, but the location hierarchy and pricing currency columns allow expansion
to other Kenyan counties without schema changes. Multi-country/multi-currency is
explicitly out of the MVP (spec §60) and not pre-built.
