# Scaffold audit — Experiment Hub (for `etsy-listing-kit`)

The hub already provides everything the experiment needs; this run **reuses**, does not rebuild.

## Capabilities already provided

| Area | Provided by | Reuse for this experiment |
| --- | --- | --- |
| Framework / runtime | Next.js 16, React 19, TS 5.9 | Paid route + API handlers |
| Package manager | pnpm 10 (root); some experiments use npm | Follow README per-surface; root = pnpm/turbo |
| Monorepo | pnpm-workspace + turbo (`build`/`test`/`lint` `--concurrency=2`) | Respect concurrency cap (8GB M1) |
| Design system | `@beckharrisdesign/mvds` v0.2.0 (tokens.css, styles.css, components; contrast/principles checks) | Product-experience package — landing + flow UI |
| DB | Supabase (`@supabase/supabase-js`), migrations under `supabase/` | `orders` table + RLS |
| Deploy | Vercel (`vercel.json`), preview + prod | Preview deploy (prod gated) |
| OpenSpec | 4 local schemas; CLI `@fission-ai/openspec`; skills in `skills/openspec-*.md` | `experiment-hub-lite` change (this dir) |
| Experiments | `experiments/<slug>/{docs,landing,prototype}`; ports in `data/prototypes.json` | New slug, port 3011 |
| Analytics | Existing hub submission/analytics wiring | GA4 purchase event layer |
| Testing | Vitest (`test`, `test:live`), Playwright | Revenue-test logic + webhook tests |
| Middleware/auth | `middleware.ts`, admin routes | Protect owner/orders view |

## Commands discovered

- Dev: `pnpm dev` · Build: `pnpm build` (turbo, concurrency 2) · Test: `pnpm test` / `pnpm test:all` · Lint: `pnpm lint`
- Skills sync: `pnpm skills:sync` · Link agent dirs: `bash scripts/link-agent-dirs.sh`
- OpenSpec: `npx @fission-ai/openspec@latest` + `/opsx:*` skills

## Conventions that must be preserved

- Edit `rules/` and `skills/` only (CLAUDE.md is an index).
- Conventional commits; `claude/<change-name>` branch; PRs **ready-for-review** (Copilot auto-review); never merge.
- OpenSpec artifact stop-rules (proposal → approval → specs/design/tasks).
- Figma as-is + proposed pair required for any UI change in design.md.
- Cap parallel node workloads (`--concurrency=2`) — machine constraints.

## Existing Stripe integration — REUSE (corrected 2026-07-24)

**An earlier audit note wrongly claimed "no Stripe anywhere."** There is a full, working
Stripe implementation in `experiments/simple-seed-organizer/prototype/app` — reuse its
patterns rather than building fresh:

| Asset | Path | Reuse for `etsy-listing-kit` |
| --- | --- | --- |
| Stripe SDK | SSO prototype uses `stripe` ^20.3.1 | Hub root now adds `stripe` ^22.3.2 — newer major; patterns carry over but verify any API-shape changes |
| Checkout route | `app/api/stripe/checkout/route.ts` | Copy pattern, switch `mode: 'subscription'` → **`mode: 'payment'`** (one-time) |
| Webhook (signature-verified) | `app/api/stripe/webhook/route.ts` | Copy `constructEvent` verification + event switch; handle `checkout.session.completed` → mark order paid → fulfill |
| Portal / subscription routes | `app/api/stripe/{portal,subscription}/route.ts` | **Not needed** (no subscription/accounts) |
| Rate limiting | `lib/rate-limit.ts` | Reuse on checkout + upload |
| Supabase server/admin clients | `lib/supabase-server.ts`, `lib/supabase-admin.ts` (`createAdminSupabaseClient`) | Reuse for webhook DB writes |
| Test mock | `app/__mocks__/stripe.ts` | Reuse for webhook/checkout unit tests |
| Legal pages | `app/{privacy,terms}/page.tsx`, `pricing/page.tsx` | Adapt copy for one-time purchase |
| Env convention | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PRICE_*` | Same names |

**Key differences to implement:** one-time `payment` mode (not subscription); **no user
accounts** — link the order via Stripe `metadata` (`experiment_id`, internal `order_id`)
and `client_reference_id`, not a Supabase auth user; fulfillment delivers the asset pack
rather than flipping a tier; idempotency via a unique constraint on the Stripe event/session id.

## Missing capabilities (genuinely net-new for this experiment)

- **One-time-payment order model** — new `orders` table + states (created→paid→fulfilled…); the SSO pattern models subscriptions, not one-off orders.
- **Server-side image transformation** — the asset-pack generator (resize/mockup compositing). No precedent found.
- **Transactional email** — no provider wired (only Notion/Supabase). Detect env; else minimal adapter, no new account.
- **`revenue:test`** — new auditable, `experiment_id`-scoped command + tests.

## Risks

- 8GB M1 / ~92% disk: avoid heavy parallel builds; keep image processing bounded.
- `.claude/worktrees` env noise (unbuilt mvds, no openspec CLI locally) → CI is authoritative for tsc/vitest.
- Stripe **code/patterns exist** (SSO prototype) and are reusable; only **live/test API keys** are absent for this experiment → integration is *pattern-ready, credential-required*, not "active", until keys are set. Email has no provider wired at all.

## Do NOT use / do NOT build

- No second spec framework, token system, component library, analytics system, or deploy structure — the hub already has each.
- Do not modify or publish `@beckharrisdesign/mvds`; record reusable additions as candidates instead.

## Safe future-scaffold improvement candidates

- A reusable Stripe one-time-payment + webhook adapter (if this experiment validates) → promote to `packages/*`.
- A shared `revenue:test` harness parameterized by `experiment_id`.
