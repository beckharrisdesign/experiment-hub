# Tasks: esp-server-sales

> §1 checkboxes are claims: ticked only with a dated receipt (test run, curl, screenshot,
> database row). Pending founder decisions live in
> [`experiments/estate-sale-planner/docs/review-queue.md`](../../../experiments/estate-sale-planner/docs/review-queue.md)
> (#78–#80). No Figma round: no UI changes (approved 2026-11-03).

## 1. User outcomes (from spec scenarios)

**Saving**

- [ ] 1.1 An edit reaches the server: user renames an item or moves it to Sell, and within 5 seconds the sale on the server shows it
- [ ] 1.2 A dropped signal delays the save and loses nothing: changes made offline reach the server once the signal is back, without the user doing anything
- [ ] 1.3 An older copy never overwrites a newer one: a save that started earlier but arrives later doesn't replace the newer version

**Photos**

- [ ] 1.4 A walkthrough's photos reach the server: each kept original is stored privately under that sale
- [ ] 1.5 A failed upload is retried: a photo that failed or lost signal reaches the server later on its own

**Loading**

- [ ] 1.6 Sales come back after Safari clears the site: Home lists them, and each opens with its items, prices, destinations, corrections and photos
- [ ] 1.7 A photo the phone dropped loads from the server, and adjusting its box works
- [ ] 1.8 Sales already on the phone go up once: the first open of this version sends them, and opening again doesn't send them twice

**Only this phone**

- [~] 1.9 A first visit gets a private id: the server sets a cookie page scripts can't read, and the phone's sales are stored under it — `device.test.ts` (random, HttpOnly, Secure, Lax, 400-day rolling, app-scoped; hash not value); in the app 2026-11-03 `document.cookie` has no `esp-device` and the routes reached the database scoped to it; **stored under it needs migration 021**
- [~] 1.10 Another device or a guessed sale id gets nothing: the server answers as if the sale doesn't exist — `sales-routes.test.ts` (other cookie, no cookie, guessed id: 404 on load, save, photo and delete); **live check needs migration 021**
- [ ] 1.11 A photo link stops working after an hour at most

**Never in the way**

- [~] 1.12 The server is down mid-walkthrough: walking, correcting and lookups work as before, and the changes go up once the server answers — in the app 2026-11-03 with the tables missing (every save 502): Home listed 4 sales, moving an item to Donate saved on the phone and joined the queue, no error shown; `sync.test.ts` (backoff, resend); **"go up once the server answers" needs migration 021**
- [ ] 1.13 "Photo no longer on this device" is rare: with the photo on the server and the phone online, the photo loads instead

## 2. Setup

- [x] 2.1 No new shell: it ships inside the existing in-hub app (`app/estate-sale-planner/`). Run it with `pnpm dev` and go to `http://localhost:3000/estate-sale-planner`.
- [x] 2.2 Branch `claude/esp-server-sales`, off main after #575 (done 2026-11-03).
- [x] 2.3 Test first (`rules/principles.mdc`): each 3.x item lands its failing vitest under `tests/estate-sale-planner/` before the code.

## 3. Implementation

- [~] 3.1 **Migration `021_esp_server_sales.sql` (D2).** (2026-11-03: written, **not applied**.)
  - `esp_sales` and `esp_sale_photos` (cascade from the sale), with the `(device_hash, updated_at desc)` index.
  - The private `esp-photos` bucket.
  - `esp_save_sale()`: newer version wins, and only for the same `device_hash`; it returns whether it wrote.
  - RLS on, no policies, revoked from public, anon and authenticated.
  - **Apply to Experiment Hub 2.0 only on Katy's OK**, then confirm `schema_migrations` and grants.
- [x] 3.2 **Device cookie (D1).** (2026-11-03: `device.test.ts`, 7 tests.)
  - `middleware.ts` sets `esp-device` on `/estate-sale-planner` requests without one (32 random bytes, HttpOnly, Secure in prod, Lax, 400-day rolling).
  - `lib/estate-sale-planner/device.ts`: `deviceHashOf(request)` returns the sha256 of the cookie, or null.
  - Tests: the cookie is set once, never readable from the page, and refreshed on each visit; the hash, not the value, reaches the database.
- [x] 3.3 **Server store (D2, D4).** (2026-11-03: `sales-db.ts`, `sale-summary.ts`; through `sales-routes.test.ts`.)
  - `lib/estate-sale-planner/sales-db.ts`: save (RPC), list summaries, get one, delete (row, photo rows, bucket objects), record a photo, sign a photo URL (10 minutes).
  - Every call is scoped by `device_hash`.
  - `summarize()` moves to a pure module both sides share.
- [x] 3.4 **Routes (D4).** (2026-11-03: `sales-routes.test.ts`, 12 tests against an in-memory Supabase (tables, `esp_save_sale`, bucket).)
  - `POST sales`, `GET sales`, `GET sales/one`, `POST sales/delete`, `POST photos`, `GET photos`, all under `/estate-sale-planner/api/`, with literal paths only.
  - No cookie or not the owner answers 404 (an empty list for `GET sales`).
  - Size and shape checks: the body is ≤ 4 MB, the sale `id` matches, `items` is an array; photos are JPEG/PNG ≤ 2 MB.
  - Per-device and per-instance throttles.
  - Route tests with dynamic import and `resetModules`, the repo convention.
- [x] 3.5 **Sync queue (D3, D6, D8).** (2026-11-03: `sync.test.ts`, 13 tests. The send fires 1.5 s after the *first* unsent change; design D3 updated to match.)
  - `lib/estate-sale-planner/sync.ts`: sale saves debounced 1.5 s; the version keeps rising on the device; payloads over 3.5 MB are slimmed; photo uploads wait for their sale's first save.
  - Backoff 2 s, 5 s, 15 s, 60 s, then 5 min. It sends on `online` and on return to the foreground. Every call has an 8 s timeout.
  - Pending ids are kept in localStorage. Failures are logged, never thrown into the screens.
  - Tests with fake timers and a fake fetch.
- [x] 3.6 **Wire the store (D3, D5).** (2026-11-03: `store.tsx`: `refreshHistory` merges phone + server rows; `openFromServer`; `useSale` falls back to it.)
  - `store.tsx`: `update` / `applyTo` mark the sale dirty, `putPhotos` call sites queue uploads, and `deleteSaved` queues a delete.
  - On start, `GET sales` refreshes Home, and the newer version wins for each sale (a newer phone copy is queued to send).
  - `open(id)` fetches a sale the phone doesn't have.
- [x] 3.7 **Photos from the server (D5).** (2026-11-03: `photos.ts`: `getLocalPhoto` (the queue reads this) and `getPhoto` (phone, then server, re-cached); thumbnails cut again in `openFromServer`.)
  - `getPhoto` checks the phone, then `GET photos`, and caches the blob under the cap.
  - Items missing `image` after a load get a thumbnail cut from their original and box.
- [x] 3.8 **First-open upload (D7).** On the first open of this version (`esp:server-sync:v1`), every saved sale and its originals are queued once. (2026-11-03: `cloud.ts` `queueFirstUpload`; seen in the app: 4 earlier sales queued on first open.)
- [x] 3.9 **Docs (D9, D11).** (2026-11-03: `app/policy/page.tsx` (collect + cookies, dated November 3, 2026); sold-comps design Risks note corrected; review queue #78–#80 PROPOSED; no new env keys.)
  - Correct the sold-comps D1 risk note.
  - Add the privacy-policy line.
  - Add review-queue rows #78–#80 as PROPOSED.
  - `.env.example`: nothing new expected (the existing Supabase keys). Say so if that changes.

## 4. QA

- [ ] 4.1 **Manual walkthrough on a phone:**
  - Walk a room.
  - Confirm the sale and photos are in the database and bucket.
  - Simulate Safari's wipe. Clear the site's localStorage, sessionStorage and IndexedDB from Web Inspector, keeping cookies. iOS Settings → Clear Website Data also clears the cookie, so it's the lost-access case, not the wipe.
  - Reopen and check Home, the sale, a photo check and a box adjustment.
  - Go offline, edit, go online, and check the edit lands.
  - Open the sale's API from another browser and get a 404.
- [ ] 4.2 **Automated:** `pnpm vitest run tests/estate-sale-planner` green, plus `pnpm tsc --noEmit` and `pnpm lint`.
- [ ] 4.3 **Validate and record:** `openspec validate esp-server-sales`, and dated receipts on every §1 line.
