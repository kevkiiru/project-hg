# Deployment & Operations

## Environments (spec §65)

### Local
1. `npm install`
2. `npm run db:start` (embedded PostgreSQL on :55432; or `docker compose up -d`)
3. `cp .env.example .env` (DATABASE_URL matches embedded port)
4. `npm run db:push && npm run db:seed`
5. `npm run dev` — api :4000, web :3000, admin :3002

Mock adapters simulate SMS/email (dev inboxes) and M-Pesa (dev callback tool).

### Staging
Managed PostgreSQL 16 + Redis; provider **sandbox** credentials;
`PAYMENT_DRIVER=mpesa-daraja` with sandbox, `MPESA_ENV=sandbox`;
migrations via CI `prisma migrate deploy`; weekly restore drill.

### Production
Managed PostgreSQL 16 (HA, PITR, backups ≥ retention from BLED-020), Redis HA,
S3-compatible private+public buckets, queues BullMQ, live provider creds in
secret manager; boot guard refuses mock money adapters.

## Release & migrations
* Prisma Migrate; every PR with a schema change includes a migration; expand/
  contract for destructive changes; `migrate deploy` in the release pipeline;
  rollback = forward-compatible fix + compensating migration (never edit
  applied migrations).
* Zero-downtime: multiple API instances behind a load balancer; workers scale
  separately; health checks gate rollout.

## Backups & reliability (spec §66)
* Automated daily backups + continuous WAL/PITR where available; monthly
  restore drill with timed RTO/RPO log.
* Health: `/health/live` (process) and `/health/ready` (DB/queue/storage).
* Queues: retry with exponential backoff, dead-letter set, alerting threshold;
  reconciliation job every 30 minutes; webhook re-drive tool in admin.

## Observability (spec §67)
* pino JSON logs; correlation id on every request; booking refs logged at
  boundaries; Sentry error sink; metrics/alerts for: API 5xx, payment
  failures, webhook failures, queue DLQ, OTP failures, search latency,
  DB latency, upload failures, external provider timeouts.

## Security at deploy
TLS 1.2+ only, HSTS, CSP, secure cookies, least-privilege DB roles,
object storage private ACL + signed URLs, secrets rotation,
dependency scanning, audit log export, admin IP allowlist option + MFA.

## CI (recommended)
install → typecheck → lint → unit/integration tests (embedded PG) → build apps
→ migration diff check → E2E (Playwright) → deploy.
