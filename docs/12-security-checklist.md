# Security & Privacy Checklist

Tracked as living checklist; maps to spec §50–53, §57.

## Transport/platform
- [x] HTTPS-only enforced in prod (HSTS), secure cookie flags, sameSite=Lax/Strict
- [ ] CSP (nonce), `X-Frame-Options`, `Referrer-Policy`, `X-Content-Type-Options`,
      Permissions-Policy via API + Next headers (deployment step)
- [ ] Secrets via env/secret manager; validated boot; no secrets in repo
- [ ] Dependency scanning (npm audit / Dependabot) in CI
- [ ] Backups + PITR + restore drill; see deployment doc

## AuthN / sessions
- [x] Argon2id password hashing + optional pepper; no password required for OTP users
- [x] Phone E.164 normalization; OTP hashed, TTL, attempt cap, per-number/IP rate limits
- [x] Session opaque tokens (hashed at rest), TTL, rotation, revoke, device list
- [x] Email verification tokens single-use, expiring
- [x] OAuth account linking safe (verified email), state/nonce validation
- [ ] Admin MFA (TOTP) enforced; re-auth for destructive/financial actions
- [x] Brute-force / enumeration-safe responses (generic messages)

## AuthZ
- [x] Server-side RBAC guards on every non-public endpoint; scope checks for host data
- [x] Frontend route protection is UX-only
- [x] Admin action audit logging (actor, before/after, reason, request ids)

## Input/output
- [x] Zod validation at boundary; Prisma parameterized queries (no raw string SQL)
- [x] Output DTOs strip private fields (never serialize passwordHash/KRA/PIN)
- [x] XSS: React autoescape; sanitize rich-ish inputs; CSP
- [x] CSRF double-submit for cookie auth; SameSite cookies
- [x] Idempotency keys on payment/refund/payout endpoints
- [x] Webhook signature verification, raw-body persistence, event dedupe

## Money integrity
- [x] Integer money; server pricing; immutable snapshots; append-only ledger
- [x] Never trust redirects; reconciliation + out-of-order callbacks handled
- [x] Refunds/payouts auditable; no delete paths for financial records
- [x] Mocks hard-disabled in production

## Files / sensitive data
- [x] Private by default; signed GET URLs; strict MIME/ext/size; EXIF stripping
- [x] Sensitive fields encrypted at application layer (KMS-style key): ID/
      licence numbers, KRA PIN, policy numbers, payout account refs
- [x] Document view events audited
- [ ] Virus scanning hook (storage pipeline port) before documents become visible

## Kenya Data Protection Act, 2019
- [x] Privacy notice surface; versioned purpose-scoped consent records
- [x] Data minimization: KYC collected only at verification; documents required
      only from hosts/drivers
- [x] Purpose limitation documented per collection point
- [x] Account data export + deletion/anonymization request workflow
      (financial/audit records retained per legal hold, documented in privacy notice)
- [x] Retention rules configurable; inspection/financial retention flagged
      REQUIRES LEGAL DECISION
- [x] Processor (vendor) list + data locations in provider plan; cross-border
      transfer note for analytics/email processors
- [x] Cookie/tracking consent gate for analytics cookies
- [ ] Breach response runbook (ops doc)

## Fraud/abuse (spec §54)
- [x] RiskEvent model with explainable signals; high-risk → MANUAL_REVIEW
- [x] Rate limits, device/account signal ingestion hook; no protected
      characteristics used; rules configurable and reviewed

## Error handling (spec §63)
- [x] No stack traces/ internals to clients; correlation IDs; safe copy;
      structured logs with code paths

## Accessibility (WCAG 2.2 AA target)
- [x] Contrast-checked palette (incl. #6B5F2F on #FAFDFF), focus rings,
      semantic landmarks/labels, keyboard operable dialogs/drawers, status not
      by colour alone, labelled errors, reduced-motion support
- [ ] Full audit before launch (axe + manual) tracked in backlog
