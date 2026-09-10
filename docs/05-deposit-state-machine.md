# Security Deposit State Machine

Implementation: `apps/api/src/modules/deposits/deposit.machine.ts`.
Deposits are **liabilities**, never revenue; money sits in the
`HG_DEPOSIT_LIABILITY` ledger account.

## States

| State | Meaning |
|---|---|
| `REQUIRED` | Quote/booking policy says a deposit is needed; none taken yet. |
| `PENDING` | Deposit payment/authorization initiated, awaiting result. |
| `HELD` | Card authorization/hold in place (provider supports holds). |
| `COLLECTED` | Funds actually captured (M-Pesa collection or card charge). |
| `RELEASE_PENDING` | Rental ended; operations/automation approved release. |
| `RELEASED` | Full amount returned to renter; liability account cleared. |
| `PARTIALLY_DEDUCTED` | Part withheld against approved charges; remainder returned. |
| `DEDUCTED` | Full amount applied to approved charges (damage/late/fuel/mileage). |
| `DISPUTED` | Renter disputes a deduction; case linked; resolution returns to a money state. |
| `REFUNDED` | Explicit refund flow completed (alias terminal for COLLECTED path). |

## Transitions

```
REQUIRED         → PENDING (checkout includes deposit), CANCELLED (booking cancelled pre-charge)
PENDING          → HELD | COLLECTED (provider verified), REQUIRED (failed; retry), CANCELLED
HELD             → COLLECTED (captured after claim), RELEASE_PENDING (hold void at return)
COLLECTED        → RELEASE_PENDING, PARTIALLY_DEDUCTED (claim approved partial), DEDUCTED (full)
RELEASE_PENDING  → RELEASED, PARTIALLY_DEDUCTED, DEDUCTED, DISPUTED
PARTIALLY_DEDUCTED → RELEASED (remainder done), DISPUTED
DEDUCTED         → DISPUTED
DISPUTED         → RELEASED | PARTIALLY_DEDUCTED | DEDUCTED (resolution, audited)
```

## Rules

* Deposit rule is configurable per vehicle/host and globally:
  FIXED amount, PERCENT of booking total, or N × daily rate
  (`REQUIRES BUSINESS/LEGAL DECISION` for defaults; KES amounts seeded as
  placeholders).
* Deductions require an approved `BookingAdjustment`/`DamageReport` with
  evidence; every deduction creates ledger postings (liability → revenue/
  host payable split per policy) and is auditable.
* Release timing is configurable (`scheduledReleaseAt`), default e.g. 48h
  after completed return, marked REQUIRES BUSINESS DECISION.
* UI must disclose amount, timing, deduction reasons, release ETA and dispute
  path before booking (spec §27).
