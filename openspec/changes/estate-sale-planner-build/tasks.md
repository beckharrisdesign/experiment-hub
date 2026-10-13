# Tasks: estate-sale-planner-build

> **Gate (closed 2026-10-13):** MVDS 0.5.0 published 2026-10-13; folded in at `3c2870a`.
> §1 checkboxes are claims — ticked only with a dated receipt (test run, curl, screenshot).
> Pending founder decisions live in
> [`experiments/estate-sale-planner/docs/review-queue.md`](../../../experiments/estate-sale-planner/docs/review-queue.md),
> not here.

## 1. User outcomes (from spec scenarios)

- [~] 1.1 User films a walkthrough and confirms the frames — *code path built*
      (`lib/estate-sale-planner/capture.ts` → `FrameGrid`); sampler budget/dedupe proven by
      `tests/estate-sale-planner/frames.test.ts` (2026-10-13). **Remains:** a real phone
      video through the camera input (needs a device; Katy or the named proxy user).
- [~] 1.2 User has photos instead of video — same as 1.1: `framesFromPhotos` built, not yet
      exercised on a device.
- [x] 1.3 Flags render as Sell and Keep / Toss — fixture-mode flag route 200 with 22 items /
      7 flagged (curl 2026-10-13); rendered lists at 480 and 1024 px
      (`assets/built-03-lists-*.png`; round 02.1 with images on the type ramp:
      `assets/built-02.1-lists-*.png`, 2026-10-13).
- [x] 1.4 The model finds nothing worth flagging — empty-Sell state rendered in `Lists.tsx`
      ("Nothing stood out…"); reducer path covered by `session.test.ts`. *Not screenshot.*
- [x] 1.5 User sorts the Keep / Toss list — `session.test.ts` (full pass leaves every item in
      exactly one list; undo restores last only); swipe surface rendered
      (`assets/built-04-swipe-mobile-480.png`; image-first card in round 02.1:
      `assets/built-02.1-swipe-mobile-480.png`).
- [x] 1.6 User overrides a Sell flag — `session.test.ts` ("overriding a Sell flag moves it off
      Sell and counts as an override"; band still on the item); `esp_sell_override` event.
- [x] 1.7 User taps the haul-away button — `exit-route.test.ts` + live curl: `302` →
      `tel:+18004685865`, structured record logged (2026-10-13).
- [x] 1.8 Haul-away is not available in the user's area — `fallback=1` → `302` → generic
      hauler link, record carries `fallback: true` (curl + test, 2026-10-13).
- [x] 1.9 User prints the sell summary — `/estate-sale-planner/summary` 200; "not an
      appraisal" Callout renders first; `window.print()` button. *Print layout not
      visually checked.*

## 2. Prototype shell

- [x] 2.0 **MVDS gate** — `npm view` showed 0.5.0 at 2026-10-13; bumped `package.json` +
      `pnpm-lock.yaml` (`3c2870a`); CHANGELOG migration notes read; hub uses no `z-*`
      utilities so no stacking change; tsc/eslint/vitest green on 0.5.0.
- [x] 2.1 In-hub route `app/estate-sale-planner/` with `layout.tsx` (`.mvds-theme`,
      metadata) and `page.tsx`; `pnpm dev` → `http://localhost:3000/estate-sale-planner`.
- [x] 2.2 `lib/estate-sale-planner/config.ts` — model, frame budget, haul-away links,
      placeholder referral, fallback link, session key.
- [x] 2.3 `.env.example` registry: Estate Sale Planner block — vision on the hub's
      `OPENAI_API_KEY` (Anthropic alternate), `ESP_*_VISION_MODEL` overrides,
      `ESP_STRIPE_WEBHOOK_SECRET_*`, Supabase tables; the flag route serves the fixture and
      says `configured: false` with no model key (round 02.3 — the round-01 entry
      registered an Anthropic key the hub does not hold).
- [ ] 2.4 Supabase migration `016_esp_sell_sheets.sql` (`esp_events`, `esp_sheets`, RLS on)
      — written and reviewed; **applying it to the live project is Katy's** (same as 007).

## 3. Implementation

- [x] 3.1 Capture: `<input accept="video/*" capture="environment">` + MVDS `Dropzone`;
      `frames.ts` (pure: `sampleTimes`, `selectFrames` with 8×8-grey dedupe and even
      thinning) + `capture.ts` (browser: seek/draw/encode); nothing leaves the device
      before Send.
- [x] 3.2 Vision route `api/flag/route.ts`: budget re-check, per-IP throttle (6/min),
      `flag.ts` with zod `FlagResponseSchema` via `client.messages.parse` +
      `zodOutputFormat`, `claude-opus-5-5`, refusal → 502; fixture
      `fixtures/flags.json` for tests and the no-key demo.
- [x] 3.3 Lists: Sell (image-first `Card`, room eyebrow, `CardTitle`, band `Badge`,
      confidence `Badge`, reason, Keep/Toss instead; two-column `Grid` at ≥ md) and
      Keep / Toss grouped by room with thumbs; honest empty state. Type on the MVDS ramp
      (round 02.1).
- [x] 3.4 Swipe: one image-first `Card` at a time (`shadow-lg`, `ring-foreground/15`),
      Keep/Toss buttons + pointer drag (80 px), Undo beneath; `session.ts` reducer;
      `sessionStorage` with the "closing the tab" line on the exit screen.
- [x] 3.5 Exit: `api/exit/route.ts` records `{event, session, count, fallback, via,
      referral}` then 302; single centered CTA; "They don't cover my area" fallback.
- [x] 3.6 Summary: print-friendly Sell table with the "not an appraisal" line first.
- [x] 3.7 Analytics: `esp_start`, `esp_frames_confirmed`, `esp_flags_returned`,
      `esp_swipe_complete`, `esp_sell_override`, `esp_exit_tap`, `esp_summary_print`
      (`lib/estate-sale-planner/analytics.ts` over the hub GA helper).
- [x] 3.8 Item images (round 02.1): `FlaggedItemSchema` gains `frame` + nullable normalized
      `box`; the prompt asks for both; `thumbs.ts` crops a 320 px square from the confirmed
      frame on-device (`cropRect` proven by `tests/estate-sale-planner/thumbs.test.ts`);
      `session.ts` carries `image` per item; `storage.ts` retries without images on a
      quota error. Fixture carries boxes (3 `null`) so demo mode shows the fallback too.
- [x] 3.9 Vision provider (round 02.3): `vision/openai.ts` (fetch, strict JSON schema from
      the zod schema via `vision/schema.ts`, `gpt-5`, high-detail data-URL frames, refusal
      → error) is the default on `OPENAI_API_KEY`; `vision/anthropic.ts` is the alternate;
      `flag.ts` picks by key order. `vision.test.ts` covers selection, schema, request
      shape, success / refusal / off-schema / HTTP failure (2026-10-13).
- [x] 3.10 Counted rows: `db.ts` `recordEvent` → `esp_events`, log line as fallback; the
      exit route and the checkout route call it (`exit-route.test.ts`, `checkout-route.test.ts`).
- [x] 3.11 Sell Sheet checkout + webhook: `api/checkout` (validate via `sheet.ts`, upsert
      `esp_sheets`, Stripe Checkout with `experiment_id` + `order_id`, paid session → link
      without a charge) and `api/webhook` (signature, ELK's decision logic scoped to this
      experiment, idempotent `markPaid`, buyer email → `experiment_submissions`, 5xx on DB
      failure). 11 route tests green 2026-10-13; live curl: 500 "Payments are not
      configured yet." without Stripe, 400 on a bad sheet, webhook 500 without a secret.
- [x] 3.12 Sheet page `sheet/[id]` (server, `force-dynamic`, `noindex`): 404 on unknown
      ids (curl), "settling" / "not unlocked" holding states, paid page on the 02.1 card
      with print + copy-link. Summary gains the paid CTA `Card`
      (`assets/built-02.3-summary-*.png`).

## 4. QA

- [ ] 4.1 Manual walkthrough on a phone (capture → send → lists → swipe → exit → print) —
      **Katy / proxy user**; needs `ANTHROPIC_API_KEY` set for the real vision pass.
- [x] 4.2 Automated: `tests/estate-sale-planner/` — 62 tests across sampler, reducer, flag
      parsing + no-key path, flag route (validation, budget, throttle), exit route
      (record + redirect), thumbnail crop geometry, vision provider + OpenAI adapter,
      sheet validation, checkout route, webhook route. Green 2026-10-13 (round 02.3).
- [ ] 4.4 **Katy:** apply migration 016; create the Stripe webhook endpoint for
      `/estate-sale-planner/api/webhook` (test mode first) and set
      `ESP_STRIPE_WEBHOOK_SECRET_TEST`; one test-mode purchase end to end (checkout → webhook
      → sheet unlocks → email row in `experiment_submissions`).
- [x] 4.3 `tsc --noEmit` and `eslint .` clean (0 errors; the two `set-state-in-effect`
      warnings match the hub's existing after-hydration `sessionStorage` reads). MVDS
      components only.
