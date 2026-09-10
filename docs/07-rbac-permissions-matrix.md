# RBAC & Permissions Matrix

Roles are assigned via `RoleAssignment(scopeType, scopeId)`:

* Global roles: `SUPER_ADMIN`, `OPERATIONS`, `CUSTOMER_SUPPORT`,
  `VERIFICATION`, `FINANCE`, `CONTENT_MODERATION`.
* Marketplace roles: `CUSTOMER`, `HOST`, `HOST_STAFF` (host/staff scoped to a
  `Business`/`HostProfile`). A user can hold several roles.

Authorization is enforced server-side by `@RequirePermission(...)` guards;
frontend route guards are UX only. Permission checks for host resources also
verify the resource belongs to the caller's host/business scope. Admin roles
require MFA (`mfaEnrolledAt`) for the permission groups marked 🔐.

## Permission catalogue (code: `packages/types/src/permissions.ts`)

```
profile.read.self  profile.update.self
verification.driver.submit  verification.driver.read.self
host.onboarding.submit  host.read.self  host.update.self  staff.manage
business.read.self  business.update.self
vehicle.create  vehicle.read.own  vehicle.update.own  vehicle.submit  vehicle.publish-state.own
availability.manage.own  pricing.manage.own
booking.create            booking.read.self        booking.cancel.self
booking.host.read         booking.host.respond     booking.host.cancel
inspection.submit         inspection.read.party
messaging.use             review.create.self       review.read
support.create
# admin (global scopes)
admin.users.read 🔐   admin.users.manage 🔐
admin.hosts.read      admin.hosts.verify 🔐   admin.hosts.suspend 🔐
admin.vehicles.read   admin.vehicles.approve 🔐  admin.vehicles.suspend 🔐
admin.documents.read  admin.documents.verify 🔐
admin.driver.read    admin.driver.verify 🔐
admin.bookings.read   admin.bookings.manage 🔐
admin.payments.read 🔐 admin.refunds.create 🔐 admin.deposits.manage 🔐
admin.ledger.read 🔐  admin.payouts.read 🔐 admin.payouts.approve 🔐
admin.disputes.handle  admin.reviews.moderate
admin.promotions.manage  admin.content.manage  admin.notifications.send
admin.audit.read 🔐   admin.risk.review 🔐   admin.incidents.handle
analytics.view 🔐 (FINANCE/OPS scoped)
```

## Matrix (✓ default grant · ◐ scoped/own · — no)

| Permission group | CUSTOMER | HOST | HOST_STAFF* | SUPER_ADMIN | OPERATIONS | SUPPORT | VERIFICATION | FINANCE | CONTENT |
|---|---|---|---|---|---|---|---|---|---|
| Search / listings / vehicle read | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create booking / pay | ✓ | — | — | ✓ (support view only) | — | — | — | — | — |
| Cancel own booking | ◐ | — | — | ✓ override(🔐) | ✓ override | ✓ assist | — | ✓ refund view | — |
| Driver verification submit/read | ◐ | ◐ | — | ✓ read all | ✓ read | ✓ read | ✓ review/decide | — | — |
| Host onboarding & status | — | ◐ | — | ✓ | ✓ read | ✓ read | ✓ decide | ✓ read | — |
| Vehicle CRUD/submit | — | ◐ | ◐ configurable | ✓ | ✓ read | ✓ read | ✓ approve | — | — |
| Availability/pricing | — | ◐ | ◐ | ✓ read | — | — | — | — | — |
| Respond to booking requests | — | ◐ | ◐ | ✓ | ✓ | — | — | — | — |
| Inspections | ◐ party | ◐ party | ◐ party | ✓ read | ✓ read/assist | ✓ read | — | — | — |
| Damage/incident report | ◐ | ◐ | ◐ | ✓ | ✓ handle | ✓ read | — | — | — |
| Disputes handling | party view | party view | party view | ✓ | ✓ | — | — | ✓ financial input | — |
| Reviews create (post-completion) | ◐ | ◐ | — | — | — | — | — | — | ✓ moderate |
| Reviews moderation | — | — | — | ✓ | ✓ | — | — | — | ✓ |
| Messaging | ◐ | ◐ | ◐ | ✓ read when audited | ✓ | ✓ | — | — | — |
| Ledger read | — | — | — | ✓ | — | — | — | ✓ | — |
| Refunds create | — | — | — | ✓ | ◐ propose | ◐ propose | — | ✓ | — |
| Deposits resolve | — | — | — | ✓ | ✓ | — | — | ✓ | — |
| Payouts read/approve | — | earnings self | earnings self | ✓ | — | — | — | ✓ | — |
| Promotions | — | — | — | ✓ | — | — | — | ✓ | ✓ |
| Content / FAQ / locations | — | — | — | ✓ | — | — | — | — | ✓ |
| Audit logs | — | — | — | ✓ | — | — | — | ✓ | — |
| Users manage / suspend | — | — | — | ✓ | — | ◐ assist only | — | — | — |
| Analytics | — | host metrics | host metrics | ✓ | ✓ ops KPIs | — | queue KPIs | ✓ finance KPIs | — |

\* `HOST_STAFF` permissions are explicit per staff member (invite flow), never
implicitly full host rights: e.g. fleet clerk, finance viewer.

* Denials return 403 with code `FORBIDDEN`; missing auth 401 `UNAUTHENTICATED`.
* Privileged admin actions write `AuditLog` rows (before/after, reason).
* MFA: roles marked 🔐 must complete TOTP before the guarded permission
  executes; sessions carry an `mfaVerifiedAt` with short re-prompt window.
