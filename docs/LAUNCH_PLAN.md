# Launch plan — Etsy Listing Kit

**Positioning:** One embroidery design → six shop-worthy, Etsy-ready listing photos, for $3, in minutes.
**Customer:** Etsy embroidery/craft sellers with a finished design file.
**Promise:** Skip the listing-asset chore — upload once, pay once, download the pack.
**Price:** $3 one-time. **Target:** $100 in 14 days (nominal; the real KPI is ad-funnel conversion + CAC).

## Go-live checklist (Katy — these need you)

1. **Supabase** — project: **Experiment Hub 2.0** (`ulqdjuiffpazzixnwwso`); confirmed this is the hub DB (has migrations 001–006 tables).
   - [x] **Migration 007** (`elk_orders`, RLS-locked, service-role only) — **APPLIED 2026-07-25** via connector; verified `public.elk_orders` exists with RLS enabled, 0 rows.
   - [ ] Create two **private** Storage buckets: `elk-inputs`, `elk-outputs` (no public access; signed URLs only).
   - [ ] Set `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` in Vercel (service-role is server-only).
   - ⚠ *Unrelated pre-existing advisory on this project:* RLS is **disabled** on `advisor_history`, `drift_alerts`, `phase_transitions`, `checkpoints` (anon key can read/write them). Not part of this experiment — decide separately (enable RLS **with** policies). `elk_orders` is already locked down.
2. **Stripe** (test first, then live)
   - Set `STRIPE_SECRET_KEY` (`sk_test_…` → `sk_live_…`).
   - Add a webhook endpoint → `https://<your-vercel-domain>/etsy-listing-kit/api/webhook`, event `checkout.session.completed`; put its signing secret in `STRIPE_WEBHOOK_SECRET`.
3. **Email (optional but recommended):** create a Resend account, set `RESEND_API_KEY` (+ `ELK_EMAIL_FROM` once your domain is verified). Without it, orders still fulfil; email is a no-op.
4. **Analytics (optional):** `NEXT_PUBLIC_GA_MEASUREMENT_ID` + `GA_API_SECRET`.
5. **Launch stamp:** set `ELK_LAUNCHED_AT` to the go-live ISO timestamp (revenue:test counts only after this).
6. **Site URL:** set `ELK_SITE_URL` to the production origin (used in email links).

## First three launch actions

1. Merge PR #331, deploy to the Vercel production subdomain.
2. Run a **test-mode** end-to-end payment (test card `4242…`) → confirm order fulfils, download works, email logs/sends.
3. Flip to live keys, set `ELK_LAUNCHED_AT`, run one live $3 self-purchase to verify, then start the ad.

## Verification

- **Payment:** Stripe dashboard shows the charge; `/admin/etsy-listing-kit` shows the order `fulfilled`.
- **Analytics:** GA4 realtime shows `landing_view` → `checkout_started` → `purchase`.
- **Email:** Resend dashboard shows the send (or server logs the no-op).
- **Revenue:** `pnpm revenue:test` (with a live key + `ELK_LAUNCHED_AT`) reports actual vs $100.

## Acquisition (ads — $1/day authorized)

- Prepare one campaign (Meta interest-targeting for craft sellers, or Google Search on tight keywords). Set the **$1/day** cap. **Katy performs the fund/turn-on.**
- UTM convention: `?utm_source=<platform>&utm_campaign=elk-launch` — captured through Checkout automatically.
- Break-even is irrelevant at $3 (ads can't profit); the goal is the **conversion-rate / CAC signal**.

## Support & refunds

- Support: replies to the receipt email (reply-to = your Resend from-address).
- Refunds: automatic on failed fulfillment; manual refunds via Stripe dashboard (reflect in `/admin` after the next webhook or manual status edit).

## Review cadence & stop/continue

- **Day 1:** any paid conversion at all? Funnel drop-off points (which step loses people)?
- **Day 3:** checkout conversion rate; is CAC in a sane range?
- **Day 7:** decide — if conversion is viable, plan a larger (separately authorized) spend; if zero conversions on real traffic, the wedge/price/message is wrong.
- **Stop if:** real ad traffic (~100+ clicks) yields 0 upload-starts or 0 checkouts — the offer isn't landing.
- **Continue if:** conversion ≥ ~2% checkout-start and any real payments — scale the test.
- **First assumption to revisit if sales are zero:** message-match (ad ↔ landing) and whether the preview demonstrates enough value.
