# Estate Sale Planner

Film a walkthrough of a parent's house → a vision model flags what might be worth something
→ two lists (sell / keep-toss) → swipe to decide → one tap to call the haul-away truck →
save the sell list with photos as a $5 Sell Sheet at a shareable link.

**Status:** Built on MVDS 0.5.0, Validating next (autonomous build; see the review queue before trusting any default).

- **Founder intent:** [`docs/intent.md`](docs/intent.md)
- **Review queue (autonomous defaults, none approved until Katy says so):**
  [`docs/review-queue.md`](docs/review-queue.md)
- **Lifecycle (OpenSpec, `bhd-experiment`):**
  [`openspec/changes/estate-sale-planner`](../../openspec/changes/estate-sale-planner) —
  `explore.md` → `propose.md` → `apply.md` → `archive.md`
- **Build change (lite, code ships here):**
  [`openspec/changes/estate-sale-planner-build`](../../openspec/changes/estate-sale-planner-build)
- **Surface:** in-hub route `app/estate-sale-planner/` on MVDS, like `etsy-listing-kit` and
  `svg-to-stitch`; deploys with the hub.
- **Notion row:** <https://app.notion.com/p/3f8b908d7b378191bcddf0b10d2a49bb>
- **Figma:** board `uafykXQHdW2h3YpBAy3Hfv` (flow) · design file `p75qmqHxUBh0TDLAUUXUmn` (surface pair)

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
npx vitest run tests/estate-sale-planner   # 62 tests: sampler, reducer, vision providers, thumbs, sheet, four routes
```

## Architecture (key files)

| Area | File |
| --- | --- |
| Budget, models, haul-away links, Sell Sheet price | `lib/estate-sale-planner/config.ts` |
| Frame sampling (pure) / browser capture / thumbnails | `lib/estate-sale-planner/{frames,capture,thumbs}.ts` |
| Vision pass: zod schema, prompt, fixture, provider pick | `lib/estate-sale-planner/flag.ts` |
| Vision adapters (OpenAI default, Anthropic alternate) | `lib/estate-sale-planner/vision/{openai,anthropic,schema}.ts` |
| Session reducer (lists, decisions, undo) | `lib/estate-sale-planner/session.ts` |
| Sell Sheet shapes + validation (pure) | `lib/estate-sale-planner/sheet.ts` |
| Supabase (events, sheets, buyer email) / Stripe | `lib/estate-sale-planner/{db,supabase-admin,stripe}.ts` |
| Flag route (budget re-check, throttle, fixture mode) | `app/estate-sale-planner/api/flag/route.ts` |
| Exit route (counted row → redirect) | `app/estate-sale-planner/api/exit/route.ts` |
| Checkout / webhook (Stripe is the source of truth) | `app/estate-sale-planner/api/{checkout,webhook}/route.ts` |
| Screens | `app/estate-sale-planner/{Capture,FrameGrid,Lists,Swipe,Exit}.tsx`, `summary/page.tsx`, `sheet/[id]/page.tsx` |

## MVDS

Built on `@beckharrisdesign/mvds@0.5.0` (the gate from founder intent). The hub's
`.mvds-theme` wrapper gives the route plain MVDS tokens, not the hub skin.
