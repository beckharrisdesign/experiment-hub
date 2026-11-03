# Proposal: esp-server-sales

> Build change for Estate Sale Planner, after `estate-sale-planner-sold-comps` (PR #575, live
> 2026-11-03). **A stopgap**: sales live on the server, tied to one phone, until sign-in
> (review queue #50, round 05b) replaces the phone tie with an account.

## Human anchor

> "I just want it to be stored in a db and retrieved. I don't care about local storage once
> that works."
>
> "this phone only -- as a temporary measure only. Obvi not a long term solution."
>
> — Katy, 2026-11-03, asking what it would take to keep the full photos

## Outcomes

- **Who:** Katy, walking real houses on her iPhone. Later, anyone who uses the app in Safari
  without adding it to the Home Screen.
- **Job:** Come back to a sale days or weeks later and find all of it: every item, price,
  destination, correction and photo.
- **Done when:**
  - Every sale, and every change to it, is saved to the hub's database within a few seconds,
    without a Save button.
  - Its photos (the 1600 px originals) are saved to private storage on the server.
  - Opening the app on the same phone loads the sales from the server. This works even after
    Safari has deleted everything the site kept on the phone.
  - Only that phone can read its sales and photos. No sale id, link or guess opens someone
    else's.
  - Nothing is lost when the signal drops mid-walkthrough. Changes wait on the phone and go
    up when it's back.
- **Not doing:**
  - Sign-in, accounts, or opening a sale on a second device or a laptop. That's #50.
  - Sharing a sale with family.
  - Moving the data into proper sale and item tables (#50's `esp_sales`/`esp_items` with
    estimate vs sold). The sale is stored as one saved document for now.
  - Changing anything on screen.

## Why

Safari deletes *all* of a site's saved browser data, not just the photo store, after 7 days of
use without a visit. That covers IndexedDB, localStorage and sessionStorage. Today every sale
lives only there, so a week away from an estate sale can wipe the whole walkthrough.

The sold-comps design (D1, Risks) says thumbnails and corrections survive because "they're in
the session". That's wrong: the session is in localStorage, which goes too. This change fixes
the note as well as the problem.

Review queue #50 rejected "device-key persistence without login" because "Safari evicts it,
never reaches the laptop". The first half doesn't hold for a cookie the server sets: Safari's
cap covers storage a page writes, not first-party cookies set by the server. The second half
still holds, and that's why this is temporary.

## What changes

- **A device id.** On first visit the server sets a long-lived, random, HttpOnly, Secure
  first-party cookie. It's the only thing that ties sales to a phone, and the only key that
  reads them back.
- **Sales on the server.** Every save writes the sale (today's `Session` JSON) to a new
  service-role-only table, keyed by sale id and device id, newest version wins. The list
  of sales and each sale load from there.
- **Photos on the server.** Each original goes to a private Supabase Storage bucket in the
  background after capture, retried until it lands. The app reads it back through
  short-lived signed links, and only for the device that owns the sale.
- **The phone becomes a cache.** Local storage keeps the app fast and covers a dropped
  signal. When it's empty, the app fills it from the server.
- **Existing sales on the phone** go up the first time the new version opens. A phone that
  has already lost its data can't be recovered.
- **A later step:** sign-in (#50) claims a device's sales into an account. The tables carry
  an empty owner column so that's an update, not a migration of the data.
- **Docs:** the sold-comps D1 risk note is corrected, and the privacy policy gains a line on
  storing sale data and photos.

## Capabilities

### New Capabilities

- `esp-server-sales`: sales and their photos are saved to and loaded from the server, tied
  to one phone by a server-set cookie. The phone's storage is only a cache.

### Modified Capabilities

None promoted yet. The sold-comps photo-store behaviour (originals on the device, oldest sale
evicted past 150 MB) becomes a cache rule, recorded in this change's design.

## Impact

- **Database (Experiment Hub 2.0):**
  - Migration 021: a sales table (sale id, device id, empty owner id, the sale JSON, version,
    updated time) and a photo table (sale id, photo key, storage path, bytes).
  - Both are RLS on with no policies, so only the service role can reach them, like 016, 019
    and 020.
  - A private Storage bucket for the photos.
- **Routes:**
  - New under `/estate-sale-planner/api/`: save a sale, list and load sales, upload a photo,
    and get a photo link.
  - All are gated by the device cookie and rate-limited like `/api/comps`.
- **Client:**
  - `storage.ts` and `photos.ts` save to the server as well as the phone and load from the
    server when the phone is empty.
  - `store.tsx` gains a background sync queue.
- **UI:** none planned.
  - **No Figma round:** there's no new screen or layout. The one visible difference is that
    "Photo no longer on this device" becomes rare, since the photo loads from the server.
    Behaviour goes in the design, per the micro-interaction exemption.
- **Cost:** storage is cents a month at Katy's volume. Each save is one small database write.
- **Privacy:** photos of a family's home now leave the phone. They stay private (no public
  bucket, short-lived links), and the privacy policy says how long they're kept.
- **Effort:** about 4 days.

## Optional links

- Experiment directory: `experiments/estate-sale-planner/`
- Accounts proposal this hands off to: `experiments/estate-sale-planner/docs/review-queue.md`
  (#50, round 05b)
- The note this corrects: `openspec/changes/estate-sale-planner-sold-comps/design.md`
  (D1; Risks / Trade-offs)
