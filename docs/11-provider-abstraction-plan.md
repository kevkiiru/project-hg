# Integration / Provider Abstraction Plan

Every external dependency sits behind a TypeScript port in
`apps/api/src/integrations/<domain>/<domain>.port.ts`, with a sandbox/mock
adapter selected by config. Factory functions throw on production + mock.

| Domain | Port | Adapters | Boundary notes |
|---|---|---|---|
| M-Pesa payments | `PaymentProviderPort` (`initiateStkPush`, `queryStatus`, `verifyWebhook`, `parseWebhook`, `refund`) | `MpesaDarajaAdapter`, `MockMpesaAdapter` (simulates async callback via queue) | OAuth token cache; callback base URL config; no credentials in logs |
| Card payments | `CardPaymentPort` (`createHostedCheckout`, `tokenizeWebhook`, `capture`, `void`, `refund`) | `MockCardAdapter`, provider adapter (Flutterwave/Stripe-class) | PCI scope zero: redirect/hosted fields only; no PAN ever on our infra |
| Payouts | `PayoutPort` (`transfer`, status query, webhook parse) | M-Pesa B2C adapter, bank/manual adapter (ops records reference) | double-entry ledger regardless of provider |
| SMS (OTP) | `SmsPort` (`send`) | `MockSmsPort` (dev inbox endpoint), Africa's Talking/Twilio | OTP codes never in provider metadata; dev logs only in non-prod |
| Email | `EmailPort` (`send`, `sendTemplate`) | `MockEmailPort`, Resend/Postmark | templates server-rendered; unsubscribe headers |
| WhatsApp | `ChatPort` prepared | none enabled | config flag; no business flow depends on it |
| Push | `PushPort` prepared | none enabled | web-push later |
| Maps/geocoding | `GeoPort` (`geocode`, `reverse`, `distanceKm`, static map) | `NominatimFreePort` (optional), Google/Mapbox, `MockGeoPort` | Nairobi location seed works offline |
| KYC/identity | `KycPort` (`submitIdentity`, `submitLiveness`, `getStatus`) | `ManualOnlyKycPort` (default), provider adapter later | **No NTSA/gov integrations without authorized access**; manual review always works |
| Object storage | `StoragePort` (`putSignedUrl`, `getSignedUrl`, `delete`, publicUrl) | `LocalDiskAdapter`, `S3Adapter` | docs/IDs/inspections PRIVATE bucket; processed gallery PUBLIC |
| Queues | `QueuePort` (`add`, `repeatable`, handlers) | `InlineQueueAdapter` (in-process), `BullMqAdapter` (Redis) | at-least-once; handlers idempotent; dead-letter + alerts |
| Analytics | `AnalyticsPort` (`track`, `identify`) | `NoopAnalytics`, `PostHogAdapter` | server events + client token; PII minimized |
| Errors | `ErrorReporterPort` | `Noop`, Sentry | PII/financial secrets stripped |
| OAuth | `OAuthPort` | Google; Apple prepared | normalized profile → account linking |

## Mock adapter rules

1. Mocks are opt-in via `*_DRIVER=mock`; boot config validator **throws** if a
   money/identity mock is selected under `NODE_ENV=production`.
2. The mock M-Pesa flow enqueues a realistic delayed callback (success or
   failure configurable per test scenario) so the whole async/idempotency path
   is exercised; a dev endpoint allows simulating duplicate/out-of-order
   callbacks.
3. Mock providers are clearly labelled in logs and UI (dev banner).
4. Credentials needed for live adapters are listed in
   `10-environment-variables.md`; missing credentials never block unrelated
   work.

## File/photo pipeline

Upload → signed URL (private bucket) → malware/type/size validation → image
pipeline (EXIF strip, AVIF/WebP derivatives, responsive widths) → gallery uses
public derivatives; original documents stay private with short-lived signed
URLs and audit-logged views.
