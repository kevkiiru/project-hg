# REQUIRES BUSINESS/LEGAL DECISION Register

Nothing in this register is invented. Every item is implemented as a
**configurable rule** with a clearly labelled placeholder default, surfaced
in admin where operational, and annotated `REQUIRES BUSINESS/LEGAL DECISION`.

| ID | Topic | Placeholder in code | Owner |
|---|---|---|---|
| BLED-001 | Marketplace commission rate & tiers | `COMMISSION_BPS=1500` (15%) — placeholder only | Finance/Legal |
| BLED-002 | Security deposit rule/amounts (fixed vs % vs daily-rate multiple; per category) | `DEPOSIT_RULE=FIXED`, seeded KSh 20,000 placeholder; per-vehicle override | Finance/Ops |
| BLED-003 | Deposit release timing & conditions | `DEPOSIT_RELEASE_HOURS=48` after completion; claims window configurable | Finance/Legal |
| BLED-004 | Rental insurance product & whether marketplace arranges cover | Insurance modelled as documents + status only; **no coverage claim anywhere**; booking UI shows neutral "insurance documentation verified" not "insured by Hiregari" | Legal/Insurance |
| BLED-005 | Tax treatment (VAT on fees, withholding on payouts) | `TAX_*` config; ledger tax account exists but rates 0 until advised | Finance/Legal |
| BLED-006 | Minimum driver age & licence-holding period | `MIN_DRIVER_AGE=23`, min licence 1 yr placeholder; per-host stricter rules allowed | Ops/Legal |
| BLED-007 | Foreign licence / international renter requirements (IDP?) | Documents collected (passport, foreign licence, IDP optional flag); no hard accept/reject without policy | Legal/Ops |
| BLED-008 | Cancellation policy tiers & refund percentages | Flexible/Moderate/Strict seed rows with conservative placeholders; policy text neutral | Legal/Ops |
| BLED-009 | Host cancellation penalties/compensation after payment | Cancellation engine supports compensation lines; default 0 → manual review | Ops/Legal |
| BLED-010 | Host payout release timing (T+?), minimum balance, holds | `PAYOUT_COOLDOWN_HOURS` placeholder; disputes/claims hold funds | Finance |
| BLED-011 | Service-fee treatment on cancellation | configurable keep-fee bps per tier; placeholder 0 | Finance |
| BLED-012 | Late return fees/grace & daily-rate cap | `LATE_GRACE_MINUTES=60`, hourly rate fraction configurable | Ops |
| BLED-013 | Excess mileage rates (host-set guardrails/minimums?) | per-vehicle pricing; no platform minimum yet | Ops |
| BLED-014 | Fuel recharge charge admin fee | adjustment kind supported; amounts host-policy + admin assist | Ops |
| BLED-015 | Damage claim adjudication SLA & evidence standards | dispute workflow; SLA unconfigured | Ops/Legal |
| BLED-016 | KYC provider selection & NTSA access (only via authorized access) | `KYC_DRIVER=manual`; port ready; no gov calls | Engineering/Legal |
| BLED-017 | M-Pesa merchant of record setup (shortcode type, account name), card provider choice & merchant onboarding | mock adapters; no live creds in repo | Finance/Engineering |
| BLED-018 | M-Pesa refund mechanism (reversal API vs B2C) timing | refund adapter supports both paths; config unset | Finance/Engineering |
| BLED-019 | Individual peer-to-peer owners eligibility | Data model supports individuals; approval policy can stay companies/fleets-only; flag `allowIndividualOwners` (default false) | Legal/Business |
| BLED-020 | Data retention: inspections, KYC documents, financial records, messages | retention config placeholders; deletion workflow preserves legal-hold records | Legal/DPO |
| BLED-021 | Cross-border processors (email/analytics/hosted card) & DPA transfer basis | processors listed; analytics cookies gated | DPO/Legal |
| BLED-022 | Terms, privacy notice, rental agreement template, host agreement | static pages use clearly-marked placeholder copy; no legal conclusions | Legal |
| BLED-023 | Chauffeur regulatory classification | feature flagged off for MVP self-drive; data model only | Legal |
| BLED-024 | Promo/discount financial treatment (funded by platform vs host) | promo has `fundedBy` field; ledger split requires fundedBy policy per promo | Finance |
| BLED-025 | No-show rules & charges | job marks candidate no-show; final charge requires policy/admin | Ops/Legal |
| BLED-026 | Emergency/incident response obligations & contacts | support contacts config; response runbook REQUIRES OPS DECISION | Ops |
| BLED-027 | Document expiry grace periods & mandatory set per category | expiry rules config; sensible defaults flagged | Ops/Insurance |
| BLED-028 | Whether renters pay a service fee **in addition to** the host-side commission (two-sided fee) | `RENTER_SERVICE_FEE_BPS=0`; documented model funds platform revenue via host-side `COMMISSION_BPS` withheld at payout; switch on only with Finance sign-off (otherwise effective take ≈ commission + fee) | Finance/Legal |
