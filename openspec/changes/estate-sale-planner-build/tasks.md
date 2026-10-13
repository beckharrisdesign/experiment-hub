# Tasks: estate-sale-planner-build

> **Gate:** §2–§4 do not start until the next `@beckharrisdesign/mvds` release is on npm
> and folded in (founder instruction, 2026-10-13). §1 checkboxes are claims — tick only
> with a dated receipt (PR, screenshot, test run). Pending founder decisions live in
> [`experiments/estate-sale-planner/docs/review-queue.md`](../../../experiments/estate-sale-planner/docs/review-queue.md),
> not here.

## 1. User outcomes (from spec scenarios)

- [ ] 1.1 User films a walkthrough and confirms the frames
- [ ] 1.2 User has photos instead of video
- [ ] 1.3 Flags render as Sell and Keep / Toss
- [ ] 1.4 The model finds nothing worth flagging
- [ ] 1.5 User sorts the Keep / Toss list
- [ ] 1.6 User overrides a Sell flag
- [ ] 1.7 User taps the haul-away button
- [ ] 1.8 Haul-away is not available in the user's area
- [ ] 1.9 User prints the sell summary

## 2. Prototype shell

- [ ] 2.0 **MVDS gate** — `npm view @beckharrisdesign/mvds version` shows the new release;
      bump `package.json` + `pnpm-lock.yaml`; re-read its CHANGELOG migration notes; re-check
      any `z-*` stacking in the hub (`z-overlay` / `z-modal` etc. begin emitting).
- [ ] 2.1 In-hub route `app/estate-sale-planner/` with `layout.tsx` (`.mvds-theme` wrapper,
      metadata) and `page.tsx`; dev command is the hub's: `pnpm dev` →
      `http://localhost:3000/estate-sale-planner`. No separate port (in-hub route, like
      `etsy-listing-kit`).
- [ ] 2.2 `lib/estate-sale-planner/config.ts` — model name, frame budget (interval, max
      frames, downscale width), haul-away link + placeholder referral param, fallback link.
- [ ] 2.3 `.env.example` registry line for `ANTHROPIC_API_KEY` (vault entry is Katy's); the
      route renders without the key and says so instead of crashing.

## 3. Implementation

- [ ] 3.1 Capture: `<input accept="video/*,image/*" capture="environment">`; `<video>` →
      canvas frame sampler as a pure module `lib/estate-sale-planner/frames.ts` (interval,
      near-duplicate drop by downscaled-histogram distance, budget cap); frame grid + count
      + Send; nothing leaves the device before Send.
- [ ] 3.2 Vision route `app/estate-sale-planner/api/flag/route.ts`: batches frames to the
      Anthropic API (read the `claude-api` skill first), structured JSON response
      `{items: [{name, room, band, reason, confidence, flagged}]}` validated server-side;
      fixture response under `lib/estate-sale-planner/fixtures/` for tests and the no-key
      demo.
- [ ] 3.3 Lists: Sell (band, reason, confidence) and Keep / Toss grouped by room; honest
      empty state for Sell.
- [ ] 3.4 Swipe: one item at a time, Keep / Toss as buttons and gestures, Undo, Sell →
      Keep/Toss override counted; session state in `sessionStorage` with the "closing the
      tab loses this" line on screen.
- [ ] 3.5 Exit: `api/exit/route.ts` records the tap (session id, item count, fallback flag)
      then redirects; single centered CTA on its own line; "find a hauler" fallback.
- [ ] 3.6 Summary: print-friendly Sell page with the "not an appraisal" line first.
- [ ] 3.7 Analytics events: start, frames-confirmed, flags-returned, swipe-complete,
      exit-tap, sell-override (the Propose thresholds read off these).

## 4. QA

- [ ] 4.1 Manual walkthrough on a phone (capture → send → lists → swipe → exit → print),
      at 480 px and 1024 px.
- [ ] 4.2 Automated: vitest under `tests/estate-sale-planner/` — frame sampler budget and
      dedupe on a synthetic frame set; flag-response validation on the fixture; exit route
      counts then redirects; no-key path renders.
- [ ] 4.3 `pnpm typecheck` + `pnpm lint` clean; MVDS components only (no bespoke chrome).
