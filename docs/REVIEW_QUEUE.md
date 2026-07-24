# Review queue — Etsy Listing Kit

Consequential defaults taken autonomously. **None are approved until you say so.**
Statuses: `REVIEW_REQUESTED` · `DEFAULT_IMPLEMENTED` · `BLOCKS_PRODUCTION` · `APPROVED` · `REVISE` · `SUPERSEDED`.

| # | Decision | Default selected | Alternatives | Evidence / rationale | Blocks prod? | Cost to change later | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | OpenSpec schema | `experiment-hub-lite` (+ docs/ for revenue/market) | `bhd-experiment` parent + lite child | bhd founder stores are "pending" per config.yaml; lite is the repo default for spikes | No | Low (re-file change) | DEFAULT_IMPLEMENTED |
| 2 | Product wedge | One design file → Etsy asset pack (embroidery sellers) | Seed→garden, Best Day Ever, photo-banner | Your pick this session; strongest bounded paid transform | No | High (different product) | APPROVED |
| 3 | Price | **$3 one-time, fixed-per-use** | $4; $5; PWYW $3 min | Katy 2026-07-24: $9 disproportionate vs ~$4 typical digital listing; $3 = below one listing's price, lowest friction. Config-driven | No | Low (config) | APPROVED |
| 4 | Revenue target | $100 / 14 days | $250–$1k / 30d | Your pick this session | No | Low (auditable config) | APPROVED |
| 5 | Accounts | None — download via signed link + email | Account-gated retrieval | Brief: no accounts unless essential | No | Medium | DEFAULT_IMPLEMENTED |
| 6 | Stripe mode | **Live mode at launch** (build/test on test mode first) | Test only | Katy authorized live payments 2026-07-24. **Live secret keys set by Katy in Vercel — I never handle them** | No (authorized) | Low (env swap) | APPROVED |
| 7 | Deploy target | **Production** (after smoke tests pass) | Preview only | Katy authorized production deploy 2026-07-24 | No (authorized) | Low | APPROVED |
| 8 | Ad spend | **$1/day cap** ($14 over 14d), platform-agnostic — you authorized 2026-07-24 | $0; higher budget | Katy authorized $1/day, no platform preference. I prepare + cap the campaign; **you** perform the turn-on/fund action (money out, coupled to live launch) | No (build); funding step is yours | Low (pause) | APPROVED (budget) / REVIEW_REQUESTED (launch) |
| 9 | Figma writeback | **On for this change** — generate as-is/proposed frames, review, then implement from them | Off; code-only | Katy 2026-07-24: "both — Figma frames then code"; Figma is a first-class evidence source | No | Low | APPROVED |
| 10 | Email provider | Detect existing; else scaffold adapter, no new account | New provider account | Brief: don't create external accounts | No | Low | DEFAULT_IMPLEMENTED |
| 11 | Asset pack contents (v1) | Curated **~6 images, all 2000px square** (flat render, framed mockup, in-hoop mockup, detail crop, scale shot, info card); **no video, no hero, no alt sizes** | Up to 20 imgs + 2 videos | Katy verified Etsy limits (20 img/2 vid) + chose curated-images-no-video 2026-07-24; Etsy handles display sizing | No | Low (add types) | APPROVED (set) / mockup props REVIEW_REQUESTED |

| 12 | Figma breakpoints | **Desktop 1024 + Mobile 480 both built** | Desktop only | Katy 2026-07-24: "do mobile too"; ad traffic is mobile-heavy | No | Low | APPROVED |
| 13 | Color palette | **MVDS neutral base + terracotta `#b24a2e` primary + ochre `#d99a2b` 2nd accent + cream `#fdf3ee`**, light theme | Hub green; pure-neutral MVDS; single accent | Katy 2026-07-24: caught hub-green override; then asked for a 2nd terracotta accent ("super boring"). Craft-warm, WCAG AA | No | Medium (recolor) | APPROVED (system) / exact hues REVIEW_REQUESTED |
| 14 | Typography | **Fraunces headings + Inter body** | MVDS default (Inter-only) | Product display choice; MVDS default is Inter for both | No | Low | REVIEW_REQUESTED |
| 15 | WCAG contrast | **AA audited + fixed** (no green-on-white; ink/gray text; white-on-terracotta) | — | Katy 2026-07-24 flagged light-green-on-white; audit also caught muted-green body text (2.92 FAIL) | No | Low | APPROVED |

| 16 | Funnel hosting | **In the hub Next.js app** (`app/etsy-listing-kit/`) → deploys to the Vercel production subdomain | Standalone prototype app | Deploys straight to the approved production subdomain; reuses hub Vercel/Supabase/Stripe-lib. Couples experiment to hub (acceptable, removable) | No | Medium (extract later) | DEFAULT_IMPLEMENTED |

## Launch prerequisites (your actions, not blockers to building)

Both production boundaries are now **APPROVED**. What still requires *you* at launch time:

- **Set live Stripe keys** (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) + register the live webhook endpoint in the Stripe Dashboard — I build for live mode but cannot handle the secrets.
- **Fund/turn on the ad campaign** ($1/day) — I build + cap it; the money-out step is yours (#8).
- I verify the full flow on **test mode + preview** first; production deploy + live cutover happen after smoke tests pass.
- **Production URL = the hub's `*.vercel.app` subdomain** (Katy, 2026-07-24) — no custom domain, no DNS changes. Keeps launch simple and within the no-DNS boundary.
