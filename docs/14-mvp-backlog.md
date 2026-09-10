# MVP Implementation Backlog

Phased per spec §68. `[x]` built in this codebase drop, `[~]` partial/port+
manual flow, `[ ]` post-MVP.

## Phase 0 — Foundation [x]
- Monorepo (api/web/admin/types/ui/config/testing), TS, lint/format
- Docs: architecture, ERD, state machines x4, RBAC, routes, API, env,
  providers, security, testing, deployment, BLED register
- Design tokens + design system skeleton
- Prisma schema + first migration, embedded-PG dev workflow, seed framework
- Error envelope, correlation id, config validation, health checks

## Phase 1 — Marketplace foundation [x]/[~]
- Auth: phone OTP (mock SMS), email verify, Google port, sessions, rate limits [x]
- Customer profiles, consents, privacy endpoints [x]
- Host onboarding (individual/business), documents upload (signed, local+s3) [x]
- Verification queues + manual decisions (KYC port = manual) [x]
- Vehicle wizard (10 steps), images, docs, pricing, policies, extras [x]
- Admin host/driver/vehicle approval queues [x]
- Search incl. temporal availability + filters/sorts/facets [x]
- Vehicle SEO page + availability calendar [x]
- Locations hierarchy + Nairobi seed [x]

## Phase 2 — Transactions [x]/[~]
- Pricing engine + quotes (expiry/revalidation) [x]
- Booking state machine + holds + concurrency (advisory lock + exclusion) [x]
- Request-to-book [x]; Instant Book eligibility rules [x]
- Payment ports + Mock M-Pesa STK async flow + mock card; Daraja adapter skeleton [~]
- Webhook intake: signature, idempotency, out-of-order/dup, event log [x]
- Reconciliation worker [x]
- Deposits lifecycle [x]; cancellation engine + refunds [x]
- Ledger double-entry (immutable) [x]; payouts tracking + eligibility [x]
- Promo codes [x]

## Phase 3 — Rental operations [x]
- Driver verification gating [x]; pickup/return inspections + photos [x]
- Odometer/mileage, fuel policies, late return computation [x]
- Booking adjustments [x]; extensions data model + conflict check [x]/[~ action UI]
- Damage claims, incident reports [x]

## Phase 4 — Trust [x]/[~]
- Reviews (verified-only, both directions, moderation queue) [x]
- Messaging (system messages, controlled attachments, privacy gating) [x]
- Notifications event bus + email/SMS mock channels; WhatsApp/push ports [~]
- Cancellation workflows (policy engine) [x]
- Disputes workflow [x]; risk events + manual review queue [x]

## Phase 5 — Launch hardening [~]
- Analytics events + KPI rollups (PostHog port/noop) [x]
- SEO: metadata, sitemap, robots, OG, JSON-LD, slugs [x]
- Accessibility pass (labels, focus, contrast) [~] final audit [ ]
- Performance: image derivatives, lazy loading, caching headers [~]
- Security review, headers/CSP, MFA for admins [~]/[ ] (MFA flow scaffolded)
- Playwright E2E critical journeys [~] (core API integration suites first)
- Monitoring/alerts, backup restore drill [~] docs; infra setup [ ]

## Explicit exclusions (spec §60)
No native apps, crypto, keyless, telematics, auctions, loyalty, subscriptions,
cross-border, AI chatbot/dynamic pricing, automated insurance claims, fleet
ERP, full chauffeur marketplace.
