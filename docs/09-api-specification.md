# API Specification (v1)

REST, base path `/api/v1`, JSON. Versioned via URL; a global `Api-Version`
response header is returned. Validation with Zod; consistent error envelope:

```json
{
  "error": {
    "code": "VEHICLE_NOT_AVAILABLE",
    "message": "This car is no longer available for the selected dates.",
    "details": [{ "path": "returnAt", "message": "..." }],
    "status": 409
  },
  "correlationId": "req_01H..."
}
```

Success envelopes use `{ "data": ... }`; lists use
`{ "data": [], "page", "pageSize", "total" }`. Money is always
`{ "amountCents": 500000, "currency": "KES" }`. Datetimes ISO-8601 UTC.

Auth: httpOnly `hg_session` cookie; CSRF: double-submit for cookie-mutating
requests (header `X-CSRF-Token`). Service tokens for webhooks use signatures,
not cookies. Rate limits via `Authorization`/IP buckets (OTP especially).

## Auth & account
| Method/Path | Notes |
|---|---|
| `POST /auth/register` | email or E.164 phone; rate limited |
| `POST /auth/otp/request` | body `{ channel: SMS\|EMAIL, to, purpose: LOGIN\|VERIFY_PHONE\|... }` |
| `POST /auth/otp/verify` | `{ challengeId, code }` → session; OTP expiry/attempt limits |
| `POST /auth/email/request-verification` | |
| `POST /auth/email/verify` | token link |
| `POST /auth/password/set` `POST /auth/login` | password (argon2id), optional in MVP flow |
| `GET /auth/google` `GET /auth/google/callback` | OAuth 2 (Apple port prepared, not enabled) |
| `POST /auth/logout` | revokes session |
| `GET /account` `PATCH /account` | profile; sensitive fields require reauth |
| `GET /account/privacy` `POST /account/privacy/consent` `POST /account/delete-request` | DPA controls |
| `GET /account/driver-verification` `POST /driver-verifications` `POST /driver-verifications/:id/documents` |

## Hosts / businesses
| | |
|---|---|
| `GET /host/me` `POST /host/onboarding` `PATCH /host/me` | individual or business profile |
| `POST /host/documents` | private upload, signed PUT URL |
| `POST /host/submit-verification` | PENDING → ops/verification queue |
| `GET /businesses/:id` (scope) `PATCH /businesses/:id` | |
| `POST /businesses/:id/members` `PATCH /members/:id` `DELETE /members/:id` | staff |

## Vehicles
| | |
|---|---|
| `POST /vehicles` | creates DRAFT (wizard step 1) |
| `GET /vehicles/mine` `PATCH /vehicles/:id` (scope) | wizard steps |
| `POST /vehicles/:id/images` (signed urls) `POST /vehicles/:id/documents` | |
| `PUT /vehicles/:id/pricing` `PUT /vehicles/:id/availability` | |
| `POST /vehicles/:id/submit` | DRAFT/REJECTED → PENDING_REVIEW |
| `POST /vehicles/:id/pause` `POST /vehicles/:id/archive` | approved states → SUSPENDED/ARCHIVED |
| `GET /vehicles/search` | see Search |
| `GET /vehicles/:slug` | public, SEO payload incl. reviews, availability |
| `GET /vehicles/:id/availability?from&to` | calendar grid (unavailable dates + price overrides) |
| `POST /availability/blocks` `DELETE /availability/blocks/:id` | host |

## Search
`GET /vehicles/search?location=westlands&lat&lng&pickupAt=ISO&returnAt=ISO
&returnLocation=&minPriceCents=&maxPriceCents=&category=&make=&transmission=
&seats=&fuel=&instantBook=&delivery=&selfDrive=&chauffeur=&fourWheelDrive=
&ac=&sort=RECOMMENDED|PRICE_ASC|PRICE_DESC|RATING|NEWEST&page&pageSize&facets=1`
Returns eligible vehicles with facets; zero-result analytics event.

## Quotes, bookings
| | |
|---|---|
| `POST /quotes` | `{ vehicleId, pickupAt, returnAt, tz:'Africa/Nairobi', pickupOption, deliveryZoneId, extras:[{code,qty}], promoCode? }` → Quote with items + expiry |
| `POST /bookings` | `{ quoteId, mode? }` + `Idempotency-Key`; hold + snapshot + state |
| `GET /bookings/:reference` | party/scope read |
| `GET /bookings/mine` | renter |
| `GET /host/bookings?status=` | host |
| `POST /bookings/:reference/respond` | host `{ accept: bool }` (PENDING_HOST) |
| `POST /bookings/:reference/extension` | request extension → quote |
| `POST /bookings/:reference/cancel` | `{ reason }`, policy executed server side |
| `GET /bookings/:reference/timeline` | status history |

## Payments / webhooks
| | |
|---|---|
| `POST /payments/mpesa` | `{ bookingRef, purpose: RENTAL\|DEPOSIT, phoneE164 }` → CREATED/PENDING + instructions |
| `POST /payments/card/intent` | hosted/tokenized intent; no card data to API |
| `GET /payments/:reference` | status (polling only) |
| `POST /webhooks/payments/mpesa` | raw body; Daraja signature; idempotent |
| `POST /webhooks/payments/card` | provider signature; idempotent |
| `POST /payments/reconcile` (internal, cron/worker) | stuck intents |

## Inspections, operations
| | |
|---|---|
| `POST /bookings/:reference/pickup` | odometer, fuel, notes, signed flags; photos via signed uploads |
| `POST /bookings/:reference/pickup/acknowledge` | counterparty sign |
| `POST /bookings/:reference/return` | same + actual return time |
| `POST /bookings/:reference/incident` | category, description, location, photos, police ref |
| `POST /bookings/:reference/damage` | host damage claim + evidence |
| `GET /bookings/:reference/adjustments` `POST /admin/.../adjustments/:id/approve` | |

## Reviews / messaging / support
`POST /reviews` (completed only, one per subject), `POST /reviews/:id/report`,
`GET /conversations`, `POST /conversations`, `POST /conversations/:id/messages`
(text/image; system messages generated internally), `POST /support/requests`.

## Admin (role-guarded, audited)
`GET /admin/queues`, `GET /admin/hosts?status=PENDING`,
`POST /admin/hosts/:id/verify` `{ decision, reason }`, driver equivalents,
`POST /admin/vehicles/:id/approve|reject|suspend`, documents verify,
`GET /admin/bookings`, `GET /admin/payments`, `POST /admin/refunds`,
`POST /admin/deposits/:id/resolve`, `GET /admin/ledger?account=&from&to`,
`GET /admin/payouts`, `POST /admin/payouts/:id/release|retry`,
dispute actions, `GET/POST /admin/promotions`, content CRUD,
`GET /admin/audit?entityType=&entityId=&actorId=`, risk queue actions,
`GET /admin/analytics/funnel&kpis`.

## Notifications
`GET /notifications`, `PATCH /notifications/:id/read`,
preferences `GET/PUT /notifications/preferences`; delivery is event-driven
server-side (no client-required send path).

## Status codes
200 ok · 201 created · 202 accepted (async) · 400 validation · 401 · 403 ·
404 · 409 conflict (illegal transition / not available) · 410 quote expired ·
422 semantic validation · 429 rate limited · 500 with correlation id only.
