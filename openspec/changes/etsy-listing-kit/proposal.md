# Proposal: Etsy Listing Kit

## Human anchor

> "One design file, all the Etsy listing assets — built for embroidery sellers."
> — BHD Labs README (Etsy Patternator line); full context in
> [`experiments/etsy-listing-kit/docs/intent.md`](../../../experiments/etsy-listing-kit/docs/intent.md)

## Outcomes

- **Who:** An embroidery / craft seller on Etsy who has a finished design file (PNG/JPG/SVG) and wants it live as a listing without doing the asset-prep chore by hand.
- **Job:** Turn one design file into the complete pack of Etsy-ready listing assets (hero image, sized gallery variants, a framed/product mockup) so the listing can go live in one sitting.
- **Done when:** Visitor uploads a design, sees a watermarked preview of the curated image pack, pays once via Stripe Checkout, and downloads the full un-watermarked pack (zip) — no account required.
- **Not doing:** Subscriptions, user accounts, teams, an editor, bulk/multi-file uploads, marketplace publishing/Etsy API write-back, AI image generation, **video (v1)**, hero/alt-size exports. One file → one curated image pack (~6 × 2000px square, Etsy-ready) → one payment.

## Why

The asset-prep step is real, recurring, low-marginal-cost to automate, and search/audience-addressable (embroidery sellers are a known BHD audience). It is a bounded input→output transformation that a qualified buyer can understand and purchase in a single visit — the ideal shape for a paid micro-experiment. The whole point is a truthful revenue signal: **$100 in real Stripe payments within 14 days of production launch** (see [`docs/REVENUE_MODEL.md`](../../../docs/REVENUE_MODEL.md)).

## What changes

A new focused experiment surface (`experiments/etsy-listing-kit/prototype/`, port 3011) plus a hub-hosted paid route: landing → upload → watermarked preview → Stripe Checkout (test mode) → webhook-verified fulfillment → download page + email. Reuses the hub's Next.js/Supabase/Vercel scaffold and the `@beckharrisdesign/mvds` design system. **Stripe is not net-new** — it reuses the working integration in `simple-seed-organizer/prototype/app` (checkout, signature-verified webhook, rate-limiter, supabase-admin, stripe test mock), adapted from subscription to **one-time payment** and from accounts to **metadata-linked orders**. The one-time order model, image asset-pack generator, email adapter, and `revenue:test` command are the genuinely new work.

## Capabilities

### New Capabilities

- `paid-asset-pack`: Accept one design file, generate an Etsy listing-asset pack, gate the un-watermarked result behind a one-time Stripe payment, and deliver it via a webhook-driven, idempotent fulfillment + download flow.
- `revenue-target-test`: An auditable, config-driven `revenue:test` command that reports real (live-mode, post-launch, refund-adjusted) Stripe revenue against the $100 / 14-day target and exits non-zero until met.

### Modified Capabilities

- None (net-new experiment; hub scaffold reused, not modified).

## Impact

- **New:** experiment dir + prototype, paid route under the hub app, Supabase `orders` table (RLS), Stripe Checkout + webhook (**adapted from the SSO integration**, not built from scratch), GA4 purchase event, transactional email adapter, `revenue:test` + tests.
- **Authorized (Katy, 2026-07-24):** **live Stripe** at launch (build/test on test mode first; live secret keys set by Katy, never handled by me), **production deploy** (after smoke tests), **$1/day ad spend** (I build + cap; funding/turn-on is Katy's). Still off until approved: Figma writeback. All tracked in [`docs/REVIEW_QUEUE.md`](../../../docs/REVIEW_QUEUE.md).

## Optional links

- Founder intent: [`experiments/etsy-listing-kit/docs/intent.md`](../../../experiments/etsy-listing-kit/docs/intent.md)
- Revenue model: [`docs/REVENUE_MODEL.md`](../../../docs/REVENUE_MODEL.md)
- Scaffold audit: [`docs/SCAFFOLD_AUDIT.md`](../../../docs/SCAFFOLD_AUDIT.md)
- Review queue: [`docs/REVIEW_QUEUE.md`](../../../docs/REVIEW_QUEUE.md)
