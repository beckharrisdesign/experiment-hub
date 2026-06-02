## 1. User outcomes (from spec scenarios)

- [ ] 1.1 Open a seed and see its photos as a rail beside one field set
- [ ] 1.2 Rail stacks above the field set on narrow screens
- [ ] 1.3 Add a photo and it appears at the end of the rail and saves
- [ ] 1.4 Capture two photos and get one merged field set with no evidence panel
- [ ] 1.5 Start a new packet with sensible editable defaults that never overwrite input

## 2. Prototype shell

- [ ] 2.1 No new prototype — work lands in the existing `experiments/simple-seed-organizer/prototype/` Next.js app
- [ ] 2.2 Dev: `cd experiments/simple-seed-organizer/prototype/app && npm run dev`; verify the rail + merged field set + defaults via `/dev/components` and the `/seeds/[id]/edit` route
- [ ] 2.3 Ground every UI step in Figma `S8YJQugvMmn5jaRqwFM5XO` node `156-9525` (already pulled via `get_design_context`); convert to the prototype's existing styling system + tokens per `rules/design-guidelines.mdc` — do **not** add Tailwind

## 3. Implementation

### Photo rail (1.1, 1.2, 1.3)

- [ ] 3.1 `components/PhotoRail.tsx` (new) — render `seed.photos` sorted by `order` as framed thumbnails (Figma `149:1663`: 400px desktop, 4px radius, `object-contain`), with a trailing **add-photo** tile
- [ ] 3.2 `components/AddSeedForm.tsx` — drive the left column from `photos[]` state instead of `frontImage`/`backImage`; mount `PhotoRail` in the editing-view Section (Figma `156:9559`)
- [ ] 3.3 Add-photo affordance — file picker appends `{ id: crypto.randomUUID(), path: <objectURL>, order: photos.length }` to local state; generalize the existing `addPhotoSlot` save path (Change 1, `AddSeedForm.tsx:613`) to iterate the rail so the new photo uploads + persists on save
- [ ] 3.4 Responsive — two-column at L·1024 (rail beside fields), single-column at S·480 (rail stacks above, scrollable), via the prototype's existing breakpoint approach

### Merged field set — fold front/back (1.4)

- [ ] 3.5 `components/AddSeedForm.tsx` — collapse `getKeyValuePairsBySource()` (`:104`, `:280`) to one ordered list; drop `.front`/`.back`
- [ ] 3.6 Remove the **"Back image evidence"** panel (`:1799`–~1815) and its copy
- [ ] 3.7 Strip `side: "front" | "back"` threading from `extractSingleImage` (`:412`), `handleFileSelect` (`:475`), the extraction `formData` (`:429`), and the `mergeExtractedData(prev, data, side)` call (`:458`) → `mergeExtractedData(prev, data)`; remove F/B badges. (Completes Change 1 task 3.7, deliberately deferred.)

### Good defaults (1.5)

- [ ] 3.8 `lib/seedEntryDefaults.ts` (new) — `getEntryDefaults()` returns editable defaults for common fields (`type`, `year = new Date().getFullYear()`, sun/quantity placeholders), reconciled with `lib/seedFieldRegistry.ts` rather than a parallel hard-coded list
- [ ] 3.9 `components/AddSeedForm.tsx` — apply defaults **only where the field is empty** on a **new** packet (not when editing an existing seed); never overwrite user input or extraction values

## 4. QA

- [ ] 4.1 Manual walkthrough on `/seeds/[id]/edit`: (a) open a seed with ≥2 photos → rail beside one field set, no F/B labels; (b) resize to 480 → rail stacks above; (c) add a photo → appears last, save/reload persists it; (d) capture 2 photos → one merged field set, no evidence panel; (e) start a new packet → editable defaults present, typing/extraction never overwritten
- [ ] 4.2 `/dev/components` — rail + merged field set render with tokens matching Figma `156-9525`
- [ ] 4.3 Grep guard — no remaining `getKeyValuePairsBySource(...).back`, `"Back image evidence"`, or `side === "back"`; typecheck + existing tests green
