# Round 05 proposal — photos, recrop, a shell you can see, and a system of record

**Status: PROPOSED. Nothing here is built.** Written 2026-10-15 from Katy's first phone
session; each numbered item below is a review-queue row (#46–#50). Say "veto 47" or "go
05a" and the build follows.

## What she said, what it means

| # | Katy, verbatim | Reading | Size |
| --- | --- | --- | --- |
| 46 | *"stick to images - a live camera instead of video since that adds complexity out of the gate"* | Photos are the capture primitive. Video goes. | S |
| 47 | *"go back and recrop the og images into new elements"* | Keep the originals; draw a box on one to make a new item or re-picture an existing one. | M |
| 48 | *"future func of using ML or AI models to identify objects and outline them"* | Roadmap. Shape the data now so outlines slot in later. | Spike |
| 49 | *"no persistent nav - can't really tell where I am in the app"* | An app shell: a title bar on every screen, tabs that never disappear, real URLs. | M |
| 50 | *"no persistent saving of previous listings. I want this to be the core app where I kick off those listings and monitor their progress and also what my estimated vs sold values were"* | **The pivot.** Accounts, a database, a lifecycle per sale and per item, actuals against estimates. | L |

## Where the build stands against each

- **46** — `framesFromPhotos` already exists and the drop zone already accepts images; only
  the camera button is video-only (`accept="video/*"`). Video frames are sampled every 2.5 s
  and de-duplicated; none of that is needed for photos.
- **47** — The 768 px frame is sent and **discarded**; only a 320 px thumbnail per item is
  kept (review queue #26/#27). Every item already records `frame` + normalized `box`, so the
  geometry to recrop exists; the pixels do not.
- **49** — The bottom tabs show only on Lists / Sort / Finish and hide on capture, the frame
  grid and the item screen (`hasNav` in `page.tsx`). No screen says what it is. One route,
  client-side step machine: refresh and the back button do not mean anything.
- **50** — `sessionStorage` for the active walkthrough, `localStorage` for the last **six**
  (#40), images dropped on quota. Nothing leaves the device except a paid Sell Sheet. The
  parent proposal lists *Accounts* and *Selling anything* under "NOT in v1".

## Proposals

### 46 · Photos first — *recommend: approve as said*

- Camera button → `accept="image/*" capture="environment" multiple`. Each shot is one
  frame; the grid shows shots, not samples; "Send" is the same call.
- **Remove video** from the UI and the library: `framesFromVideo`, the sampler (`frames.ts`:
  `sampleTimes`, `selectFrames`, de-dup) and the sampling knobs go. The encoding settings
  photos still need (`maxEdgePx`, `jpegQuality`) and the cap survive as `PHOTO_BUDGET`; every
  photo the family chose is kept — none is dropped as a "duplicate". Git keeps the rest;
  restoring is a revert. *(Built in 05a exactly this way.)*
- A deliberately framed photo gives the model a cleaner scene than a pan, so boxes
  improve for free, which is what #47 needs.
- *Decision for you:* **OS camera** (one tap into the phone's camera app, zero permission
  code, works in iOS Safari today) vs an **in-app viewfinder** (`getUserMedia`, shutter,
  running count). Recommend OS camera now; the viewfinder earns its code the day outlines
  (#48) can be drawn over it live.

### 47 · Recrop the originals — *recommend: approve, build after 50 lands*

- Keep each photo at **1600 px long edge** (≈250–400 KB JPEG). On-device in IndexedDB
  until accounts exist; then uploaded to a private Supabase Storage bucket `esp-photos`
  and served by signed URL. Each item gains `photo_id` — a foreign key to `esp_photos.id`
  (`on delete set null`), never a blob or a path — beside its normalized `box`; the Source
  photo link and recrop both resolve through that row.
- A **Photos** view per sale and a **Source photo** link on every item. Drag a rectangle →
  **Make an item** (new user-added item with that crop as its picture, optional re-read
  through the existing refine endpoint for name/band) or **Use as this item's picture**.
- This is also the fix for "it missed the lamp" — a correction that today means typing a
  name into Add item with no picture.
- No crop component in MVDS → composition with pointer events; **MVDS hand-off**.

### 48 · Outlines — *recommend: roadmap, not round 05*

- Three honest routes, cheapest first: (1) ask the vision model for tighter boxes now that
  frames are deliberate photos — free, already structured; (2) a segmentation model
  (SAM-family) turning a box or a tap into a mask — in-browser via `transformers.js`
  (≈40 MB download, slow on phones) or hosted (a new vendor and key: yours); (3) the
  model's box → segmentation refine.
- What round 05 does for it: photos kept at 1600 px (#47), `box` normalized (already),
  and an optional `mask` column left for later. Nothing else.

### 49 · The shell — *recommend: approve; ships with 46 as one PR*

- **Top bar on every screen:** sale name (or "Estate Sale Planner"), the screen's title,
  Back when pushed. Today no screen names itself.
- **Tabs on every screen:** `Home · Items · Sort · Progress` with a **center camera
  action** (the one thing you do most). Tabs stay through item screens; only the camera and
  crop flows take the full screen with an explicit Done / Cancel.
- **Real routes** instead of one page with a step machine, all under the hub prefix:
  `/estate-sale-planner` (Home), `/estate-sale-planner/new`,
  `/estate-sale-planner/sales/[id]` (Items), `/estate-sale-planner/sales/[id]/sort`,
  `/estate-sale-planner/sales/[id]/progress`, `/estate-sale-planner/sales/[id]/capture`,
  `/estate-sale-planner/sales/[id]/items/[itemId]`, and in 05c
  `/estate-sale-planner/sales/[id]/photos`. Refresh, back button and deep links all start
  meaning something; it is also what #50 needs.
- Tab bar and top app bar still do not exist in MVDS (#39) — compositions here, hand-offs.

### 50 · System of record — *recommend: approve the shape, decide three things*

What the product becomes: **create a sale → photograph rooms → triage → list / donate →
close with actuals → see how the estimates did**, across devices, forever.

- **Identity:** Supabase Auth, **magic-link email** (no password on a phone). The seed
  organizer prototype already carries the `@supabase/ssr` pattern (password flow) to copy.
  Device-only persistence was considered and rejected: Safari evicts it and it never
  reaches your laptop.
  *Decision:* Supabase's built-in mailer is rate-limited to a handful of emails an hour;
  the hub has a Resend connector. Default: Supabase mailer for dogfooding, Resend before
  anyone else signs in.
- **Schema (migration 017):** `esp_sales` (`user_id uuid not null references
  auth.users(id) on delete cascade`, name, status `planning | sorting | listed | closed`,
  closed_at) · `esp_items` (`sale_id` → `esp_sales`, `user_id` denormalized for the same
  policy shape, name, room, band, **estimate_low/high_cents**, **ask_cents**,
  **sold_cents**, sold_at, destination, status `unsorted | kept | donated | listed | sold |
  unsold`, `photo_id` → `esp_photos`, box, note, mark_reading, confidence, reason) ·
  `esp_photos` (`sale_id`, `user_id`, storage path, w, h) · bucket `esp-photos` with a
  storage policy on the `user_id/` prefix. **Ownership contract:** RLS on every table
  compares `user_id` with `auth.uid()` for select / insert / update / delete, the way the
  seed organizer's `002_add_user_id_and_rls.sql` does; the service-role client is used only
  by the Stripe webhook. `esp_sheets` gains `sale_id`. Existing `esp_events` unchanged.
- **Estimates become numbers.** The model returns a low/high range beside the band (band
  stays the honest display); you set an ask; you enter what it sold for when you close.
  *Decision:* show the range on cards, or bands on cards and numbers only on the item and
  Home? Recommend bands on cards, numbers on the item, totals on Home.
- **Home** = every sale with status, counts, and **estimated vs sold** (per sale and
  all-time, plus a hit-rate: sold inside the range). This is the screen the app opens on.
- **Import** this phone's saved sales into the account on first sign-in, so the sorting
  you have already done is not lost. What imports is what the device holds: names, rooms,
  bands, destinations, notes, mark readings and the 320 px thumbnails — and `storage.ts`
  drops even the thumbnails when the browser's quota is hit, so some imported items will
  have no picture at all. No sale from before 05c has original photos, so **imported items
  cannot be recropped**; the import says so on each one, and "Photograph another room" is
  the way to give an old sale originals.
- *Decision:* "listings" means **tracking** here. If it ever means posting to Facebook
  Marketplace / eBay, that is a sibling of the Etsy Listing Kit and a shared rail, not an
  ESP feature. Say which.

## What this does to the parent proposal

- `propose.md` excludes accounts and selling and tests **anonymous public traffic** (25
  starts in 14 days, ≥2 live Sell Sheets). A personal system of record is a different
  test: **dogfood first** (one real estate sale run end-to-end by you, actuals entered),
  then re-score. The $5 Sell Sheet survives as an output of a sale; whether the record
  itself is a subscription or a per-sale fee is a re-propose, not a default I should take.
- Cost: photos at 1600 px ≈ 30 MB per 100-photo sale; Supabase free tier is 1 GB (≈30
  sales) before Pro ($25/mo). Vision cost per sale is unchanged or lower (fewer, better
  frames).

## Sequence (one PR each, as the earlier rounds)

1. **05a — Photos + shell:** #46 and #49. Pure UI, no backend, no migration. Fixes the two
   things you felt first. ~1 session.
2. **05b — Accounts + record:** #50. Magic link, migration 017, storage bucket, numeric
   estimates, Home, import of device history. Needs you for: Supabase Auth email settings
   and the mailer decision. ~2 sessions.
3. **05c — Recrop + actuals:** #47 on top of the bucket; close-a-sale flow; estimated vs
   sold on Home. ~1 session.
4. **Later — outlines spike** (#48) once there are real photos to test on.

## Decisions you own (reply with numbers)

1. OS camera now, in-app viewfinder later? *(rec: yes)*
2. Remove video entirely? *(rec: yes)*
3. Sign-in: magic link? Mailer: Supabase now, Resend later? *(rec: yes / yes)*
4. Tabs `Home · Items · Sort · Progress` + center camera; tabs hidden only in camera/crop? *(rec: yes)*
5. Cards show bands; numbers on the item and Home? *(rec: yes)*
6. "Listings" = tracking only for now? *(rec: yes)*
7. Re-propose the parent as "v2 — system of record" after 05b, dogfood before public traffic? *(rec: yes)*
8. Sequence 05a → 05b → 05c? *(rec: yes)*
