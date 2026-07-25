# Tasks: Etsy Listing Kit

Package manager: **pnpm** (hub root). Dev: `pnpm dev` → funnel at `/etsy-listing-kit` (hub app, deploys to the Vercel production subdomain). Stripe test mode until launch.

## 1. User outcomes (spec scenarios — must all pass before archive)

- [ ] 1.1 User can upload a valid PNG/JPG/SVG and see it accepted with a thumbnail *(Upload · valid file)*
- [ ] 1.2 User gets a clear, non-technical error on an unsupported/oversized file — no order created *(Upload · bad file)*
- [ ] 1.3 User sees a watermarked preview of all 6 curated images with price + what they get *(Preview the pack)*
- [ ] 1.4 User completes a one-time $3 Stripe payment (test mode) and lands on a success URL tied to their order *(Complete payment)*
- [ ] 1.5 User who cancels checkout returns to the preview with upload intact and no charge *(Cancel payment)*
- [ ] 1.6 A signature-valid `checkout.session.completed` marks the order paid, builds the un-watermarked zip, exposes a signed download, sends one email *(Webhook fulfils once)*
- [ ] 1.7 A duplicated Stripe event/session does not double-fulfil, double-email, or double-count *(Duplicate webhook)*
- [ ] 1.8 A paid buyer can re-open their signed link and re-download within 7 days, no account *(Retrieve later)*
- [ ] 1.9 `pnpm revenue:test` prints red (target/actual/gap/purchases/AOV/days/run-rate) while live revenue < $100 *(Revenue red)*
- [ ] 1.10 `revenue:test` counts only live-mode, post-launch, refund-adjusted `etsy-listing-kit` payments; green only on real attainment *(Only qualifying revenue / green on real)*

## 2. Data + infrastructure

- [x] 2.1 Supabase migration: `elk_orders` (id, stripe_session_id UNIQUE, stripe_event_id UNIQUE, experiment_id, status enum, amount, currency, email, input_ref, output_ref, utm/click-id cols, timestamps) — `supabase/migrations/007_elk_orders.sql` (file written; not yet applied to the DB)
- [x] 2.2 RLS on `elk_orders`: enabled, no client policies (service-role only) — in 007 migration
- [~] 2.3 Private Storage: code reads/writes `elk-inputs`/`elk-outputs` with signed URLs (7-day TTL); the buckets themselves still need creating in Supabase (deploy step)
- [x] 2.4 Env: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PRICE_ELK`, `ELK_LAUNCHED_AT`, `SUPABASE_SERVICE_ROLE_KEY` documented in `.env.example` (Katy sets live values)

## 3. Build (reuse SSO patterns from `simple-seed-organizer/prototype/app`)

- [ ] 3.1 Routes `app/etsy-listing-kit/` (landing+upload, preview, processing, result) built to the approved 02.3 Figma on MVDS tokens (terracotta/ochre/cream, Fraunces+Inter)
- [~] 3.2 Upload: type/size validated **client + server** (preview API re-validates); private-bucket storage + rate-limit still TODO
- [x] 3.3 Image asset-pack generator (server): one design → 6 × 2000px JPGs (flat, framed, in-hoop, detail, scale, info-card), watermarked + clean, under 1MB — `lib/etsy-listing-kit/generator.ts`, verified rendering all six + preview API
- [x] 3.4 Checkout API: `mode:'payment'`, $3, metadata `experiment_id`+`order_id`, order row created + design stored before redirect; attribution captured — `app/etsy-listing-kit/api/checkout`
- [x] 3.5 Webhook API: signature-verified, idempotent on event id, scope+paid guards, `checkout.session.completed` → paid → idempotent fulfillment (generate 6 clean → store) — `app/etsy-listing-kit/api/webhook`. Email still TODO
- [x] 3.6 Result page + order API: post-payment retrieval, polls till fulfilled, signed download URLs (7-day TTL), no account — `app/etsy-listing-kit/result` + `api/order`. (Individual JPGs; zip a later refinement)
- [x] 3.7 Transactional email: provider-agnostic adapter (Resend if `RESEND_API_KEY`, else safe logged no-op — no new account); "your images are ready" HTML+text; wired into fulfillment, idempotent via `email_message_id` — `lib/etsy-listing-kit/email.ts`
- [x] 3.8 Analytics layer: typed funnel events wired (`landing_view`, `upload_started`, `preview_viewed`, `checkout_started`, `result_delivered`, `payment_cancelled`); GA4 client (gtag) + server purchase (Measurement Protocol, once on fulfillment); UTM/click-id persisted through Checkout — `lib/etsy-listing-kit/analytics.ts` (no-op without GA keys)
- [ ] 3.9 Minimal owner view (protected): orders, status, revenue-target progress, attribution, retry a failed order
- [~] 3.10 Recovery: cancelled-payment banner on return (`?canceled=1`, fires `payment_cancelled`) done; processing-failed marks order `failed` for owner retry — auto-retry/auto-refund still TODO

## 4. Revenue test

- [x] 4.1 `revenue:test` script + `pnpm revenue:test`: queries live Stripe by `experiment_id`, post-launch timestamp, minus refunds, excl tax, dedup; exits non-zero until $100; config in `lib/etsy-listing-kit/config.ts`. Verified: reports INACTIVE/red with no key (exit 3) — starts failing honestly
- [x] 4.2 Unit tests: `revenue.ts` qualification (test/live, full/partial refund, wrong/missing metadata, out-of-window, pre-launch, unpaid, failed, dedup, sums, CLI parity) + `webhook-logic.ts` (scope, unpaid, duplicate event, retry) + email no-op — 20 tests passing (`tests/etsy-listing-kit/`)

## 5. QA

- [ ] 5.1 Automated (vitest): upload validation, checkout metadata, webhook idempotency, email adapter, analytics dedup, revenue logic — Stripe test mode + `__mocks__/stripe`
- [ ] 5.2 E2E happy path (test card) → paid → fulfilled → download → email → analytics events
- [ ] 5.3 E2E cancelled payment, duplicate webhook, processing failure/refund
- [ ] 5.4 Manual §1 walkthrough on preview deploy (first-time visitor, mobile, keyboard, invalid input, refund path)
- [ ] 5.5 Accessibility: re-run MVDS `check:contrast`; keyboard + mobile critical-flow pass

## 6. Deploy

- [ ] 6.1 Preview deploy (Vercel), test-mode Stripe, smoke test full flow
- [ ] 6.2 Launch checklist: Katy sets live Stripe keys + registers live webhook; record production launch timestamp for revenue window; flip to live; production smoke test
- [ ] 6.3 Prepare (do not fund) the $1/day ad campaign + UTM convention; Katy performs turn-on

> Stop rule: after tasks.md, wait for approval before `/opsx:apply`.
