# Spec: revenue-target-test

## Outcomes

- **Who:** Katy (founder/operator) tracking real revenue as a truthful **secondary** gauge (the experiment's primary pass/fail is the ad-funnel conversion signal — see `docs/REVENUE_MODEL.md`).
- **Job:** Get a truthful, auditable read of real revenue against the $100 / 14-day **nominal ceiling** (expected to stay red on a $14 ad budget — honest, not a failure).
- **Done when:** `revenue:test` reports real live-mode, post-launch, refund-adjusted Stripe revenue for `etsy-listing-kit` and exits non-zero until the target is genuinely met.
- **Not doing:** Counting test-mode payments, seed rows, mocked charges, unpaid sessions, or revenue from other products.

## ADDED Requirements

### Requirement: Truthful revenue acceptance test

An auditable command reports real revenue for this experiment against a config-driven target and can never pass on fake data.

**Fails until:** `revenue:test` runs, reads verified Stripe payment data scoped to `experiment_id=etsy-listing-kit`, and exits non-zero because live qualifying revenue is below $100.

#### Scenario: Test reports red before the target is met

- **WHEN** `revenue:test` runs and qualifying live revenue is below the $100 target
- **THEN** it prints target, actual, gap, purchases, AOV, days elapsed/remaining, required run rate, and exits non-zero

#### Scenario: Only qualifying revenue counts

- **WHEN** computing revenue
- **THEN** only live-mode, post-launch-timestamp payments for `etsy-listing-kit` count; refunds are subtracted, taxes excluded, duplicates de-duplicated, and test-mode/unpaid/other-product payments are ignored

#### Scenario: Test reports green only on real target attainment

- **WHEN** qualifying live revenue reaches or exceeds $100 within the window
- **THEN** the command exits zero and reports PASS — reachable only via real paid Stripe charges
