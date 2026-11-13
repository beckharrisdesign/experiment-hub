# Estate Sale Planner

Film a walkthrough of a parent's house → a vision model flags what might be worth something
→ every item headed to keep, sell, or donate (toggle any time) → open an item to correct it,
add a detail shot of a stamp or seam for a re-read, or remove it → film another room on
another day and it joins the same walkthrough → one tap to schedule a donation pickup →
save or print the sell list. Free to use; the one planned fee is the sold-price lookup,
not wired yet (review queue #32). No haul-away (#7).

**Status:** Built on MVDS 0.5.0 through round 05a (photos, app shell); 05b accounts + record and 05c recrop + actuals are proposed and waiting on Katy (autonomous build; see the review queue before trusting any default).

- **Founder intent:** [`docs/intent.md`](docs/intent.md)
- **Review queue (autonomous defaults, none approved until Katy says so):**
  [`docs/review-queue.md`](docs/review-queue.md)
- **Round 05 proposal (photos, recrop, app shell, system of record — awaiting veto):**
  [`docs/round-05-proposal.md`](docs/round-05-proposal.md)
- **Lifecycle (OpenSpec, `bhd-experiment`):**
  [`openspec/changes/estate-sale-planner`](../../openspec/changes/estate-sale-planner) —
  `explore.md` → `propose.md` → `apply.md` → `archive.md`
- **Build changes (lite, code ships here), archived 2026-11-11:**
  [`estate-sale-planner-build`](../../openspec/changes/archive/2026-11-11-estate-sale-planner-build) ·
  [`estate-sale-planner-sold-comps`](../../openspec/changes/archive/2026-11-11-estate-sale-planner-sold-comps) ·
  [`esp-server-sales`](../../openspec/changes/archive/2026-11-11-esp-server-sales). Current specs:
  `walkthrough-triage`, `item-correction`, `sold-comps-lookup`, `esp-server-sales`, `esp-app-header`
  under [`openspec/specs/`](../../openspec/specs/)
- **Surface:** in-hub route `app/estate-sale-planner/` on MVDS, like `etsy-listing-kit` and
  `svg-to-stitch`; deploys with the hub.
- **Notion row:** <https://app.notion.com/p/3f8b908d7b378191bcddf0b10d2a49bb>
- **Figma:** board `uafykXQHdW2h3YpBAy3Hfv` (flow) · design file `p75qmqHxUBh0TDLAUUXUmn` (surface pair)

## Checkpoints

Approved 2026-11-12. The thresholds are the ones set in
[`propose.md`](../../openspec/changes/estate-sale-planner/propose.md) (Validation Plan), with one
change: **"≥ 2 paid Sell Sheets" is dropped** until a fee is wired (the planned fee is the
sold-price lookup, review queue #32). **Day 0 is not set yet:** it is the day Katy posts it (the
r/declutter-style threads) or turns on the optional $15 search burst. Testing on her own device
never counts.

| Checkpoint | Date | What to check |
| --- | --- | --- |
| Day 0 | **not set** (write it here) | The day it's posted or the search burst is on |
| Day 7 | day 0 + 7 | Walkthrough starts so far: on pace for 25? |
| Day 14 | day 0 + 14 | **Decision**, below |

**Decision at day 14:**
- ✅ **Keep going** (Unit 2: sell-side referral + the real pickup deal; re-score) if **25+ starts**,
  **≥ 40 %** of starts finish the sort, and **5+ pickup taps**.
- 🔁 **Change the sorting screen, not the idea**, if starts are met but finishing or taps miss: one
  iteration on the swipe surface, then re-measure.
- 🛑 **Stop** if **< 10 starts with the search burst, or < 5 without**, or the proxy user overrides
  **> 60 %** of sell flags or calls a price band absurd on something they know the value of, or
  **model cost per walkthrough can't be held under $1.00** (all three are propose.md's kill
  criteria).

**Where the numbers come from:**
- **Starts:** rows in `esp_sales` created on or after day 0, excluding Katy's device. Each new
  walkthrough is one row, and the table carries `device_hash`, so it can be filtered. Not GA4's
  `esp_start`: that fires whenever the planner opens (the sale store's mount effect), including
  visits that never start a sale. GA4's `esp_new_walkthrough` isn't usable either: it only fires
  when the person already has a sale, so it misses everyone's first one.
- **Finished sort:** GA4 `G-120M120GDY`, event `esp_swipe_complete` (filter
  `experiment_slug = estate-sale-planner`). GA4 events carry no device, so **before day 0 Katy
  turns GA off on her own devices**: in each browser's console on the hub, run
  `localStorage.setItem("analytics_optout", "true")`. The hub's `trackEvent` sends nothing while
  that is set ([`lib/analytics/ga.ts`](../../lib/analytics/ga.ts)). Set on Katy's desktop
  browser 2026-11-12; her phone is not done yet.
- **Pickup taps:** `esp_events` rows with `event = 'esp_exit_tap'` (only exit taps and checkout
  starts are written there). That table has no device column either: don't tap the pickup link
  while the test runs.
- **Proxy-user overrides and absurd bands:** from the proxy user's grading of their own house, as
  propose.md's method describes (for each *sell* item: "would I have known?", "is the band
  plausible?"). Recorded by hand: GA4's `esp_sell_override` can't be tied to one person.
- **Cost per walkthrough:** `esp_costs`, summed per `sale_id` for sales started on or after day 0
  (model calls only: `kind in ('walkthrough','reread','query','comps')`). The per-sale query is
  [`docs/cost-per-sale.sql`](docs/cost-per-sale.sql); change its 30-day window to day 0. Cents are
  estimates from token counts × the `MODEL_PRICES` table.
- **Katy's device:** `device_hash` in `TEST_DEVICE_HASHES`
  ([`lib/estate-sale-planner/config.ts`](../../lib/estate-sale-planner/config.ts)). If she clears
  that browser's site data it becomes a new device: update the hash before day 0.
- **Before day 0** (read 2026-11-12): 7 saved walkthroughs, 2026-11-03 → 06, 1 of them on Katy's
  device; 0 pickup taps. All pre-test, so none count.

| Checkpoint | Date | Starts (`esp_sales`, not Katy) | Finished sort (GA4) | Pickup taps | Proxy-user overrides of sell flags | Highest model cost per walkthrough |
| --- | --- | --- | --- | --- | --- | --- |
| Day 7 | | | | | | |
| Day 14 | | | | | | |

## Run locally

```bash
pnpm dev   # hub app on :3000 → http://localhost:3000/estate-sale-planner
```

Works with **no keys**: with neither `OPENAI_API_KEY` nor `ANTHROPIC_API_KEY` the flag route
serves the checked-in fixture house (`lib/estate-sale-planner/fixtures/flags.json`) and the
UI says so; without Stripe the summary says payments aren't configured and the free print
still works. Everything else is the hub's shared rails (`.env.example`, Estate Sale Planner
block): `OPENAI_API_KEY` for the vision pass (Anthropic as the alternate), `SUPABASE_URL` +
`SUPABASE_SERVICE_ROLE_KEY` for `esp_events` / `esp_sheets`
(`supabase/migrations/016_esp_sell_sheets.sql`), the shared `STRIPE_SECRET_KEY_<MODE>` pair
plus this route's own `ESP_STRIPE_WEBHOOK_SECRET_<MODE>`.

## Test

```bash
npx vitest run tests/estate-sale-planner   # 76 tests: sampler, reducer (destinations, CRUD), vision + refine, thumbs, sheet, five routes
```

## Architecture (key files)

| Area | File |
| --- | --- |
| Budget, models, detail-shot caps, pickup links, Sell Sheet price (unlinked) | `lib/estate-sale-planner/config.ts` |
| Frame sampling (pure) / browser capture / thumbnails | `lib/estate-sale-planner/{frames,capture,thumbs}.ts` |
| Vision pass: zod schema, prompt, fixture, provider pick | `lib/estate-sale-planner/flag.ts` |
| Vision adapters (OpenAI default, Anthropic alternate) | `lib/estate-sale-planner/vision/{openai,anthropic,schema}.ts` |
| Session reducer (destinations, undo, edit / remove / add, re-reads) | `lib/estate-sale-planner/session.ts` |
| Detail-shot re-read (schema, prompt, provider pick) | `lib/estate-sale-planner/refine.ts` |
| Active session + on-device history | `lib/estate-sale-planner/storage.ts` |
| Sell Sheet shapes + validation (pure) | `lib/estate-sale-planner/sheet.ts` |
| Supabase (events, sheets, buyer email) / Stripe | `lib/estate-sale-planner/{db,supabase-admin,stripe}.ts` |
| Flag route (budget re-check, throttle, fixture mode) | `app/estate-sale-planner/api/flag/route.ts` |
| Exit route (counted row → donation pickup redirect) | `app/estate-sale-planner/api/exit/route.ts` |
| Refine route (item + detail shots → better read) | `app/estate-sale-planner/api/refine/route.ts` |
| Checkout / webhook (Stripe is the source of truth) | `app/estate-sale-planner/api/{checkout,webhook}/route.ts` |
| Screens | `app/estate-sale-planner/{Capture,FrameGrid,Lists,Swipe,Exit,ItemDetail,AddItem,History}.tsx`, `summary/page.tsx`, `sheet/[id]/page.tsx` |
| Pieces | `app/estate-sale-planner/{ItemCard,DestinationToggle,BottomNav}.tsx` |

## MVDS

Built on `@beckharrisdesign/mvds@0.5.0` (the gate from founder intent). The hub's
`.mvds-theme` wrapper gives the route plain MVDS tokens, not the hub skin.
