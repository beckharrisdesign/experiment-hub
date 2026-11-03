## Context

Today a sale lives only in the phone's browser storage:

- **The sale in context** is in sessionStorage (`esp:session:v2`).
- **Every saved sale** is in localStorage, as `esp:saved:<id>` plus a Home index
  (`esp:history:v1`). Only the newest 6 are kept (`HISTORY_LIMIT`).
- **The 1600 px originals** are in IndexedDB (`esp-photos`), capped at 150 MB, oldest sale
  first (sold-comps D1).
- **Item thumbnails** are small JPEG data URLs inside the sale JSON (`item.image`).

`store.tsx` calls `saveSession` / `saveCopy` on every change and `putPhotos` after each pass.
`getPhoto` reads originals back for corrections (`crops.ts`).

Safari deletes all of that after 7 days of use without a visit: IndexedDB, localStorage and
sessionStorage alike. Server-set first-party cookies are not capped. The hub already runs
service-role Supabase routes for this experiment (`db.ts`, `costs.ts`, `comps/store.ts`) and
uploads files to private buckets elsewhere (`lib/etsy-listing-kit/orders.ts`).

## Goals / Non-Goals

**Goals:**

- Every sale and its originals saved on the server, in the background, tied to one phone by a
  server-set cookie.
- The app loads from the server whenever the phone's copy is missing. The phone's storage
  becomes a cache.
- Nothing a request without the right cookie can read.
- A shape that sign-in (#50) can take over with an update, not a data migration.

**Non-Goals:**

- Accounts, a second device, sharing, sale and item tables, estimate vs sold (#50).
- Real-time sync between two tabs or devices.
- Any new screen.

## User flow / IA

Nothing new to tap. What changes is where things come from:

1. **First visit:** the server sets the device cookie with the page. The family sees nothing.
2. **Walkthrough and corrections:** exactly as today. Each change is saved on the phone at
   once and queued for the server; photos are queued for upload after each pass.
3. **Home:** lists the device's sales from the server, so more than the 6 the phone keeps
   show up. The phone's copy shows first if the network is slow.
4. **Opening a sale the phone no longer has:** it's fetched, cached and opened. Photos load
   from the server the first time they're needed (photo check, adjust a box).
5. **After Safari clears the site:** the cookie is still there, so Home fills from the
   server. Thumbnails missing from a slimmed save are rebuilt from the originals.
6. **Deleting a sale on Home** deletes it on the server too, photos included.

## Visual design / Figma

| Item | Value |
| --- | --- |
| Primary file URL | N/A — no UI |
| As-is frame(s) | N/A — no screen or layout changes. Home may list more than 6 sales, in the existing list. |
| Proposed frame(s) | N/A — approved without a Figma round (Katy, 2026-11-03: "I'm ok with skipping figma") |
| Libraries / version | N/A |
| Code Connect | N/A — no code surface |
| Breakpoints | N/A — no new surface |
| Status | Skipped by founder approval |

## Decisions

### D1. The device id is a server-set cookie, stored hashed

- **Cookie:** `esp-device`, set by `middleware.ts` on any `/estate-sale-planner` request
  without one.
  - Value: 32 random bytes, base64url.
  - Flags: `HttpOnly`, `Secure` in production, `SameSite=Lax`, path `/estate-sale-planner`.
  - Lifetime: 400 days, the most Chrome allows. It's re-set on each visit, so the 400 days
    roll.
- **Stored hashed:** the tables hold `device_hash = sha256(cookie)`, never the cookie. A leaked
  table can't be turned into working cookies.
- **Why not a page-written id:** Safari's 7-day cap deletes script-written storage and caps
  cookies a page sets. A server-set first-party cookie is the one thing it doesn't cap.
- **Lost cookie:** clearing all website data or a new phone loses access, not the data. The
  rows stay, and sign-in (#50) or a manual reattach by sale id can recover them.

### D2. Migration 021: two tables and a private bucket

- **`esp_sales`:**
  - `id` (the existing `esp_…` session id, primary key).
  - `device_hash`, plus `owner_id uuid null`, left empty until sign-in.
  - `version bigint`, `session jsonb`, `created_at`, `updated_at`.
  - Index on `(device_hash, updated_at desc)`.
- **`esp_sale_photos`:**
  - `sale_id` (references `esp_sales`, `on delete cascade`), `key` (the photo store key),
    `path`, `bytes`, `created_at`. Primary key `(sale_id, key)`.
- **Bucket:** `esp-photos`, private, created in the migration. The object path is
  `<sale_id>/<key>.jpg`; ownership is checked through `esp_sales`, never the path.
- **Access:** RLS on, no policies, revoked from public, anon and authenticated. The same as
  016, 019 and 020.
- **`esp_save_sale()`:** a SQL function does the save in one statement:
  - `insert … on conflict (id) do update … where esp_sales.version < excluded.version and
    esp_sales.device_hash = excluded.device_hash`.
  - It returns whether it wrote. "Not written" with a different owner reads as not found.
  - That one statement is the "newest version wins" and the "can't overwrite someone else's
    sale" rule.

### D3. Saves: the whole sale, debounced, versioned

- **New `lib/estate-sale-planner/sync.ts`:** a small client queue.
  - `update()` and `applyTo()` mark the sale dirty after their local save.
  - The queue sends 1.5 s after the first unsent change, and later edits ride along. It
    doesn't wait for quiet, so steady typing can't hold a save past the spec's 5 seconds.
- **Version:** milliseconds, kept rising on the device (`max(now, last + 1)`) so two quick
  edits never tie.
- **Payload:** the whole `Session`.
  - Vercel caps a request body at 4.5 MB.
  - Over 3.5 MB, the app sends it slimmed, without `image` thumbnails, using the same `slim()`
    that `storage.ts` already uses for quota. Restore rebuilds those thumbnails from the
    originals (D5).
- **Offline:** unsent sale ids are kept in localStorage.
  - Retries back off: 2 s, 5 s, 15 s, 60 s, then every 5 minutes.
  - The queue also sends on the `online` event and when the app comes back to the
    foreground.
- **Delete:** `deleteSaved` also queues a delete. The server removes the row, its photo rows
  (cascade) and the bucket objects.

### D4. Routes, all under `/estate-sale-planner/api/`, no dynamic segments

Literal paths only (the hub's `[id]` vs `[slug]` 504 lesson):

| Route | Does | Not the owner |
| --- | --- | --- |
| `POST sales` | save `{ id, version, session }` via `esp_save_sale` | 404 |
| `GET sales` | list this device's sales as Home summaries | (only its own) |
| `GET sales/one?id=` | one sale's JSON | 404 |
| `POST sales/delete` | delete a sale and its photos | 404 |
| `POST photos` | upload one original (`saleId`, `key`, JPEG/PNG ≤ 2 MB) | 404 |
| `GET photos?saleId=&key=` | the photo's bytes, from this origin (see below) | 404 |

- **The cookie is required.** With no cookie, a route answers 404, or an empty list for
  `GET sales`.
- **Photos are served, not linked** *(2026-11-03, first live run)*. The first version answered
  with a 302 to a signed Supabase URL. The hub's Content Security Policy only allows
  `connect-src` to its own origin (and Google), so the browser blocked the redirect and the
  photo showed as gone. The route now downloads the object with the service role and returns
  the bytes. The CSP stays as it is, no link ever leaves the server, and every read is checked
  against the cookie.
- **Throttles:** per device and per instance, like `/api/comps`. 60 saves and 120 photo calls
  a minute per device.
- **Summaries:** `summarize()` moves out of `storage.ts` into a pure module, so the server
  builds Home rows from the stored JSON.

### D5. Loads: the server fills the cache

- **Start:** `loadSession()` reads the phone as today, then `GET sales` refreshes Home.
- **Merge:** for each sale, the newer version wins.
  - A newer server copy replaces the phone's.
  - A newer phone copy is queued to send, which covers edits made offline.
- **`open(id)`:** with no phone copy, the sale is fetched from `GET sales/one`, cached, then
  opened.
- **`getPhoto(id)`:** checks the phone, then `GET photos` (same origin, see D4).
  - The blob is fetched and put back into IndexedDB under the usual cap.
  - If both miss, the item shows "Photo no longer on this device", as today.
- **Thumbnails:** an item with no `image` after a load gets one cut from its original and box
  (`crops.ts` / `thumbs.ts`), then saved.

### D6. Photos upload in the background

- **After each pass:** `putPhotos` stores the originals on the phone as today, and their keys
  join an upload queue (localStorage) with the same backoff as D3.
- **Order:** a photo waits for its sale's first successful save, because the server checks
  ownership through `esp_sales`.
- **Idempotent:** uploads use `upsert`, so a retry or a repeat never duplicates.

### D7. Existing sales go up once

- **The first time this version opens** (flag `esp:server-sync:v1` not set), every sale in
  `esp:history:v1` is queued, along with every original IndexedDB holds for it.
- **The flag is set** once the queue has accepted them, not once they've landed. The queue
  owns delivery from there.
- **A phone Safari has already cleared** has nothing to send. That's the stated limit.

### D8. Saving never blocks

- **Background only:** every server call is fire-and-forget from the screens' point of view.
  Failures are logged and retried, never shown as errors mid-walkthrough.
- **No new loading state:** screens read the in-memory and phone copy exactly as today.
- **Timeouts:** 8 s on every call. A slow server is a retry, not a hang.

### D9. Retention and privacy

- **Kept until the family deletes the sale** while this is a stopgap. There's no automatic
  expiry (review-queue row below).
- **The privacy policy** gains a line: sale data and photos are stored privately on the
  hub's servers, tied to this phone, until deleted.

### D10. Hand-off to sign-in (#50)

- **Claiming:** sign-in fills `owner_id` for every row with the device's `device_hash`.
  Routes then check the owner first and the device second. No data moves.
- **What #50 still owns:** splitting the JSON into `esp_sales` / `esp_items` columns,
  estimate vs sold, and RLS by owner.

### D11. Correct sold-comps D1

The risk note in `estate-sale-planner-sold-comps/design.md` is wrong: thumbnails and
corrections are in localStorage, so Safari deletes them too. This change rewrites the note and
points to D5.

### Review-queue rows (added as PROPOSED with this design)

| # | Decision | Default |
| --- | --- | --- |
| 78 | Device identity before sign-in | Server-set `esp-device` cookie, hashed in the database, 400-day rolling (D1). A stopgap. |
| 79 | What's stored | The whole sale as one JSON document plus the 1600 px originals in a private bucket (D2) |
| 80 | Retention | Until the family deletes the sale; no automatic expiry while temporary (D9) |

## Risks / Trade-offs

- **Clearing all website data, or a new phone, loses access.** The data stays on the server
  and only the key is gone. Sign-in fixes this, and that's why this is temporary.
- **Two tabs editing one sale:** the last save wins, and the earlier tab's edits are lost.
  It's rare on a phone; real merge waits for item tables (#50).
- **Big sales:** over 3.5 MB the thumbnails are rebuilt instead of stored. Opening such a
  sale on a phone that lost its copy waits a moment longer for them.
- **Upload data on cellular:** a 48-photo room is about 15 MB of originals.
  - Uploads are paced by the queue.
  - There's no Wi-Fi-only switch; that would be a setting if it matters.
- **Storage cost:** Supabase Storage is about $0.02 per GB-month, and a room is about 15 MB.
  That's cents at Katy's volume.
- **The pending queue lives in localStorage.** If Safari clears the site while edits are
  still unsent (offline for 7 days), those edits are lost. Everything sent before is safe.
- **Session JSON is untyped on the server:** the server stores what the device sends after a
  size and shape check (`id` matches, `items` is an array). A malformed sale can only hurt
  its own device.
