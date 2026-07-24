# Revenue model — Etsy Listing Kit

Experiment ID: `etsy-listing-kit` · Status: **RED (pre-launch, target unmet — by design)**

## The acceptance test

| Field | Value |
| --- | --- |
| Revenue target | **$100 USD** |
| Revenue window | **14 days** |
| Target start | Production launch timestamp (recorded at launch, not before) |
| Revenue definition | Successful **live-mode** Stripe payments attributed to `etsy-listing-kit` (via Stripe metadata `experiment_id`), **minus refunds**, **excluding taxes** |
| Must begin failing | Yes — no live payments exist yet |
| May never be faked | Test-mode payments, seed rows, mocked Stripe, or unpaid Checkout sessions do **not** count |

## Price and unit economics

- **Price:** **$3.00 one-time, fixed-per-use** (single design → one curated image pack). Chosen 2026-07-24: $9 was disproportionate to the ~$4 a typical digital embroidery listing retails for; $3 sits *below* one listing's price so the pitch is "less than one sale gets you the whole image set." Reviewable via config without touching product code.
- **Est. costs per sale:** Stripe fee ≈ $0.39 (2.9% + $0.30); compute/storage ≈ negligible (server-side image compositing, short-retention storage); email ≈ ~$0.
- **Est. net revenue per sale ≈ $2.61.**

## Reverse-engineering the target

```
$100 target ÷ $2.61 net per sale ≈ 39 sales needed (round up from 38.3)
```

| Scenario | Checkout conversion | Visitors needed | Notes |
| --- | --- | --- | --- |
| Optimistic | 4% | ~975 | Warm audience / strong message-match |
| Base | 2% | ~1,950 | Realistic cold-ish traffic |
| Pessimistic | 1% | ~3,900 | Weak match / cold traffic |

- **Required daily run rate:** ~$7.15/day ($100 / 14).
- **Required sales cadence:** ~2.8 sales/day (≈ 20 sales/week).
- **Allowable CAC (break-even):** ≤ $2.61/sale ⇒ at 2% conversion, ≤ ~$0.05 per visitor. Paid traffic can't break even at $3 — expected and accepted for a signal test.
- **Authorized paid spend:** **$1/day, $14 total over the window** (Katy, 2026-07-24; platform-agnostic). **Ads are the only channel** (no organic push). At ~$0.50–$1.00 CPC that's ~14–28 clicks total.

## What this experiment actually tests (decided 2026-07-24)

This is a **funnel-conversion signal test**, not a revenue-maximization run. $14 of ads cannot produce $100 (or ~39 sales) at a $3 price — and that's fine, because the question is:

> Does a cold embroidery seller, arriving from an ad, upload a design and pay for the pack — and at what conversion rate / cost-per-acquisition?

**Primary KPIs (the real pass/fail):**
- Ad CTR → landing; landing → upload-started; upload → preview; preview → checkout-started; checkout → **paid**.
- Observed **checkout conversion rate** and **CAC** ($14 spend ÷ paid conversions).
- Any real paid conversion at all is the first proof-of-willingness.

**Secondary / truthful gauge:** `revenue:test` reports live revenue vs the **$100 nominal ceiling**. It is expected to stay **red** on a $14 budget; that is an honest reading, not an experiment failure. The experiment "passes" on funnel signal, not on the $100 line.

## Sensitivities

- **Most sensitive assumption:** checkout conversion rate. At 1% vs 4% the traffic requirement swings 4×.
- **Fastest way to invalidate:** put the live link in front of ~100 embroidery sellers and measure upload-start → checkout-start; if <2% start checkout, the wedge or price is wrong.
- **If traffic is low:** lean on one high-intent community post + the existing Etsy audience before considering any (separately authorized) ad spend.
- **If conversion is low:** strengthen preview value and message-match; test $5 vs $9.
- **If AOV is low:** offer a 3-pack bundle at a higher price (out of scope for v1).
- **If fulfillment cost is high:** cap input size; it should stay near-zero for image resizing.
- **If refund rate is high:** tighten preview honesty so buyers know exactly what they get.

## Verdict on realism

As a **revenue** target, $100 in 14 days is **not** reachable on a $14 ad-only budget at $3/sale (~39 sales would need orders of magnitude more spend) — and we are explicitly not treating it as the pass/fail. As a **funnel-conversion signal** test, $14 is enough to get a first read on whether cold ad traffic will pay: even ~14–28 clicks tells us CTR, landing→checkout drop-off, and whether *anyone* pays. That signal — not the $100 line — is the deliverable. If conversion looks viable, scaling spend (a separate authorization) is the follow-on.
