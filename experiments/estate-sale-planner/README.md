# Estate Sale Planner

Film a walkthrough of a parent's house → a vision model flags what might be worth something
→ two lists (sell / keep-toss) → swipe to decide → one tap to call the haul-away truck.

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

Works with **no keys**: without `ANTHROPIC_API_KEY` the flag route serves the checked-in
fixture house (`lib/estate-sale-planner/fixtures/flags.json`) and the UI says so. With the
key set, frames go to the vision model (`lib/estate-sale-planner/config.ts` holds the frame
budget and model).

## Test

```bash
npx vitest run tests/estate-sale-planner   # 28 tests: sampler, session reducer, flag parsing, both routes
```

## Architecture (key files)

| Area | File |
| --- | --- |
| Budget, model, haul-away links | `lib/estate-sale-planner/config.ts` |
| Frame sampling (pure) / browser capture | `lib/estate-sale-planner/{frames,capture}.ts` |
| Vision pass + zod schema + fixture | `lib/estate-sale-planner/flag.ts` |
| Session reducer (lists, decisions, undo) | `lib/estate-sale-planner/session.ts` |
| Flag route (budget re-check, throttle, fixture mode) | `app/estate-sale-planner/api/flag/route.ts` |
| Exit route (counted tap → redirect) | `app/estate-sale-planner/api/exit/route.ts` |
| Screens | `app/estate-sale-planner/{Capture,FrameGrid,Lists,Swipe,Exit}.tsx`, `summary/page.tsx` |

## MVDS

Built on `@beckharrisdesign/mvds@0.5.0` (the gate from founder intent). The hub's
`.mvds-theme` wrapper gives the route plain MVDS tokens, not the hub skin.
