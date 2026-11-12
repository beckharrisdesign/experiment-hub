# Etsy Listing Kit

One embroidery design → 6 curated, Etsy-ready 2000px listing images, for **$3**, no account.

## Closed 2026-11-12

**Decision (Katy, 2026-11-12): close it out. No further ad spend.**

The question was whether an Etsy seller would pay a few dollars, right now, to skip
listing-asset prep. In three and a half months, no stranger did.

| Measure (hub Supabase, read 2026-11-12) | Count |
| --- | --- |
| Live paid orders | 8, **all Katy's own** (2026-07-27 → 2026-08-31) |
| Paid orders from strangers | **0** |
| Orders attributed to an ad (`utm_source` or `click_id`) | **0** |
| Free listing checks (`elk_evaluations`, after the 2026-08-30 pivot) | 2, both 2026-08-31 |
| Any activity in the last 30 days | none |

**What this does and doesn't show.** It is not a clean "no":
- The first ad burst (2026-08-04 → 06) ran with conversion tracking broken and is void
  ([`docs/AD_CAMPAIGN_GOOGLE.md`](../../docs/AD_CAMPAIGN_GOOGLE.md), PR #365). Tracking was
  repaired 2026-08-07/09; the campaign log stops on 2026-08-09, and Google's impression and click
  numbers after that were never written down.
- The free-check funnel that replaced the paid-first funnel on 2026-08-30 never had traffic
  sent to it.

So what is known is narrower: with ads as the only channel and roughly a month of them, nobody
outside the shop bought. The zero-sales Etsy question it pivoted toward continues in
[`etsy-zero-sales-funnel`](../../openspec/changes/etsy-zero-sales-funnel/) and the tag positioning
experiment, not here.

**Left as they are:** the `/etsy-listing-kit` route stays live in the hub, and the Stripe account,
webhook and Google Ads account `AW-277034089` stay configured. Pausing or removing the Ads campaign
`etsy-listing-kit-test1` is in Google Ads (Katy's step).

- **Funnel** lives in the hub app: `app/etsy-listing-kit/` (route `/etsy-listing-kit`), deploys to the Vercel production subdomain.
- **Owner view:** `/admin/etsy-listing-kit` (gated by the hub's `hub-edit`/`ADMIN_SECRET` middleware).
- **OpenSpec change:** [`openspec/changes/etsy-listing-kit`](../../openspec/changes/etsy-listing-kit).
- **Design:** Figma `5oeip2GtLOFpGWpmhyd0fK`, page `02.3`.

## Run locally

```bash
pnpm dev   # hub app on :3000 → http://localhost:3000/etsy-listing-kit
```

Preview generation (upload → 6 watermarked) works with **no keys**. Checkout/webhook/fulfillment need env (see [`docs/LAUNCH_PLAN.md`](../../docs/LAUNCH_PLAN.md)):
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, plus optional `RESEND_API_KEY`, GA keys, `ELK_LAUNCHED_AT`, `ELK_SITE_URL`.

## Test

```bash
./node_modules/.bin/vitest run tests/etsy-listing-kit   # 57 tests
pnpm revenue:test                                        # truthful revenue gauge (red until real live $)
```

## Architecture (key files)

| Area | File |
| --- | --- |
| Config (price, target, pack) | `lib/etsy-listing-kit/config.ts` |
| 6-image generator (sharp/SVG) | `lib/etsy-listing-kit/generator.ts` |
| Stripe checkout | `app/etsy-listing-kit/api/checkout/route.ts` |
| Webhook (idempotent + auto-refund) | `app/etsy-listing-kit/api/webhook/route.ts` |
| Fulfillment / orders / storage | `lib/etsy-listing-kit/{fulfillment,orders}.ts` |
| Email (Resend adapter) | `lib/etsy-listing-kit/email.ts` |
| Analytics (funnel + purchase) | `lib/etsy-listing-kit/analytics.ts` |
| Zip download | `lib/etsy-listing-kit/zip.ts` |
| Revenue test | `scripts/revenue-test.mjs` + `lib/etsy-listing-kit/revenue.ts` |
| DB migration | `supabase/migrations/007_elk_orders.sql` |
