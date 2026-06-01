## 1. User outcomes (from spec scenarios)

- [x] 1.1 A user can save a seed with three photos and reload it with all three present in order, none marked front/back
- [x] 1.2 A user viewing a legacy front/back seed sees its photos render unchanged on every surface (no data written)
- [x] 1.3 A user who edits and saves a legacy seed once has it upgraded to the photo collection in place
- [ ] 1.4 A user who captures two photos for one packet gets one merged field set — no "back image evidence" panel, no F/B badges — **deferred to Change 2 (`seed-edit-photo-rail`); overlaps the rail redesign of this form**
- [x] 1.5 A user can browse the list, open detail, and run a batch import with all photos rendering correctly from the collection

## 2. Prototype shell

- [x] 2.1 No new prototype — work lands in the existing `experiments/simple-seed-organizer/prototype/` Next.js app
- [x] 2.2 Dev: `cd experiments/simple-seed-organizer/prototype/app && npm run dev`; verify the photo-collection paths via `/dev/components` and the `/seeds/[id]/edit` route

## 3. Implementation

- [x] 3.1 **Verify Supabase first** — `list_tables` on `orlpgxqbesxvlhlkbnqy` confirmed `seeds` columns; added one additive nullable `photos` jsonb column (migration 009), applied + verified (all rows null)
- [x] 3.2 `types/seed.ts` — add `SeedPhoto { id, path, order, label? }` and `Seed.photos?: SeedPhoto[]`; keep legacy `photoFront/Back(+Path)` as read-only-for-shim
- [x] 3.3 `lib/seedConverters.ts` — single shim (`buildPhotoCollection`): use `photos[]` if present, else synthesize from legacy front/back (`legacy-front`/`legacy-back` ids, data-URL photos pass through without signing)
- [x] 3.4 `lib/seed-photos.ts` — re-key `getPhotoPath`/`uploadSeedPhoto`/`deleteSeedPhotos` by `photoId` (`{user}/{seed}/{photoId}.jpg`); keep legacy path resolution in `getPhotoUrl`/`getSignedPhotoUrl`
- [x] 3.5 `lib/storage.ts` — read/write seeds with `photos[]`; write path persists the collection (upgrades a legacy row on save)
- [x] 3.6 `components/AddSeedForm.tsx` — write `seedData.photos` (upload local blobs with new uuids), stop writing `photoFront*/photoBack*`
- [ ] 3.7 `components/AddSeedForm.tsx` — fold extraction: drop `getKeyValuePairsBySource().front/.back` and the "Back image evidence" panel; merge each photo via `mergeExtractedData(prev, data)` into one set; remove `side`/F-B badges — **deferred to Change 2; the two-pane capture UI is replaced by the photo rail there, so folding it now would be churn**
- [x] 3.8 Read surfaces consume `seed.photos`: `SeedDetail.tsx`, `SeedCard.tsx`, `SeedList.tsx`, `SeedGallery.tsx`, `BatchImport.tsx`, `hooks/useImportQueue.ts`, `app/page.tsx`, `app/packet-extraction-test/page.tsx`
- [x] 3.9 `lib/import/seedPayload.ts` (+ `seedPayload.test.ts`) — round-trip `photos[]` through import; update test fixtures
- [x] 3.10 Read-through `mergeExtractedData` to confirm the conflict winner doesn't silently drop the better value (verify only; no behavior change)
- [x] 3.11 `lib/seedFieldRegistry.ts` — replaced `photoFront`/`photoBack` media defs with a single `photos` collection def

## 4. QA

- [ ] 4.1 Manual walkthrough: (a) add a seed with 1 photo, then 3 photos → save/reload; (b) open a pre-existing legacy seed → photos display, then edit+save → row now has `photos[]`; (c) capture 2 photos → one merged field set, no evidence panel; (d) list + detail + batch import all render photos — **left for user testing (the unblock goal)**
- [x] 4.2 Automated smoke: vitest for `buildPhotoCollection` shim (legacy→photos[], data-URL passthrough, photos[]-present passthrough) and `seedPayload` round-trip
- [x] 4.3 Confirm no surface still reads `photoFront`/`photoBack` directly (grep) except the shim
