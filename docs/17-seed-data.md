# Seed Data

Runner: `apps/api/prisma/seed.ts` (`npm run db:seed`). Refuses to run with
`NODE_ENV=production` unless `ALLOW_DEMO_SEED=true` (staging restores only).
All rows carry `isDemoData` flags where supported; demo payments/ledger
entries are created in local/staging only.

## Accounts (dev)

| Role | Phone / email | OTP/password |
|---|---|---|
| Renter | +254700000001 / renter@hiregari.dev | code in dev SMS inbox / `Password123!` |
| Renter 2 (unverified) | +254700000002 | dev inbox |
| Host (company, verified) | +254711000001 / host@hiregari.dev | `Password123!` |
| Host staff | +254711000002 | dev inbox |
| Pending host | +254711000099 | approval-queue demo |
| Super admin | admin@hiregari.dev | `Admin123!` (MFA enforced outside dev) |
| Operations / Finance / Verification | ops@, finance@, verify@hiregari.dev | `Admin123!` |

Dev OTP: with `SMS_DRIVER=mock` the code is printed in API logs and at
`GET /api/v1/dev/otp?to=...` (dev-only, disabled in production).

## Locations
Westlands, Kilimani, Karen, Lavington, Nairobi CBD, JKIA, Wilson Airport
(county = Nairobi) with lat/lng; delivery zones JKIA / Wilson.

## Vehicles (KES/day placeholders, seeded with valid docs)
Toyota Vitz (Economy, 4,500), Mazda Demio (Economy, 4,800), Toyota Axio
(Sedan, 6,000), Toyota Fielder (Sedan, 6,500), Toyota RAV4 (SUV, 9,500),
Mazda CX-5 (SUV, 9,000), Toyota Prado (4x4, 14,000), Nissan X-Trail
(SUV, 8,500); plus one pending-review vehicle, one draft, and one with
expired insurance (to demonstrate automatic restriction).

## Operational demo data
Policies (Flexible / Moderate / Strict), feature catalogue, extras
(child seat, GPS, additional driver, airport pickup), a maintenance block on
one vehicle, one completed booking with both inspections + reviews, one
upcoming confirmed booking, one pending host request, one damage/dispute
case in review, sample ledger postings and a PAID plus a PENDING payout,
and in-app notification examples.
