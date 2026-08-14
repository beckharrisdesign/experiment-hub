## Human anchor

> "I want to abandon the front/back model. I tried it, but it forces users to a) take more photos, and b) look too many places for information." … "Data gets read from both sides and populates a common set of fields." … "[A photo collection] is closer to what real gardeners will need, esp once you get into saved seeds and homemade packaging."
> — Katy, 2026-06-01

## Outcomes

- **Who:** Me (solo founder) and the gardeners using Simple Seed Organizer — including the ones cataloging saved seed and hand-labeled / homemade packaging, where "front" and "back" stop meaning anything.
- **Job:** Store a packet's photos as an ordered **collection**, not a fixed front/back pair, so a seed can have one photo, two, or several. Extraction reads whatever photos exist and folds everything into **one common field set**. Every surface that shows a packet reads from the collection.
- **Done when:**
  1. **Collection data model** — `Seed.photos: SeedPhoto[]` (`{ id, path, order, label? }`) replaces `photoFront` / `photoBack` / `photoFrontPath` / `photoBackPath` as the model the app reads and writes. No front/back identity in the new shape.
  2. **Lazy migration, no DB backfill** — a read-time shim synthesizes `photos[]` from the legacy `photoFront`/`photoBack` columns when the new field is absent; the next save of a seed writes the collection shape. Legacy columns are left intact and untouched. Existing seeds keep displaying their photos with zero data loss.
  3. **N-photo extraction** — capture/extraction folds every photo's read into the single canonical field set (no per-side panels, no F/B provenance). Builds on the existing `mergeExtractedData` / `canonicalExtraction` path.
  4. **All read surfaces consume `photos[]`** — SeedDetail, SeedCard, SeedList, SeedGallery, BatchImport, and the import payload read from the collection (via the shim for legacy rows) and still render correctly.
- **Not doing:** The edit-view layout / left photo-rail UI (that's the dependent Change 2, `seed-edit-photo-rail`). An eager backfill or dropping the legacy DB columns (a later cleanup change once the shim has run long enough). Reworking `mergeExtractedData`'s conflict-winner logic beyond confirming it's sane. Multi-photo reordering UX beyond storing `order`.

## Why

The front/back model was tried and it actively hurts: it nudges users to take two photos when one would do, and it scatters a single packet's data across two panels so people hunt for information. It also doesn't survive contact with where the product is going — saved seed in coin envelopes and homemade packaging aren't two-sided objects. The good news is the canonical merge already exists in code (`canonicalExtraction`); front/back is mostly *UI and schema* sitting on top of a model that already wants to be a collection. This change removes that scaffolding at the data layer so the edit view (Change 2) can present one packet, many photos, one field set.

This is split from the layout work deliberately: the data migration touches the database (and that Supabase project has known `schema_migrations` drift), while the layout is purely presentational and verifiable in `/dev/components`. Keeping them apart means a risky migration never blocks a CSS change, and each PR is independently reviewable.

## What changes

- Introduce `SeedPhoto` and `Seed.photos: SeedPhoto[]`; treat it as the canonical photo model throughout the prototype.
- Add a read-time converter that yields `photos[]` for any seed, synthesizing it from legacy `photoFront`/`photoBack`(`Path`) when the new field is absent — no migration run against Supabase.
- Re-key photo storage by `photoId` instead of `'front' | 'back'` for newly saved photos; legacy paths still resolve.
- Generalize extraction to fold N photos into the one canonical field set; retire per-side rendering and F/B badges at the data/converter layer.
- Update every read surface (detail, cards, list, gallery, import) to consume `photos[]`.

## Capabilities

### New Capabilities

- `seed-photo-collection`: A seed owns an ordered collection of photos (`SeedPhoto[]`), replacing the fixed front/back pair, with a read-time shim that keeps legacy rows working without a database backfill.

### Modified Capabilities

- Seed photo storage & extraction: storage keys move from side to photo id; extraction folds all photos into one canonical field set instead of splitting by side.

## Impact

- **Data / types:** `types/seed.ts` (new `SeedPhoto`, `photos[]`; legacy fields kept read-only for the shim).
- **Storage:** `lib/seed-photos.ts` (`getPhotoPath` / `uploadSeedPhoto` / `deleteSeedPhotos` re-keyed by id), `lib/storage.ts`, `lib/seedConverters.ts`, `lib/seedFieldRegistry.ts`.
- **Capture / extraction:** `components/AddSeedForm.tsx`, `app/api/packet/read-ai-single`, `mergeExtractedData`.
- **Read surfaces:** `SeedDetail.tsx`, `SeedCard.tsx`, `SeedList.tsx`, `SeedGallery.tsx`, `BatchImport.tsx`, `hooks/useImportQueue.ts`, `lib/import/seedPayload.ts` (+ test), `app/page.tsx`, `app/packet-extraction-test/page.tsx`.
- **Supabase:** no migration in this change; ⚠ confirm actual column state with `list_tables` on `orlpgxqbesxvlhlkbnqy` before relying on the shim (known migration drift).
- **Unblocks:** Change 2 `seed-edit-photo-rail` (the Figma left-rail edit layout).

## Optional links

- Experiment directory: `experiments/simple-seed-organizer/`
- Figma (edit view that motivates the split): `S8YJQugvMmn5jaRqwFM5XO` node `156-9525`
- Component table / parity: `experiments/simple-seed-organizer/docs/figma-source.md`
