# Host Payout State Machine

Implementation: `apps/api/src/modules/payouts/payout.machine.ts`.

## States

| State | Meaning |
|---|---|
| `PENDING` | Booking COMPLETED; earnings computed; not yet eligible (hold period / review window). |
| `SCHEDULED` | Eligibility reached; batched into next payout run. |
| `PROCESSING` | Sent to payout provider (bank/M-Pesa B2C port). |
| `PAID` | Provider confirms; ledger: host payable → cash settled. |
| `FAILED` | Provider failure; reason stored; retried on schedule after review. |
| `HELD` | Risk/dispute/compliance hold; manual release required; reason mandatory. |

## Transitions

```
PENDING    → SCHEDULED (eligibility job: release rules met)
PENDING    → HELD (dispute open, missing KYC/payout details, risk signal; reason required)
SCHEDULED  → PROCESSING (payout run picks batch)
PROCESSING → PAID (verified provider callback), FAILED
FAILED     → SCHEDULED (retry queue), HELD
HELD       → SCHEDULED (manual/rule release, audited)
PAID       → terminal (corrections via reversing ledger entries, never mutation)
```

## Eligibility / rules

* Successful customer payment **never** triggers immediate payout.
* Payout becomes eligible when: booking COMPLETED + deposit window elapsed +
  no open dispute + host VERIFIED + payout details present + configurable
  cooling period (default TBD: REQUIRES BUSINESS DECISION).
* Amounts per payout: gross (rental share after promo), less Hiregari
  commission (configurable bps; no hardcoded rate), less refunds/adjustments,
  plus delivery/extras shares per policy = net.
* A payout groups multiple bookings; `PayoutBooking` join preserves the
  per-booking breakdown.
* Failures alert finance; repeated failures keep amounts in `HOST_PAYABLE`.
* Every payout attempt and reversal is recorded in ledger + audit log.
