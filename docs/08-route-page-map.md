# Route / Page Map

## apps/web (customer + host) — Next.js App Router

### Marketplace `(market)`
| Route | Page |
|---|---|
| `/` | Homepage: hero search, popular cars, categories, how it works, why us, locations, hosts, reviews, host CTA, FAQs, footer |
| `/cars` | Search results: list/map-ish cards, filters, sort, mobile filter drawer, zero-result state, skeleton loaders |
| `/cars/[slug]` | Vehicle detail (SEO): gallery, quote widget, price breakdown, specs, features, requirements, policy, host card, reviews, calendar |
| `/cars/nairobi`, `/cars/nairobi/[category]`, `/cars/nairobi/[make]` | SEO landing pages (bounded, curated — no thin pages) |
| `/locations/[slug]` | Location landing (JKIA, Wilson, Westlands...) |
| `/categories/[category]` | Category browse |

### Booking/checkout `(booking)`
| `/bookings/new?vehicle=&pickupAt=...` | Review dates/delivery/extras, login gate |
| `/checkout/[quoteRef]` | Quote summary + breakdown, verification gate, M-Pesa/card payment, processing state |
| `/checkout/[quoteRef]/mpesa` | STK push status screen (poll, never trust redirect) |
| `/bookings/[reference]` | Booking detail + BookingTimeline, payment state, pickup info, actions |
| `/bookings/[reference]/cancel` | Cancellation policy + refund preview |
| `/bookings/[reference]/pickup` | Pickup inspection: odometer, fuel, InspectionPhotoGrid, sign |
| `/bookings/[reference]/return` | Return inspection, damage/late/mileage summary |
| `/bookings/[reference]/incident` | Report an incident |
| `/bookings/[reference]/review` | Post-completion review |

### Account `(account)`
| `/auth/phone` `/auth/otp` `/auth/email` `/auth/callback/google` | Auth |
| `/verify` | Driver verification wizard (identity, licence, selfie, status) |
| `/dashboard` | Renter home: upcoming, active, history, tasks |
| `/dashboard/bookings` `/dashboard/bookings/[reference]` | Booking management |
| `/dashboard/payments` | Payments, refunds, deposits |
| `/dashboard/messages` `/dashboard/messages/[id]` | Conversations |
| `/dashboard/reviews` | Reviews to give / given |
| `/dashboard/profile` | Profile, privacy & data controls, consents |
| `/dashboard/support` `/help` `/help/[slug]` `/support/contact` | Support |

### Host `(host)`
| `/host` | Overview: tasks, upcoming, active, requests, earnings, utilization |
| `/host/onboarding` | Individual/business onboarding wizard + verification docs |
| `/host/vehicles` | Fleet list (statuses), archive/pause |
| `/host/vehicles/new` `/host/vehicles/[id]/edit` | 10-step listing wizard |
| `/host/calendar` | Fleet calendar: bookings, blocks, maintenance |
| `/host/bookings` filters `/host/bookings/[reference]` | Requests accept/decline, details |
| `/host/earnings` | Gross, commission, net, payouts, statements |
| `/host/reviews`, `/host/messages`, `/host/inspections/[reference]` | Operations |
| `/host/settings` | Business, delivery zones, staff, documents, payout details |

### Static / legal / PWA
`/about`, `/how-it-works`, `/terms`, `/privacy` (DPA notice + consent),
`/cancellation-policy`, `/insurance-note` (human-reviewed; placeholders
marked REQUIRES BUSINESS/LEGAL DECISION), `/manifest.webmanifest`,
`/robots.txt`, `/sitemap.xml`.

## apps/admin — Next.js App Router (internal)

| Route | Purpose |
|---|---|
| `/login` `/mfa` | Admin auth + MFA |
| `/` | Operational queues dashboard (pickups/returns today, overdue, pending verifications/approvals, failed payments, refunds, disputes, payouts, expiring docs) |
| `/users`, `/users/[id]` | Users, roles, risk events, suspensions |
| `/hosts`, `/hosts/[id]` | Host verification queue, business docs, decisions |
| `/drivers` | Driver verification queue + document viewers (signed URLs) |
| `/vehicles`, `/vehicles/[id]` | Approval queue, documents, suspend/archive |
| `/documents` | All documents, expiry queue |
| `/bookings`, `/bookings/[reference]` | Booking inspector: timeline, payments, ledger links |
| `/payments`, `/refunds`, `/deposits` | Money ops; refund initiation (reason mandatory) |
| `/ledger` | Posting groups, accounts, reconciliation status |
| `/payouts` | Runs, approve/release holds, failures |
| `/disputes`, `/disputes/[id]` | Casework with evidence viewer |
| `/incidents` | Incident queue |
| `/reviews` | Moderation |
| `/promotions`, `/content` | Promo codes, FAQs, locations |
| `/notifications/blast` | Operational notifications (guarded) |
| `/audit` | Audit log search |
| `/risk` | Manual review queue with explainable signals |
| `/analytics` | Funnel + KPI dashboards |

## API surface (v1) — see `09-api-specification.md`
REST under `/api/v1`, JSON, cookie sessions, `Idempotency-Key` on POST money
routes, webhooks under `/api/v1/webhooks/...` (signature, no session).
