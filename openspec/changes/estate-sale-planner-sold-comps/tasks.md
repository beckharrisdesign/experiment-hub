# Tasks: estate-sale-planner-sold-comps

> §1 checkboxes are claims: ticked only with a dated receipt (test run, curl, screenshot).
> Pending founder decisions live in
> [`experiments/estate-sale-planner/docs/review-queue.md`](../../../experiments/estate-sale-planner/docs/review-queue.md)
> (#59–#76), not here. The visual target is Figma round **17**
> (<https://www.figma.com/design/LzaDhbJ8HPsLTZObccHnlW>, page `33:368`). Ships as two PRs
> (design D10): **PR 1** = sections 3.1–3.16, **PR 2** = sections 3.17–3.26.

## 1. User outcomes (from spec scenarios)

**Item correction**

- [x] 1.1 After a walkthrough, each photo is kept on the phone at up to 1600 px, and every item knows which photo it came from — `photos.test.ts`; Playwright run loaded the original on the source photo screen (2026-10-27)
- [x] 1.2 When phone storage runs short, the oldest sale loses its original photos first. Its items keep their pictures and every correction — `photos.test.ts` (eviction plan + IndexedDB)
- [ ] 1.3 An item whose original is gone still opens and can be renamed, re-priced, moved or removed. The photo actions say the photo is no longer on this device
- [x] 1.4 User opens an item's source photo and sees the whole photo, with this item outlined and the other items from that photo shown faintly — `assets/built-source-view-480.png`, `-1024.png`
- [ ] 1.5 When the model gave no box, the whole photo is the subject, and the user can draw a box
- [~] 1.6 User drags the box onto the clock instead of the table. The picture becomes the clock, and the name, price and reason update — reducer + route covered (`correction.test.ts`, `refine-route.test.ts`); **live re-read needs a key and a phone**
- [x] 1.7 If the re-read fails after an adjustment, the new box and picture stay, the old name and price stay, and the item says it hasn't been re-read yet — `correction.test.ts`
- [~] 1.8 User splits "three vases" into three items, each with its own picture and read — reducer tested; Playwright drew 2 boxes, Save enabled (`assets/built-source-split-480.png`); live read needs a key
- [~] 1.9 User draws a box around a lamp the model missed. A new item appears with that picture, marked as added by you, and is read — reducer tested; UI built, not driven
- [~] 1.10 User merges a lamp and its shade into one item, framed around both, and it is read — reducer tested; UI built, not driven
- [~] 1.11 User marks six Pyrex bowls as one lot. It is named and priced as a set and can be split back — reducer tested; naming as a set needs a keyed read
- [~] 1.12 User sends "this is actually a vintage Hermes - adjust pricing". That item's name, price and reason update and it shows what changed — `correction.test.ts`, `refine.test.ts`; live message needs a key
- [x] 1.13 A message changes only the item it was sent on — `correction.test.ts`
- [x] 1.14 User taps Undo on a change a message made, and the previous name, price and reason come back — `correction.test.ts`
- [ ] 1.15 If the call fails after a message, the item is unchanged and the message stays in the box to send again
- [~] 1.16 ~~User taps Looks right and the item shows as confirmed~~ — superseded, 2026-10-31, review queue #60: no confirmed state (founder: "Its in the app or its not."); Looks right removed. Was: — Playwright (`assets/built-item-confirmed-480.png`)
- [~] 1.17 ~~Any correction (adjust, split, merge, lot, add, message) confirms every resulting item without a separate tap~~ — superseded, 2026-10-31, review queue #60: no confirmed state (founder: "Its in the app or its not."). Was: — `correction.test.ts`
- [~] 1.18 ~~An unconfirmed item headed to Sell at a high price keeps the model's price, and no lookup runs~~ — superseded, 2026-10-31, review queue #60: no confirmed state (founder: "Its in the app or its not.")

**Sold-price lookup**

- [x] 1.19 A Sell item at $100 or more (the profile threshold) gets one search query and one lookup — `comps-lookup.test.ts` (fake provider); in the app, opening an ungated-yet-unlooked-up $250+ Sell item POSTed `/api/comps` once (2026-11-02)
- [x] 1.20 Keep, Donate, undecided or under-threshold items get no query and no lookup, and show the model's price with no comps line — `comps-lookup.test.ts`, `comps-route.test.ts` (server gate, tampered threshold), `comps-item.test.ts` (no band line)
- [~] 1.21 A Sell lot over the threshold is looked up as a set ("set of 6 Pyrex mixing bowls") — lot count reaches the query step and the fixture query (`comps-lookup.test.ts`); the model's set wording needs a keyed call
- [x] 1.22 When a message or photo correction changes what a gated item is, a new query runs (and reuses a fresh saved result) — `comps-item.test.ts` (lookups key on the subject: name, mark, lot size; not the band); store reuse in `comps-lookup.test.ts`
- [x] 1.23 The first lookup for a query calls the provider once and saves the results — `comps-lookup.test.ts`
- [x] 1.24 The same query within 90 days, from any sale, uses the saved results with no provider call — `comps-lookup.test.ts`
- [x] 1.25 Saved results older than 90 days are fetched again and replaced — `comps-lookup.test.ts`, `comps-parts.test.ts` (freshness)
- [x] 1.26 With 3 or more matching sales, the price is set from them and shows "Based on N sold" with links to some of them — band math and citations tested (`comps-lookup.test.ts`, `comps-item.test.ts`); the line renders from a seeded result (`assets/built-comps-line-428.jpg`, 2026-11-02); first keyed call 2026-11-03 returned 50 real sales and the parser read all 50 (`comps-parts.test.ts`, real body); keyed run 2026-11-03 (local, `pnpm dev`): via the route, "Lodge No. 8 cast iron skillet" → 50 found, 3 matched (vintage No. 8s only; lids and new stock dropped), $50–$100 from $59–$71, 3 links. **In the app the same item came back too-few:** the query step wrote "… 8 inch", missed the saved result, and the matching pass kept 0 of 50 similar listings. Same item, different answers — see the 2026-11-03 finding under 3.19; **fixed by D22 (3.27): the line shows live in the app, the same in a second sale** (`assets/built-comps-line-live-375.jpg`)
- [x] 1.27 With fewer than 3 matches, the model's price stays and no comps line shows — `comps-lookup.test.ts`, `comps-item.test.ts`
- [x] 1.28 When the family sets the price by hand, their price stays, and the comps stay visible for reference — `comps-item.test.ts` ("Set by you · Based on N sold")
- [~] 1.29 Each walkthrough records one cost row with the model, tokens and estimated cents — wired in `/api/flag` with `saleId`, row shape in `costs.test.ts`; migration 019 applied 2026-11-02; **confirm on the first real walkthrough in prod**
- [x] 1.30 A provider lookup records its price; an answer from saved results records a zero-cost cache hit — `comps-lookup.test.ts`, `costs.test.ts`; live 2026-11-03: first lookup wrote lookup 0.18¢ + query 0.012¢ + comps 0.038¢ (0.23¢); the repeat wrote a `cache_hit` lookup row at 0¢ plus the two model rows (0.048¢)
- [x] 1.31 If the cost table can't be written, the walkthrough, re-read or lookup still works and the failure is logged — `costs.test.ts`; seen live 2026-11-02: the dev server's Supabase key was unresolved, the log said `couldn't record a lookup row` and the lookup still answered
- [x] 1.32 With no provider key, a gated item keeps the model's price, shows no comps line, and the cost row says lookups aren't configured — `comps-route.test.ts`, `comps-lookup.test.ts`; in the app (2026-11-02) the item stored `not-configured` and kept $250–$500
- [x] 1.33 When the provider errors, times out or is out of quota, the item keeps the model's price, the failure is recorded, and the next visit tries again — `comps-lookup.test.ts`, `comps-parts.test.ts` (429/`quota_reached`, 401, timeout), `comps-item.test.ts` (`retryDue`)

## 2. Prototype shell

- [ ] 2.1 No new shell: the in-hub route `app/estate-sale-planner/` and its AppShell already exist. Run it with `pnpm dev` and go to `http://localhost:3000/estate-sale-planner` (fixture mode without keys).
- [ ] 2.2 Branch off the latest default branch for PR 1 (`claude/esp-correction`). PR 2 (`claude/esp-sold-comps`) branches off PR 1 once it merges.
- [ ] 2.3 Test first (`rules/principles.mdc`). Each 3.x item lands its failing vitest under `tests/estate-sale-planner/` before the code.

## 3. Implementation

### PR 1: correction and the item screen

- [x] 3.1 **Finer bands (D18).**
  - `BANDS` (`flag.ts`) becomes the ten-band list.
  - The `BAND_GUIDE` base rate becomes "$1–$10".
  - Every band gets a `RANGE` in `tally.ts`, and the old bands stay readable as legacy ranges.
  - Fixtures move to the new bands.
  - Tests: `calibration.test.ts`, `tally.test.ts`, the vision and refine schema tests.
- [x] 3.2 **Brand (D20).** Add an `.esp-theme` class in `app/globals.css` that redefines `--primary`, `--primary-foreground`, `--ring`, `--background`, `--card`, `--muted` and `--border`, and apply it in `layout.tsx` next to `mvds-theme`.
- [x] 3.3 **Rooms out of the UI (D12).**
  - No room label on ItemCard, ItemDetail, Swipe, the summary or the sheet.
  - No Room field on ItemDetail or AddItem.
  - Lists is no longer grouped by `byRoom`.
  - Copy becomes "Take photos" / "Add more photos". `room` stays in the schema.
- [x] 3.4 **Breadcrumb (D11).**
  - `chromeFor` returns `crumbs` plus `title`.
  - `TopBar.tsx` renders `<nav aria-label="Breadcrumb">`, the last ancestor is Back, and leading crumbs collapse to `…`.
  - `routes.test.ts` asserts every trail.
- [x] 3.5 **Segmented destination toggle (D16).**
  - `DestinationToggle` gets a full-width `variant="segmented"`: `role="radiogroup"`, arrow keys move the selection, on MVDS tokens.
  - Used on the item screen.
  - Unit test for keyboard selection.
- [x] 3.6 **Sticky item header (D21).** The breadcrumb and toggle share the MVDS `Chrome position="top"` block on the item route. The breadcrumb is a slot.
- [x] 3.7 **Item screen layout (D15, D17, D19).** Round 17 order:
  1. Name and price as `text-h2`, the price in success colour, top-right.
  2. The photo.
  3. Lot badge · Source photo (the "Looks right" check was removed 2026-10-31, #60).
  4. Reason and band line.
  5. Message.
  6. Correct it (What is it?, Value band).
  7. Remove.

  Also in this item:
  - Drop the confidence badge, the "Take a closer look" section and the room.
  - At `lg`: header and name/price at full width; photo column 5/12, details 7/12.
- [x] 3.8 **Button groups (D13).** A small `ButtonGroup` (Inline `gap={8}`, `justify-end`, wraps, primary last) used by every group in this change.
- [x] 3.9 **Photo store (D1).**
  - `lib/estate-sale-planner/photos.ts`: IndexedDB `esp-photos`, put/get/delete, a `PHOTO_STORE.capBytes` cap (150 MB) with oldest-sale-first eviction, and `storage.persist()` on first save.
  - `capture.ts` writes the 1600 px copy alongside the 768 px frame.
  - Tests with `fake-indexeddb` (a new dev dependency; not in `package.json` yet).
- [x] 3.10 **Session model (D2).**
  - New fields: `photoId`, `lot`, `bandSource`, `rereadPending`, `messages`.
  - New reducers: `adjustBox`, `splitItem`, `addFromPhoto`, `mergeItems`, `markLot`, `splitLot`, `applyMessage`, `undoMessage`.
  - Destination precedence on merge and lot.
  - Tests in `session.test.ts`.
- [x] 3.11 **Crop and re-read (D3).**
  - Crop from the original at up to 1024 px using `cropRect` padding.
  - `RefineInput.reframed` adds the prompt line.
  - The thumbnail is re-cut at 320 px.
  - At most 3 re-reads in flight; `rereadPending` and failure states.
  - Tests in `refine.test.ts`.
- [x] 3.12 **Source photo screen.**
  - Route `/sales/[id]/items/[itemId]/photo`.
  - `BoxEditor` (an SVG overlay with pointer events and 44 px handles) with modes view, adjust, split, add and select.
  - Actions per the D13 groups.
  - "Photo no longer on this device" fallback.
- [x] 3.13 **Adjust by message (D14).**
  - `/api/refine` accepts `message` (prompt plus request schema).
  - Message thread with an "Updated this item" card and Undo.
  - Messages are appended to `note`.
  - Tests in `refine-route.test.ts` and `session.test.ts`.
- [~] 3.14 ~~**Confirmed state.** **Looks right** on the item screen and the source photo screen. Confirmed is persisted in `storage.ts` and shown under the photo.~~ Built, then removed — 2026-10-31, review queue #60: no confirmed state (founder: "Its in the app or its not."). `confirmed`, `confirmItem`, `onConfirm` and `esp_item_confirmed` are gone; old saved sales may still carry `confirmed: true`, which is ignored.
- [x] 3.15 **Copy and accessibility.** Run `skills/user-communication` over the new copy. Check focus order, the radiogroup, the breadcrumb `aria-current`, and 44 px targets.
  - 2026-10-28 correction: the 44 px claim didn't hold on a phone (tab bar 24 px, most buttons 32 px, fields 14 px so iOS zoomed on focus). Fixed on `claude/esp-phone-ergonomics` with a coarse-pointer floor; Playwright at iPhone 12 Pro Max (428×926) finds 0 interactive targets under 44 px across all eight routes (`assets/phone-*-sort.png`).
- [x] 3.16 **Built captures** at 480 and 1024 against round 17, saved to `openspec/changes/estate-sale-planner-sold-comps/assets/built-*.png` (fixture mode, stand-in photos, 2026-10-27). Drift: the photo check's corner dots are 8 px (design.md) where the Figma stand-in drew 12; the confidence badge on list cards picks up the brand primary.

### PR 2: sold-price lookup

- [x] 3.17 **Migration `019_esp_comps_costs.sql` (D9).** Idempotent, RLS on, no policies. Apply it to Experiment Hub 2.0 and confirm `schema_migrations` matches the file.
  - 2026-11-02: file written (`esp_comps`, `esp_costs`).
  - 2026-11-02: applied to Experiment Hub 2.0 (ulqdjuiffpazzixnwwso) on Katy's OK; `schema_migrations` has `20261102184633 019_esp_comps_costs`. Both tables: RLS on, 0 policies, no anon/authenticated grants, service role can insert. Security advisor shows only the expected info-level "RLS enabled, no policy" note.
- [x] 3.18 **Cost ledger (D8).** (2026-11-02; prices read from the vendor pages that day; `deferCost` uses `after()` so Vercel doesn't freeze the write)
  - `costs.ts` `recordCost()`: fire-and-forget, logs on failure.
  - `MODEL_PRICES` in `config.ts` from the vendor pricing pages, with a dated comment.
  - Wired into `/api/flag` and `/api/refine` (with `saleId`).
  - Tests: one row per call, and a failure doesn't throw.
- [x] 3.19 **Provider adapter (D5).** (2026-11-02, from compsapi.com/docs: `GET /v1/sold`, `X-API-Key`, User-Agent required, USD dollars, 429 `quota_reached`, $9/5,000 = 0.18¢ a request. The docs show no full `/v1/sold` body; the parser reads `items` and drops what it can't read — **check on the first keyed call**.)
  - 2026-11-03, first keyed call ("Lodge No. 8 cast iron skillet", HTTP 200, 777 ms): top level `ok, query, page, count, next_page, no_results, cached, days, size, source, site, items`; every item has `title, price, last_sold, url, image` plus `item_id, units_sold, total_sales, format, bids, ended_at, shipping_cost, free_shipping_pct, us_sale`. `price` is per unit (two lids: `price` 25.99, `total_sales` 51.98). Parser read 50/50; pinned in `comps-parts.test.ts`. Prices ran $4.69–$399.99 (lids, new retail, rare vintage) — the model's matching pass is what makes the band honest.
  - 2026-11-03 **finding, keyed run in the app:** two steps are unstable on gpt-5-nano. (1) The query step rewords the same item each run ("Lodge No 8 cast iron skillet" / "… 8 inch"; Le Creuset got "Le Creuset 26 5.5 qt round dutch oven orange", which found only 2 sales), so the 90-day store misses and the provider is paid again. (2) The matching pass kept 3 of 50 on one run and 0 of 50 on a near-identical list on the next. Lookups took 12–14 s, even from saved results, because both model steps run every time. Not fixed — Katy's call.
  - `comps/provider.ts` interface plus `comps/compsapi.ts`. Endpoint, auth, response shape and price come from CompsAPI's docs at apply time, not from memory.
  - 8 s timeout; quota and error mapping.
  - Fake provider in tests.
- [x] 3.20 **Comps store (D6).** `comps/store.ts`: read and upsert `esp_comps` by `(provider, query_norm)`, 90-day freshness, a zero-cost cache-hit row.
- [x] 3.21 **Query writer (D4).** (`gpt-5-nano` / `claude-haiku-5-5`; with no model key the name is the query) `comps/query.ts` `writeQuery()`: text-only, smallest model per provider from `config.ts`. `normalizeQuery()` is a pure function and tested.
- [x] 3.22 **Comps pass and band math (D7).** (with no model key nothing is kept, so unchecked comps never set a band) `comps/read.ts` `readComps()` returns which listings match. `comps/band.ts` takes the 25th–75th percentile range and the median's band, with a minimum of 3 matches. Both tested.
- [x] 3.23 **Route `/api/comps`.**
  - The server re-checks the gate (Sell, the profile's `minBand` via `resolveLookupMinBand` + `bandMeetsLookup`; default `$100–$250` and up).
  - Returns a `CompsSummary`.
  - Throttled like `/api/refine`.
  - Route tests cover gated, ok, too-few, not-configured, error and quota.
- [x] 3.24 **Client trigger.** (2026-11-02: lookups key on the item's subject — name, mark, lot size — not its band, or a comps band would trigger its own lookup; a rename waits 1.2 s to settle; three in flight at most; a result for a subject that changed meanwhile is dropped; listing rows are 44 px on touch)
  - Run when an item first meets the gate (set to Sell, or a Sell item's band reaches the threshold, including after a re-read), on opening a gated item with no comps or a failed last run, and after a correction changes a gated item.
  - Band line states per D15.
  - `bandSource: "family"` is never overwritten.
- [~] 3.25 **Config and keys.**
  - [x] `COMPS.minBand` + `COMPS.minBandChoices` in `config.ts`, with the per-person threshold in Account & profile (`profile.ts`, `MenuPlaceholder.tsx`); review queue #59 approved 2026-10-31 (PR: esp-lookup-threshold-profile).
  - [x] `COMPS.freshDays` (90), `COMPS.minMatches` (3), `COMPS_PROVIDERS.compsapi`, `TEXT_MODELS`, `MODEL_PRICES` (2026-11-02).
  - [x] `COMPS_PROVIDER`, `COMPS_API_KEY`, `ESP_*_TEXT_MODEL` in `.env.example` with provenance. **Katy adds the key value** (CompsAPI signup, #62).
  - 2026-11-03: key in the vault as `op://BHD Labs/CompsAPI Credentials/credential` (the item is "CompsAPI Credentials", not "CompsAPI"); `.env.example` corrected and `COMPS_API_KEY` added to the `scripts/sync-secrets.sh` manifest (target vercel). **Not yet:** the reference line in `.env.local`, and `sync-secrets.sh --apply` to Vercel.
- [x] 3.26 **Cost query.** `experiments/estate-sale-planner/docs/cost-per-sale.sql`. A saved SQL snippet in `experiments/estate-sale-planner/docs/` for "cost per sale" from `esp_costs`.
- [x] 3.27 **Same item, same answer (D22).** (2026-11-03, after the first keyed lookups priced one skillet two ways.)
  - [x] `subjectKey()` in `comps/normalize.ts`: name | mark | lot, normalized; the device's `compsKey` now calls it.
  - [x] `esp_comps_reads` memo in `store.ts` (`getRead`, `saveRead`); `lookupComps` reuses the search always, and the kept sales while the saved sales are the same fetch. A failed read saves nothing; no sales still saves the search. Tests: `comps-lookup.test.ts` ("the same item gets the same answer").
  - [x] Search prompt: 3 to 6 words, maker + the mark's number + object; probe: Le Creuset 4/4 "Le Creuset 26 Dutch oven" (was 4 different).
  - [x] Comps pass on gpt-5 (`TEXT_MODELS.openai.read`) with the size-number rule; probe 4/4 same kept set, live guard `comps-stability.live.test.ts` 3/3 at $50–$100 (2026-11-03).
  - [x] Long model text clipped (`clipText`), not fatal — a 161-character reason had thrown the pass.
  - [x] **Migration `020_esp_comps_reads.sql`** applied to Experiment Hub 2.0 on Katy's OK (2026-11-03); `schema_migrations` `20261103162144 020_esp_comps_reads`. RLS on, 0 policies, no anon/authenticated grants, service role can insert.
  - [x] Keyed rerun in the app (2026-11-03, local `pnpm dev`; `assets/built-comps-line-live-375.jpg`). Sale A, "Lodge No. 8 cast iron skillet" / LODGE 8: search "Lodge No. 8 skillet", 50 found, gpt-5 kept #12, #14, #24, **$50–$100, "Based on 3 sold · $59–$71"** with three links — 1.03¢ (query 0.007¢, lookup 0.18¢, comps 0.85¢), **35 s**. Sale B, "lodge no 8 Cast Iron Skillet" / "Lodge 8", model guess $250–$500: same band, range and links, **one zero-cost cache-hit row, 0.35 s**. Memo row holds subject `lodge no 8 cast iron skillet|lodge 8|1`, matches [12,14,24].
  - **Trade-off to watch:** a first lookup now waits ~30 s on gpt-5 (the line says "Checking sold prices…" meanwhile); repeats are instant.

- [x] 3.40 **Check sold prices button (D23, Figma round 18).** Replaces the automatic trigger in 3.24. Migration 022 `esp_comps_checks`; `comps/check.ts`; `fresh` and `detail` in `lookupComps`; POST limit and GET saved check in `api/comps`; `SoldPriceCheck.tsx`; reason lines in `bandLine`. Tests: `comps-check-route.test.ts`, `comps-item.test.ts`, `comps-lookup.test.ts`. Automatic lookups removed, with their tests. Not walked on a real phone with a real key yet (4.1 step 7).

- [x] 3.41 **Searches that find sales (D24).** One-year window, `cleanQuery`, broader searches, a second read, no remembering an empty search, comparable pieces for no known maker, rate limit not treated as quota. Tests: `comps-lookup.test.ts`, `comps-parts.test.ts`; on real services, `comps-search.live.test.ts` and `comps-stability.live.test.ts` pass. Not checked in the deployed app yet.

## 4. QA

- [~] 4.1 **Manual walkthrough on a phone,** fixture mode then keyed:
  1. Photograph a room.
  2. Open an item and check its source photo.
  3. Adjust a box, split, add, merge and lot.
  4. Send a message and undo it.
  5. Switch Sell, Donate and Keep in the sticky header.
  6. Check the price and the bands.
  7. With a provider key, set a $100+ item to Sell, click **Check sold prices**, see "Based on N sold" and the saved check, reopen it to see the check with no new cost row, and see the button disabled until tomorrow.
  8. Check the cost rows in Supabase.
  - 2026-10-28: first pass on an iPhone 12 Pro Max found jitter, content off the viewport and small targets (fixed on `claude/esp-phone-ergonomics`). Steps 1–8 still to walk on the fixed build.
- [ ] 4.2 **Automated:** `pnpm vitest run tests/estate-sale-planner` green, plus `pnpm tsc --noEmit` and `pnpm lint`.
- [ ] 4.3 **Visual check against Figma round 18** (item screen; 17 for the rest) at 480 and 1024 (built captures from 3.16).
- [ ] 4.4 **Validate and record:**
  - `openspec validate estate-sale-planner-sold-comps` passes.
  - Review-queue rows #59–#76 are updated to APPROVED or DEFAULT_IMPLEMENTED as built.
