## 1. User outcomes (from spec scenarios)

- [x] 1.1 Open a seed and see its photos as a rail beside one field set
- [x] 1.2 Rail stacks above the field set on narrow screens
- [x] 1.3 Add a photo and it appears at the end of the rail and saves
- [x] 1.4 Capture two photos and get one merged field set with no evidence panel
- [x] 1.5 Start a new packet with sensible editable defaults that never overwrite input

## 2. Prototype shell

- [x] 2.1 No new prototype — work lands in the existing `experiments/simple-seed-organizer/prototype/` Next.js app
- [x] 2.2 Dev: `cd experiments/simple-seed-organizer/prototype/app && npm run dev`; verified the rail via `/dev/components` (DOM: 2 photos + add tile + Auto Entry). `/seeds/[id]/edit` left for user testing (4.1)
- [x] 2.3 Grounded the UI in Figma `S8YJQugvMmn5jaRqwFM5XO` node `156-9525` (pulled via `get_design_context`); converted to the prototype's existing styling + tokens — no Tailwind dependency added

## 3. Implementation

### Photo rail (1.1, 1.2, 1.3)

- [x] 3.1 `components/PhotoRail.tsx` (new) — renders photos sorted by `order` as framed thumbnails (4px radius, `object-contain`, 400px-capped), with a trailing **add-photo** tile + per-photo Auto Entry / loading overlay
- [x] 3.2 `components/AddSeedForm.tsx` — left column driven by `photos[]` state (legacy front/back fallback for un-upgraded rows); mounts `PhotoRail` in the editing-view section
- [x] 3.3 Add-photo affordance — `addPhotoFromFile` appends `{ id, path: <objectURL>, order }`; submit loops the rail, uploading local blobs by photo id and persisting existing paths as-is (Change 1 round-trip semantics)
- [x] 3.4 Responsive — `grid-cols-1 lg:grid-cols-[1fr_1fr]`: rail beside fields at L, stacked above at S

### Merged field set — fold front/back (1.4)

- [x] 3.5 `components/AddSeedForm.tsx` — `getKeyValuePairsBySource()` → `getKeyValuePairs()` returning one ordered list; `.front`/`.back` dropped
- [x] 3.6 Removed the **"Back image evidence"** panel and the entire back `<section>` (back image pane + evidence)
- [x] 3.7 Stripped `side` threading from `extractPhoto` (was `extractSingleImage`), `addPhotoFromFile` (was `handleFileSelect`), the extraction `formData`, and the `mergeExtractedData(prev, data)` call; removed F/B badges. `mergeExtractedData` `side` is now optional with a no-side fold. (Completes Change 1 task 3.7.)

### Good defaults (1.5)

- [x] 3.8 `lib/seedEntryDefaults.ts` (new) — `getEntryDefaults(now)` (`type: "vegetable"`, `year = current`) + `applyDefaultIfEmpty` guard, aligned with `lib/seedFieldRegistry.ts`
- [x] 3.9 `components/AddSeedForm.tsx` — year default seeded on new packets only; `defaultedFields` ref lets extraction override an untouched default, and a user edit clears the flag — defaults never overwrite input

## 4. QA

- [ ] 4.1 Manual walkthrough on `/seeds/[id]/edit` (needs auth + a real seed — left for user testing): (a) open a seed with ≥2 photos → rail beside one field set, no F/B labels; (b) resize to 480 → rail stacks above; (c) add a photo → appears last, save/reload persists it; (d) capture 2 photos → one merged field set, no evidence panel; (e) start a new packet → editable defaults present, typing/extraction never overwritten
- [x] 4.2 `/dev/components` — `PhotoRail` section added + rendered (DOM-verified: 2 photos, add tile, Auto Entry); two-column shell mirrors Figma `156-9525`
- [x] 4.3 Grep guard — form is clean of `getKeyValuePairsBySource` / `"Back image evidence"`; the only `side` refs left are the kept legacy merge branch + server API param. Typecheck clean (one pre-existing unrelated `plantingNow.test.ts` error); 62 tests pass; `npm run build` ✓
