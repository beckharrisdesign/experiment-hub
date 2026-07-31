# Launch plan — Etsy Listing Kit

**Positioning:** One embroidery design → six shop-worthy, Etsy-ready listing photos, for $3, in minutes.
**Customer:** Etsy embroidery/craft sellers with a finished design file.
**Promise:** Skip the listing-asset chore — upload once, pay once, download the pack.
**Price:** $3 one-time. **Target:** $100 in 14 days (nominal; the real KPI is ad-funnel conversion + CAC).

## Go-live checklist (Katy — these need you)

1. **Supabase** — project: **Experiment Hub 2.0** (`ulqdjuiffpazzixnwwso`); confirmed this is the hub DB (has migrations 001–006 tables).
   - [x] **Migration 007** (`elk_orders`, RLS-locked, service-role only) — **APPLIED 2026-07-25** via connector; verified `public.elk_orders` exists with RLS enabled, 0 rows.
   - [x] **Private Storage buckets created 2026-07-25**: `elk-inputs` (20 MB, PNG/JPG/SVG) + `elk-outputs` (5 MB, JPEG), both `public=false`; no public policies → service-role only, signed URLs for buyers.
   - [x] `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` **already set in Vercel** (names match `lib/etsy-listing-kit/supabase-admin.ts`). `ADMIN_SECRET` also set → owner view gated. Note: Vercel "Needs Attention" = redeploy required for them to take effect.
   - ⚠ *Unrelated pre-existing advisory on this project:* RLS is **disabled** on `advisor_history`, `drift_alerts`, `phase_transitions`, `checkpoints` (anon key can read/write them). Not part of this experiment — decide separately (enable RLS **with** policies). `elk_orders` is already locked down.
2. **Stripe** (test first, then live) — **distinct brand per experiment** (decided 2026-07-25)
   - **Separate Stripe account** for this experiment under a **Beck Harris Design Organization** (never the personal account). Each experiment = its own account = its own brand/payouts/keys.
   - **Activate under the business entity** (Beck Harris Design DBA/LLC if registered) so the internal legal name isn't a personal name. Customers never see the legal entity regardless.
   - Customer-facing fields to set on that account (this is what prevents a personal name on statements):
     - **Statement naming** — ~~shortened descriptor `BHD`~~ **dropped 2026-07-31**: Stripe requires the descriptor to match the business name. Checkout still sends `statement_descriptor_suffix: 'ETSY KIT'`, applied on top of the business-name prefix Stripe derives, so statements read **`<BUSINESS NAME>* ETSY KIT`** (verified by the live 2026-07-28 payment).
     - **Public business name** = the experiment brand · **Branding** = logo + terracotta `#b24a2e`.
     - **Support email** = a **brand** address, not personal (also set `ELK_EMAIL_FROM` to match).
   - Set `STRIPE_SECRET_KEY` (`sk_test_…` → `sk_live_…`) from **that account**.
   - Add a webhook endpoint → `https://<your-vercel-domain>/etsy-listing-kit/api/webhook`, event `checkout.session.completed`; put its signing secret in `STRIPE_WEBHOOK_SECRET`.
   - *No code change needed — the app uses whatever keys you supply. Attribution already works via `experiment_id` metadata; separate accounts are for brand + payout isolation + privacy.*
3. **Email (optional but recommended):** create a Resend account, set `RESEND_API_KEY` (+ `ELK_EMAIL_FROM` once your domain is verified). Without it, orders still fulfil; email is a no-op.
4. **Analytics (optional):** `NEXT_PUBLIC_GA_MEASUREMENT_ID` + `GA_API_SECRET`.
5. **Launch stamp:** set `ELK_LAUNCHED_AT` to the go-live ISO timestamp (revenue:test counts only after this).
6. **Site URL:** set `ELK_SITE_URL` to the production origin (used in email links).

## Environment variables — status

Confirmed already set in Vercel (from the 2026-07-25 env screenshot):

| Var | Status | Used by |
| --- | --- | --- |
| `SUPABASE_URL` | ✅ set (redeploy to apply) | `lib/etsy-listing-kit/supabase-admin.ts` |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ set (redeploy to apply) | admin client — server only |
| `ADMIN_SECRET` | ✅ set | `/admin/etsy-listing-kit` gate (hub middleware) |

Still to set:

| Var | Status | Used by |
| --- | --- | --- |
| `STRIPE_MODE` | ⬜ `test` or `live` | which key pair the app uses (flip to switch modes) |
| `STRIPE_SECRET_KEY_LIVE` | ⬜ needed | checkout + webhook in live mode |
| `STRIPE_WEBHOOK_SECRET_LIVE` | ⬜ needed | webhook signature (live endpoint) |
| `STRIPE_SECRET_KEY_TEST` / `STRIPE_WEBHOOK_SECRET_TEST` | ⬜ optional | test-mode dry runs |
| `ELK_LAUNCHED_AT` | ⬜ at go-live | revenue window start |
| `ELK_SITE_URL` | ⬜ needed | email download links |
| `RESEND_API_KEY` (+ `ELK_EMAIL_FROM`) | ⬜ optional | confirmation/refund email |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` + `GA_API_SECRET` | ⬜ optional | funnel + purchase analytics |

> Mode toggle: store both `_TEST`/`_LIVE` key pairs once, set `STRIPE_MODE` to switch — no editing secret values. `revenue:test` always uses the live key.

> The three ✅ vars show Vercel "Needs Attention" only because the current deployment predates them — the next deploy applies them.

## First three launch actions

1. Merge PR #331, deploy to the Vercel production subdomain.
2. **Live-mode from the start** (Katy's call 2026-07-25 — no users/products to endanger; makes real revenue count immediately). Requires account **activation** (bank + identity) for charges to settle. Verify with **one real $3 self-purchase on a real card** (test cards don't work in live mode), confirm it fulfils + downloads + emails, then **refund it** from the dashboard.
3. Set `ELK_LAUNCHED_AT` at go-live, then start the ad.

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
