# Tasks: Etsy Listing Kit

Package manager: **pnpm** (hub root). Dev: `pnpm dev` → funnel at `/etsy-listing-kit` (hub app, deploys to the Vercel production subdomain). Stripe test mode until launch.

## 1. User outcomes (spec scenarios — must all pass before archive)

- [x] 1.1 User can upload a valid PNG/JPG/SVG and see it accepted with a thumbnail *(Upload · valid file)* — verified live walkthrough 2026-07-27; UX bug on submit scroll tracked in #336
- [ ] 1.2 User gets a clear, non-technical error on an unsupported/oversized file — no order created *(Upload · bad file)*
- [x] 1.3 User sees a watermarked preview of all 6 curated images with price + what they get *(Preview the pack)* — verified live 2026-07-27; layout/crop feedback open in #335/#330 (partly addressed by #337 restyle, re-verify)
- [x] 1.4 User completes a one-time $3 Stripe payment (test mode) and lands on a success URL tied to their order *(Complete payment)* — verified stronger than spec: **live** $3 payment 2026-07-27 (order `0484a635-a662`, `pi_3TxrgUKdCjejJ0FM…`), success URL tied to order
- [ ] 1.5 User who cancels checkout returns to the preview with upload intact and no charge *(Cancel payment)*
- [~] 1.6 A signature-valid `checkout.session.completed` marks the order paid, builds the un-watermarked zip, exposes a signed download, sends one email *(Webhook fulfils once)* — live receipt 2026-07-27: paid 16:47:28Z → fulfilled 16:47:34Z, event id + output stored (elk_orders row `0484a635`); **email did NOT send on that order** (`email_message_id` null) — root cause: `RESEND_API_KEY` was added to Vercel the same day but the order ran on the earlier deployment; current production (deployed 2026-07-28 with the key present) should send. Unverified live until the next real purchase
- [ ] 1.7 A duplicated Stripe event/session does not double-fulfil, double-email, or double-count *(Duplicate webhook)*
- [ ] 1.8 A paid buyer can re-open their signed link and re-download within 7 days, no account *(Retrieve later)*
- [ ] 1.9 `pnpm revenue:test` prints red (target/actual/gap/purchases/AOV/days/run-rate) while live revenue < $100 *(Revenue red)*
- [ ] 1.10 `revenue:test` counts only live-mode, post-launch, refund-adjusted `etsy-listing-kit` payments; green only on real attainment *(Only qualifying revenue / green on real)*

## 2. Data + infrastructure

- [x] 2.1 Supabase migration: `elk_orders` (id, stripe_session_id UNIQUE, stripe_event_id UNIQUE, experiment_id, status enum, amount, currency, email, input_ref, output_ref, utm/click-id cols, timestamps) — `supabase/migrations/007_elk_orders.sql`; **APPLIED to Experiment Hub 2.0 (`ulqdjuiffpazzixnwwso`) 2026-07-25**, RLS verified on
- [x] 2.2 RLS on `elk_orders`: enabled, no client policies (service-role only) — in 007 migration
- [x] 2.3 Private Storage: `elk-inputs`/`elk-outputs` **created** (private, size + MIME limits) on Experiment Hub 2.0 2026-07-25; code reads/writes with signed URLs (7-day TTL); service-role-only (no public policies)
- [x] 2.4 Env: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PRICE_ELK`, `ELK_LAUNCHED_AT`, `SUPABASE_SERVICE_ROLE_KEY` documented in `.env.example` (Katy sets live values)

## 3. Build (reuse SSO patterns from `simple-seed-organizer/prototype/app`)

- [ ] 3.1 Routes `app/etsy-listing-kit/` (landing+upload, preview, processing, result) built to the approved 02.3 Figma on MVDS tokens (terracotta/ochre/cream, Fraunces+Inter)
- [~] 3.2 Upload: type/size validated **client + server** (preview API re-validates); private-bucket storage + rate-limit still TODO
- [x] 3.3 Image asset-pack generator (server): one design → 6 × 2000px JPGs (flat, framed, in-hoop, detail, scale, info-card), watermarked + clean, under 1MB — `lib/etsy-listing-kit/generator.ts`, verified rendering all six + preview API
- [x] 3.4 Checkout API: `mode:'payment'`, $3, metadata `experiment_id`+`order_id`, order row created + design stored before redirect; attribution captured — `app/etsy-listing-kit/api/checkout`
- [x] 3.5 Webhook API: signature-verified, idempotent on event id, scope+paid guards, `checkout.session.completed` → paid → idempotent fulfillment (generate 6 clean → store) — `app/etsy-listing-kit/api/webhook`. Email still TODO
- [x] 3.6 Result page + order/download APIs: post-payment retrieval, polls till fulfilled, per-image signed URLs (7-day TTL) **and a "Download all (.zip)"** via a dependency-free zip writer — `result` + `api/order` + `api/download` + `lib/zip.ts`, no account
- [x] 3.7 Transactional email: provider-agnostic adapter (Resend if `RESEND_API_KEY`, else safe logged no-op — no new account); "your images are ready" HTML+text; wired into fulfillment, idempotent via `email_message_id` — `lib/etsy-listing-kit/email.ts`
- [x] 3.8 Analytics layer: typed funnel events wired (`landing_view`, `upload_started`, `preview_viewed`, `checkout_started`, `result_delivered`, `payment_cancelled`); GA4 client (gtag) + server purchase (Measurement Protocol, once on fulfillment); UTM/click-id persisted through Checkout — `lib/etsy-listing-kit/analytics.ts` (no-op without GA keys)
- [x] 3.9 Owner view at `/admin/etsy-listing-kit` (gated by the hub's existing `hub-edit`/`ADMIN_SECRET` middleware): orders table (status, amount, mode, email, fulfilled, attribution), revenue-target progress bar, failed orders highlighted. Read-only — retry/refund tooling is a follow-up
- [x] 3.10 Recovery: cancelled-payment banner (`?canceled=1`); **auto-refund** on failed fulfillment (webhook catches → `refundFailedOrder` full refund + apology email, idempotent via `shouldRefund` guard) + result page shows "you're covered" — `lib/etsy-listing-kit/refund.ts`, 4 tests

## 4. Revenue test

- [x] 4.1 `revenue:test` script + `pnpm revenue:test`: queries live Stripe by `experiment_id`, post-launch timestamp, minus refunds, excl tax, dedup; exits non-zero until $100; config in `lib/etsy-listing-kit/config.ts`. Verified: reports INACTIVE/red with no key (exit 3) — starts failing honestly
- [x] 4.2 Unit tests: `revenue.ts` qualification (test/live, full/partial refund, wrong/missing metadata, out-of-window, pre-launch, unpaid, failed, dedup, sums, CLI parity) + `webhook-logic.ts` (scope, unpaid, duplicate event, retry) + email no-op — 20 tests passing (`tests/etsy-listing-kit/`)

## 5. QA

- [x] 5.1 Automated (vitest): 44 tests — pure logic (revenue qualification, webhook decision, refund guard, upload, zip, email) + **route integration** (checkout metadata/validation, webhook signature/scope/idempotency/auto-refund, preview watermark-only/errors) via mocked Stripe/Supabase/generator
- [ ] 5.2 E2E happy path (test card) → paid → fulfilled → download → email → analytics events
- [ ] 5.3 E2E cancelled payment, duplicate webhook, processing failure/refund
- [~] 5.4 Manual §1 walkthrough on preview deploy (first-time visitor, mobile, keyboard, invalid input, refund path) — happy-path walkthrough done **on production** 2026-07-27 (feedback filed: #330/#335/#336); mobile/keyboard/invalid-input/refund passes still open
- [x] 5.5 Accessibility: palette WCAG-AA audited (design.md); fixed a nested-interactive dropzone → native button is the keyboard/AT control; landing component test asserts named CTA + focusable control + scoped file input; mobile 375px verified rendering

## 6. Deploy

- [~] 6.1 Preview deploy (Vercel), test-mode Stripe, smoke test full flow — **superseded**: went live from the start (STRIPE_MODE toggle); production smoke test replaced the test-mode pass
- [x] 6.2 Launch checklist: Katy sets live Stripe keys + registers live webhook; record production launch timestamp for revenue window; flip to live; production smoke test — done 2026-07-25→27: live keys set, live webhook `we_1TxF9BKdCjejJ0FM…` enabled at `labs.beckharrisdesign.com/etsy-listing-kit/api/webhook`, live $3 self-purchase fulfilled 2026-07-27 (verified in Stripe + Supabase 2026-07-30). `ELK_LAUNCHED_AT` confirmed set in Vercel (added ~2026-07-27). **Decision (Katy, 2026-07-30): the revenue window excludes testing** — at ad turn-on, bump `ELK_LAUNCHED_AT` to the turn-on timestamp (`vercel env` + redeploy) so the \$3 self-purchase falls outside the window; refunding it is the fallback if the timestamp isn't bumped
- [~] 6.3 Prepare (do not fund) the $1/day ad campaign + UTM convention; Katy performs turn-on — plan + UTM convention merged (PR #334); **campaign not yet populated** (Katy, 2026-07-30); turn-on pending. Turn-on checklist: populate campaign per #334 → bump `ELK_LAUNCHED_AT` to now (see 6.2) → fund

> Stop rule: after tasks.md, wait for approval before `/opsx:apply`.
