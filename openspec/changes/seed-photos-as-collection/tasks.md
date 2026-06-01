## 1. User outcomes (from spec scenarios)

- [ ] 1.1 A user can save a seed with three photos and reload it with all three present in order, none marked front/back
- [ ] 1.2 A user viewing a legacy front/back seed sees its photos render unchanged on every surface (no data written)
- [ ] 1.3 A user who edits and saves a legacy seed once has it upgraded to the photo collection in place
- [ ] 1.4 A user who captures two photos for one packet gets one merged field set — no "back image evidence" panel, no F/B badges
- [ ] 1.5 A user can browse the list, open detail, and run a batch import with all photos rendering correctly from the collection

## 2. Prototype shell

- [ ] 2.1 No new prototype — work lands in the existing `experiments/simple-seed-organizer/prototype/` Next.js app
- [ ] 2.2 Dev: `cd experiments/simple-seed-organizer/prototype/app && npm run dev`; verify the photo-collection paths via `/dev/components` and the `/seeds/[id]/edit` route

## 3. Implementation

- [ ] 3.1 **Verify Supabase first** — `list_tables` on `orlpgxqbesxvlhlkbnqy` to confirm the `seeds` columns; decide where `photos[]` persists (existing jsonb vs. one additive nullable `photos` jsonb column). Do not assume migration state (known drift).
- [ ] 3.2 `types/seed.ts` — add `SeedPhoto { id, path, order, label? }` and `Seed.photos?: SeedPhoto[]`; keep legacy `photoFront/Back(+Path)` as read-only-for-shim
- [ ] 3.3 `lib/seedConverters.ts` — single shim in `toSeed(row)`: use `photos[]` if present, else synthesize from legacy front/back (placeholder `legacy-front`/`legacy-back` ids, pass data-URL photos through without signing)
- [ ] 3.4 `lib/seed-photos.ts` — re-key `getPhotoPath`/`uploadSeedPhoto`/`deleteSeedPhotos` by `photoId` (`{user}/{seed}/{photoId}.jpg`); keep legacy path resolution in `getPhotoUrl`/`getSignedPhotoUrl`
- [ ] 3.5 `lib/storage.ts` — read/write seeds with `photos[]`; write path persists the collection (this is what upgrades a legacy row on save)
- [ ] 3.6 `components/AddSeedForm.tsx` — write `seedData.photos` (upload local blobs with new uuids), stop writing `photoFront*/photoBack*`
- [ ] 3.7 `components/AddSeedForm.tsx` — fold extraction: drop `getKeyValuePairsBySource().front/.back` and the "Back image evidence" panel; merge each photo via `mergeExtractedData(prev, data)` into one set; remove `side`/F-B badges
- [ ] 3.8 Read surfaces consume `seed.photos`: `SeedDetail.tsx`, `SeedCard.tsx`, `SeedList.tsx`, `SeedGallery.tsx`, `BatchImport.tsx`, `hooks/useImportQueue.ts`, `app/page.tsx`, `app/packet-extraction-test/page.tsx`
- [ ] 3.9 `lib/import/seedPayload.ts` (+ `seedPayload.test.ts`) — round-trip `photos[]` through import; update test fixtures
- [ ] 3.10 Read-through `mergeExtractedData` to confirm the conflict winner doesn't silently drop the better value (verify only; no behavior change)
- [ ] 3.11 `lib/seedFieldRegistry.ts` — reconcile any photo-field references with the collection model

## 4. QA

- [ ] 4.1 Manual walkthrough: (a) add a seed with 1 photo, then 3 photos → save/reload; (b) open a pre-existing legacy seed → photos display, then edit+save → row now has `photos[]`; (c) capture 2 photos → one merged field set, no evidence panel; (d) list + detail + batch import all render photos
- [ ] 4.2 Automated smoke: vitest for `toSeed` shim (legacy→photos[], data-URL passthrough, photos[]-present passthrough) and `seedPayload` round-trip
- [ ] 4.3 Confirm no surface still reads `photoFront`/`photoBack` directly (grep) except the shim
