# Design — seed-edit-photo-rail

> Grounded in Figma `S8YJQugvMmn5jaRqwFM5XO` node `156-9525` ("Packet Edit"), pulled via `get_design_context` on 2026-06-01. This is layout + entry-ergonomics only — no data-model or DB changes (Change 1 shipped `Seed.photos[]` in PR #218).

## Figma reference (what `156-9525` actually shows)

The "Packet Editing View" (`156:9559`) is a single horizontal **Section** with two children:

- **Left — photo column** (`149:1663`): a `400px`-wide vertical stack (`gap-32`) of packet images, each a `4px`-radius framed `<img>` at aspect `400/529` with `object-contain`. In the node it's two image slots; this is the **rail** — an ordered list of `seed.photos`, not a front/back pair.
- **Right — Metadata** (`21:2851`): `flex-1`, white card, `rounded-8`, `p-16`, `gap-8`, drop-shadow. It's a vertical list of **Image Field Row** (`21:4431` …) — one merged field set. Each row is a `Table Row`: a `267px` label column (`12px` medium, `--primary-color #15803d`, required `*` in `#a855f7`) beside a `flex-1` text input (`1px` primary border, `4px` radius, `12px` text; tall variants `h-132` for textareas). **No front/back panes, no F/B badges, no "back image evidence" panel** anywhere in the node.

Surrounding chrome (header, "Packet Details Menu" with Back + Cancel/Save top and bottom, footer) already exists in the prototype shell and is **out of scope** — we touch only the editing view.

### Tokens (from the node, map to existing prototype tokens — do not add Tailwind)

| Figma | Value | Prototype mapping |
|---|---|---|
| `--primary-color` | `#15803d` | existing green-700 token (`rules/design-guidelines.mdc`) |
| `--green/900` | `#14532d` | header/footer green |
| `--neutral-light-gray` | `#e2e8f0` | page bg |
| Section gap | `32px` | `gap-8` scale step |
| Card pad / gap | `16px` / `8px` | existing spacers |
| Photo frame radius | `4px` | existing |
| Label col width | `267px` | field-row label width |

The prototype is **not** Tailwind-with-CSS-vars; it uses the project's existing styling system. Convert the Figma classes to existing component patterns and tokens per `rules/design-guidelines.mdc` — preserve the visual design, don't import the generated Tailwind.

## Current state (what we're replacing)

`components/AddSeedForm.tsx` (1969 lines) is the shared capture/edit form, mounted by `app/seeds/[id]/edit/page.tsx`. Today it renders **two photo panes**:

- `frontImage`/`backImage` state + `frontFileInputRef`/`backFileInputRef` ([AddSeedForm.tsx:347](experiments/simple-seed-organizer/prototype/app/components/AddSeedForm.tsx#L347)).
- `extractSingleImage(image, side)` and `handleFileSelect(side, file)` thread a `side: "front" | "back"` param ([AddSeedForm.tsx:412](experiments/simple-seed-organizer/prototype/app/components/AddSeedForm.tsx#L412), [:475](experiments/simple-seed-organizer/prototype/app/components/AddSeedForm.tsx#L475)); `side` is appended to the extraction `formData` and passed to `mergeExtractedData(prev, result.data, side)`.
- `getKeyValuePairsBySource()` splits pairs into `.front` / `.back` ([AddSeedForm.tsx:104](experiments/simple-seed-organizer/prototype/app/components/AddSeedForm.tsx#L104), [:280](experiments/simple-seed-organizer/prototype/app/components/AddSeedForm.tsx#L280)).
- A **"Back image evidence"** panel renders `.back` pairs ([AddSeedForm.tsx:1799](experiments/simple-seed-organizer/prototype/app/components/AddSeedForm.tsx#L1799)).

Change 1 already landed the save path on `photos[]` ([AddSeedForm.tsx:613](experiments/simple-seed-organizer/prototype/app/components/AddSeedForm.tsx#L613) `addPhotoSlot(frontImage, 0, …)` / `addPhotoSlot(backImage, 1, …)` + "preserve photos beyond front/back" at [:616](experiments/simple-seed-organizer/prototype/app/components/AddSeedForm.tsx#L616)). So the model is ready; this change brings the **UI** onto it.

## Approach

### 1. Photo rail (replaces the two-pane left column)

Drive the left column from `seed.photos` (sorted by `order`) instead of `frontImage`/`backImage`. A `PhotoRail` subcomponent renders ordered thumbnails (Figma `149:1663` styling: `400px` desktop, `4px` frame, `object-contain`) plus a trailing **add-photo** affordance.

- **Add photo**: a tile at the end of the rail opens a file picker; on select, append `{ id: crypto.randomUUID(), path: <objectURL>, order: photos.length }` to local form state. Re-keyed storage upload (`uploadSeedPhoto`, already by photoId from Change 1) happens on save via the existing `addPhotoSlot` path generalized to iterate the rail.
- **Responsive**: Figma is the L (≥1024) two-column layout. At S (480) the rail stacks **above** the field set (single column), stays scrollable. Use the prototype's existing breakpoint approach — the Section goes from row to column.
- Keep hover-zoom and per-photo controls if cheap, but they're not required by the spec — minimum is ordered thumbnails + add.

### 2. One merged field set (removes front/back split)

- Delete the **"Back image evidence"** panel ([:1799](experiments/simple-seed-organizer/prototype/app/components/AddSeedForm.tsx#L1799)–~1815) and its copy.
- Collapse `getKeyValuePairsBySource()` to a single ordered list (drop `.front`/`.back`; the canonical merge already unifies values — `mergeExtractedData`'s `side` arg becomes vestigial).
- Drop the `side` parameter from `extractSingleImage` / `handleFileSelect` / the extraction `formData` and the `mergeExtractedData(…, side)` call. Each rail photo extracts into the **one** canonical field set; no F/B badges.
- The field set itself (Figma Metadata card, Image Field Rows) keeps its current field registry + custom-field + annotation behavior — this is not a form-logic rewrite.

### 3. Good defaults (new-packet entry only)

A small `getEntryDefaults()` helper supplies editable defaults for common fields, applied **only where the field is empty** so user input and extraction never get overwritten. Candidates from `lib/seedFieldRegistry.ts`: `type` (sensible default), `year` (`new Date().getFullYear()`), and placeholder hints for sun/quantity. Reconcile with the registry rather than hard-coding a parallel list. Defaults apply to **new** packets only, not when editing an existing seed.

## Files touched

- `components/AddSeedForm.tsx` — rail rendering, remove evidence panel + `side` threading, merged field set, wire defaults. (Primary.)
- New `components/PhotoRail.tsx` (or co-located subcomponent) — ordered thumbnails + add-photo tile.
- New `lib/seedEntryDefaults.ts` (small) — `getEntryDefaults()`, reconciled with `lib/seedFieldRegistry.ts`.
- `app/seeds/[id]/edit/page.tsx` — passes `seed.photos` through (already passes the seed; minimal/no change).
- Verify in `app/dev/components/` and on `/seeds/[id]/edit`.

## Risks / decisions

- **No data changes.** Builds entirely on Change 1's `Seed.photos[]`; no Supabase migration. The save path already writes the collection shape.
- **`side` removal is safe**: the canonical extraction (`mergeExtractedData` / `canonicalExtraction`) already folds all reads into one field set; `side` only drove presentation. Removing it cannot change stored values.
- **Defaults must never overwrite.** Apply-if-empty is the invariant; this is the one behavioral subtlety and is covered by the `seed-entry-defaults` scenario.
- **Out of scope (held firm):** drag-reorder beyond setting `order`, new field types, custom-field redesign, extraction-logic rework, legacy-column cleanup.

## Verification

- `/dev/components`: rail + merged field set render with tokens matching `156-9525`.
- `/seeds/[id]/edit`: a seed with ≥2 photos shows the rail beside one field set (L), stacked (S); add-photo appends and persists on save; capturing two photos yields one field set with no evidence panel / no F/B badges; a new packet shows editable defaults that never overwrite input.
- Typecheck + existing tests green; grep guard: no remaining `getKeyValuePairsBySource(...).back` / "Back image evidence" / `side === "back"`.
