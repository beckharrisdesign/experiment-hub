# Etsy Listing Kit

One embroidery design → 6 curated, Etsy-ready 2000px listing images, for **$3**, no account.

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
