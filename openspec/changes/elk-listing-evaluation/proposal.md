## Human anchor

> "the verdict was to either widen the offering to any kind of listing kit on etsy (no
> embroidery hoops) or shift the prism a bit to offer an evaluation of existing listings
> along with the fixed assets right in the same ui. So the verdict was to pivot, basically."
> (founder, 2026-08-23) … "its the earlier discovery for shifting the prism - lets proceed
> with 2" (founder, 2026-08-30)

## Outcomes

- **Who:** Etsy sellers who already have live listings and suspect something is holding them back — the exact audience the ad test proved will click (3.09% CTR on Etsy-listing-help keywords) but who bounced off an embroidery-only pitch. Katy's W&H shop (~20 listings) is the first user and the truth data.
- **Job:** Point ELK at an existing listing and get an honest, objective read — "here is what's incomplete, against Etsy's own standard" — in the same UI that then offers the fixed assets (the image pack) as one concrete fix. Evaluation is the value-first hook; the kit becomes the remedy it recommends, not the cold pitch.
- **Done when:** A visitor can submit a public Etsy listing URL on the ELK surface and see its evaluation rendered (Tier A publishability pass/fail + Tier B completeness score with a ranked fix-first list), with the paid pack positioned in-flow where the evaluation flags image gaps — and the funnel is instrumented so a future ad burst can measure evaluation-starts → pack conversions.
- **Not doing:** No embroidery framing anywhere (the test killed it). No writes to Etsy, no seller OAuth in v1 — evaluation reads public listing data only. No new scoring research — the Tier A/B rubric is inherited from the `etsy-zero-sales-funnel` discovery, not reinvented. No new ad spend inside this change (re-running the demand test is its own decision, after the pivot ships). Not building the public labs scorecard for W&H here — that stays `etsy-zero-sales-funnel`'s scope; this change productizes the same rubric for strangers.

## Why

The ad test (`etsy-listing-kit-test1`, 2026-08-07→16) answered cleanly: 972 impressions, 30 clicks, 3.09% CTR, ~$1.87 CPC, $56.03 spent, **zero conversions** — and zero ad-attributed orders in `elk_orders`. The keywords found real Etsy-listing intent; the landing lost it the moment it said "embroidery." That is a message-mismatch verdict, not a demand verdict — the plan's own kill/continue table called this shape before the money was spent.

Shifting the prism fixes both halves of the mismatch at once. Evaluation works for *any* listing type, so the niche wall disappears without the kit having to master every product category on day one. And it inverts the funnel: instead of asking a stranger to buy $3 images on faith, ELK first tells them something true and specific about their own shop — then the pack offer arrives as the fix for a problem the tool just showed them. The rubric that powers it already exists: the `etsy-zero-sales-funnel` change did the discovery (Tier A API-enforced publishability, Tier B Seller Handbook quality criteria, all scoreable from `getListing`-shaped data). This change moves that rubric from "score Katy's own captured snapshots" to "score any public listing a visitor pastes in."

## What changes

- A **listing evaluation flow** on the ELK surface: paste a public Etsy listing URL → fetch its public data live (Etsy API, existing key, read-only) → render Tier A pass/fail + Tier B completeness with a ranked opportunity list ("Your biggest opportunities" — framed as what's available, not what's missing; a fully populated listing gets testing/refresh recommendations instead of invented gaps), where every recommendation shows its current-state evidence, cites current Etsy documentation with a last-checked date, and the title card includes one free sample suggested title as a taste of the kit.
- The **paid offer grows from image pack to full listing kit** (founder, 2026-08-30): ten new-or-updated Etsy-ready images plus a reusable template, a suggested 140-character title, 13 suggested tags, and alt text for every photo — every fix the report flags, delivered as paste-ready suggestions (never written to Etsy). A listing-video add-on is **teased as coming soon**, not built. The offer sits inside the evaluation result as the remedy for the report above it. **The kit is bought for, and built from, the evaluated listing** (founder, 2026-08-31, Figma 02.26/02.27): checkout is seeded by the scrape (`listing_id`, no upload), fulfillment regenerates from the listing's own photos and fields via the scene ladder + wording pipeline (deterministic sourced brief; grounded LLM composition for title/tags/alt text), and the embroidery upload path is retired from this flow entirely.
- **Funnel instrumentation extended**: evaluation-start / evaluation-complete / pack-click events alongside the existing GA4 + Ads conversion plumbing, so the next ad burst measures the new funnel end to end.

## Capabilities

### New Capabilities

- `listing-evaluation`: evaluate any public Etsy listing against the inherited Tier A/B completeness rubric and render the result in the ELK UI, with instrumented handoff into the paid flow.

### Modified Capabilities

- `paid-asset-pack`: grows into the **full listing kit** — images plus suggested title, tags, and alt text (video teased as coming soon) — de-niched from embroidery to any-listing framing, and offered in-context as the remedy for the evaluation report rather than the sole entry point. Kit pricing is an open founder decision (frames render today's $3 pending that call).

## Impact

- **Code:** new evaluation module (rubric logic shared/extracted so `etsy-zero-sales-funnel` and this change score identically), a listing-fetch endpoint (public data, server-side, existing Etsy key), ELK page recomposition, analytics events. Hub app only.
- **Data:** likely a small `elk_evaluations` table (listing id, scores, timestamp) for funnel truth; no PII beyond what a public listing already exposes.
- **Risk:** medium-low. Read-only public data, no new OAuth scope. Open questions for design: Etsy API rate limits / ToS posture on evaluating third-party listings; whether evaluations persist or stay ephemeral; how W&H scene templates generalize when the upload isn't line art. The scoring thresholds marked † in the rubric discovery still carry their "verify in Shop Manager" caveat.

## Optional links

- Rubric discovery: [etsy-zero-sales-funnel proposal](../etsy-zero-sales-funnel/proposal.md) (Tier A/B criteria tables) and [explore](../etsy-zero-sales-funnel/explore.md)
- Ad-test verdict receipts: BHD Labs History notes 2026-08-24 (campaign totals; pivot decision), campaign log `docs/AD_CAMPAIGN_GOOGLE.md`
- Experiment directory: `experiments/etsy-listing-kit/` (hub app surface: `app/etsy-listing-kit/`)
