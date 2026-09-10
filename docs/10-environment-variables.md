# Environment Variables

Validated at bootstrap (`apps/api/src/core/config`): the API refuses to boot
in production with mock adapters enabled or secrets missing. `.env.example`
is the canonical list; never commit real secrets.

## Core
| Var | Example | Notes |
|---|---|---|
| `NODE_ENV` | `development` | development/staging/production |
| `PORT` | `4000` | API port |
| `API_BASE_URL` | `http://localhost:4000` | |
| `WEB_BASE_URL` | `http://localhost:3000` | used in emails/redirects |
| `ADMIN_BASE_URL` | `http://localhost:3002` | |
| `TZ_DB_NAME` | `Africa/Nairobi` | display tz; storage always UTC |
| `DEFAULT_CURRENCY` | `KES` | |

## Database / cache / queue
`DATABASE_URL` (required; e.g. postgresql://hiregari:hiregari@127.0.0.1:55432/hiregari),
`PGSSLMODE` (prod `require`), `REDIS_URL` (optional in dev; required with
BullMQ in staging/prod), `QUEUE_DRIVER` = `inline` (dev) | `bullmq`.

## Auth / security
`SESSION_SECRET` (32+ bytes; fail in prod if default), `SESSION_TTL_HOURS=720`,
`OTP_TTL_SECONDS=300`, `OTP_MAX_ATTEMPTS=5`, `OTP_RATE_LIMIT_PER_HOUR=5`,
`ARGON2_PEPPER` (optional server pepper), `GOOGLE_CLIENT_ID/SECRET`,
`GOOGLE_ENABLED=false`, `APPLE_ENABLED=false` (port only),
`ADMIN_MFA_REQUIRED=true`, `CSRF_ENABLED=true`,
`CORS_ORIGINS` (csv of web/admin origins),
`ENCRYPTION_KEY` (32-byte base64, for KMS field encryption of IDs/PINs),
`RATE_LIMIT_REDIS` (falls back in-memory dev).

## Storage
`STORAGE_DRIVER` = `local` | `s3`, `STORAGE_LOCAL_PATH=./uploads`,
`S3_ENDPOINT`, `S3_REGION=eu-north-1` (or af-south-1 etc.), `S3_BUCKET_PRIVATE`,
`S3_BUCKET_PUBLIC`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`,
`SIGNED_URL_TTL_SECONDS=300`, `MAX_UPLOAD_MB=8`,
`UPLOAD_ALLOWED_MIME=image/jpeg,image/png,image/webp,application/pdf`.

## Payments — **sandbox only outside production**
`PAYMENT_DRIVER` = `mock` | `mpesa-daraja` | (card provider key),
`MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_SHORTCODE`,
`MPESA_PASSKEY`, `MPESA_ENV` = `sandbox` | `production`,
`MPESA_CALLBACK_BASE_URL` (publicly reachable in sandbox),
`MPESA_B2C_SHORTCODE/INITIATOR/PASSWORD` (payouts),
`CARD_PROVIDER` = `mock` | `flutterwave` | `stripe` (tokenized hosted only),
`CARD_PUBLIC_KEY`, `CARD_SECRET_KEY`, `CARD_WEBHOOK_SECRET`,
**Mock driver refuses to boot when NODE_ENV=production.**

## Business rules (configurable; see business/legal decisions doc)
`COMMISSION_BPS` (placeholder 1500 = 15%; host-side; flagged BLED-001),
`RENTER_SERVICE_FEE_BPS` (default 0; renter-side fee — see BLED-028),
`DEPOSIT_RULE=FIXED`, `DEPOSIT_FIXED_CENTS`, `DEPOSIT_PERCENT_BPS`,
`DEPOSIT_RELEASE_HOURS`, `QUOTE_TTL_MINUTES=15`, `HOLD_TTL_MINUTES=15`,
`HOST_REQUEST_TIMEOUT_MINUTES`, `PAYMENT_WINDOW_MINUTES`,
`PAYOUT_COOLDOWN_HOURS`, `MIN_DRIVER_AGE`,
`CANCELLATION_FLEXIBLE_BPS/MODERATE_BPS/...` (policy tables override),
`DOC_EXPIRY_REMINDER_DAYS=30,14,3`.

## Communications
`SMS_DRIVER` = `mock`|`twilio`|`africastalking`, `SMS_*` keys,
`EMAIL_DRIVER` = `mock`|`resend`|`postmark`, `EMAIL_FROM`, `EMAIL_API_KEY`,
`WHATSAPP_ENABLED=false`, `PUSH_ENABLED=false`,
`SUPPORT_EMAIL`, `SUPPORT_PHONE_E164`, `SUPPORT_WHATSAPP_E164`.

## Integrations
`MAPS_DRIVER` = `mock`|`google`|`mapbox`, `MAPS_API_KEY`,
`KYC_DRIVER` = `manual`|`<provider>`, `KYC_API_KEY` (no gov API assumptions),
`ANALYTICS_DRIVER` = `posthog`|`noop`, `POSTHOG_KEY/HOST`,
`SENTRY_DSN`, `SENTRY_ENVIRONMENT`.

## Observability / ops
`LOG_LEVEL=info`, `LOG_FORMAT=json`, `RECONCILE_INTERVAL_MINUTES=30`,
`BACKUP_SCHEDULE` (ops), `WEBHOOK_MAX_ATTEMPTS=8`,
`DEMO_SEED=false` (must be false/unseeded in production; seed runner refuses
when NODE_ENV=production unless ALLOW_DEMO_SEED=true for staging restores).
