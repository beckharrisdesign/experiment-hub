## Context

The prototype models packet imagery as a fixed pair: `Seed.photoFront` / `Seed.photoBack` (display) and `photoFrontPath` / `photoBackPath` (storage), with storage paths `{user}/{seed}/front.jpg|back.jpg`. Front/back is woven through ~14 files and the Supabase `seeds` table. This change replaces that pair with an ordered collection at the data layer, behind a read-time shim so nothing migrates in the database. The edit-view UI that exploits the collection is the dependent change `seed-edit-photo-rail` (Change 2) and is out of scope here.

## Goals / Non-Goals

**Goals:**

- One canonical photo model — `Seed.photos: SeedPhoto[]` — that the whole app reads and writes.
- Legacy front/back rows keep working with zero DB writes (lazy shim).
- Extraction folds N photos into the single canonical field set; per-side rendering and F/B provenance retired at the converter layer.
- All read surfaces consume `photos[]`.

**Non-Goals:**

- Edit-view photo-rail layout, "add photo" affordance, sticky rail (Change 2).
- Eager backfill or dropping legacy columns (later cleanup change).
- Reworking `mergeExtractedData` conflict-winner logic (verify only).
- Reordering / captioning UX beyond persisting `order` and optional `label`.

## User flow / IA

No new user-facing flow in this change — it is a data-model swap that must be invisible to users. Observable behavior: existing seeds display identical photos before/after; a seed can hold one or many photos; capture produces one merged field set. The visible flow change (left photo rail, add-photo) lands in Change 2.

## Visual design / Figma

| Item             | Value                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------- |
| Primary file URL | N/A — no UI in this change. Motivating edit view: `S8YJQugvMmn5jaRqwFM5XO` node `156-9525` (Change 2)    |
| Frames in scope  | None (data/storage/extraction only)                                                                     |
| Libraries        | N/A                                                                                                     |
| Breakpoints      | N/A — no layout. Change 2 uses S · 480px / L · 1024px per `.cursor/rules/design-guidelines.mdc`         |
| Status           | API/data-only — UI deferred to `seed-edit-photo-rail`                                                   |

## Decisions

### `SeedPhoto` shape

```ts
interface SeedPhoto {
  id: string;        // stable uuid; also the storage key
  path: string;      // storage path OR legacy base64 data URL (back-compat)
  order: number;     // ascending; rail order in Change 2
  label?: string;    // optional user hint ("instructions", "seed close-up") — NOT front/back identity
}
// types/seed.ts
interface Seed {
  photos?: SeedPhoto[];
  // legacy, retained read-only for the shim — not written by new code paths:
  photoFront?: string; photoBack?: string;
  photoFrontPath?: string; photoBackPath?: string;
}
```

`label` is optional and free-form so the saved-seed / homemade-packaging case can keep a human hint without reintroducing structural sides.

### Lazy shim (single source: the converter)

Put the synthesis in **one** place — `lib/seedConverters.ts`, where rows become `Seed` — so every read surface inherits it for free:

```
row → toSeed(row):
  if row.photos?.length: use as-is
  else: photos = [
    front && { id:'legacy-front', path: frontPath ?? photoFront, order:0, label:'front' },
    back  && { id:'legacy-back',  path: backPath  ?? photoBack,  order:1, label:'back'  },
  ].filter(Boolean)
```

Read surfaces (`SeedDetail/Card/List/Gallery`, `BatchImport`, import payload) consume `seed.photos` only. Legacy `legacy-front`/`legacy-back` ids signal "not yet upgraded"; they are replaced with real uuids on the first save.

### Storage re-keyed by photo id

`getPhotoPath(user, seed, photoId)` → `{user}/{seed}/{photoId}.jpg` (was `…/front.jpg|back.jpg`). `uploadSeedPhoto` takes `photoId` instead of `side`. Legacy paths already stored on rows still resolve through `getPhotoUrl`/`getSignedPhotoUrl` unchanged — we never rewrite them, the shim just hands them back as a `SeedPhoto.path`. `deleteSeedPhotos` lists the seed folder rather than the two fixed names.

### Extraction folds N → one field set

`AddSeedForm` drops `getKeyValuePairsBySource().front/.back` and the "back image evidence" panel. Each photo's extraction calls the existing `mergeExtractedData(prev, data)` into one accumulator; the `side` argument and F/B badges are removed. The `read-ai-single` API keeps working per-image; `side` becomes an ignored/optional param (no contract break).

### Write path

On save, `AddSeedForm` emits `seedData.photos` (uploading any local blobs first, keyed by new uuids). It stops writing `photoFront*/photoBack*`. Persisting `photos[]` is what upgrades a legacy row in place.

## Risks / Trade-offs

- **Supabase column reality** — the `seeds` table needs a place to persist `photos[]` (jsonb column, or reuse an existing flexible column). ⚠ Known `schema_migrations` drift on `orlpgxqbesxvlhlkbnqy`; **first task is `list_tables` to confirm actual columns** before assuming a `photos` column exists or must be added. If a column add is unavoidable it's the one DB change here — scope it minimally, additive, nullable.
- **Two shapes coexist** — until every row is touched, reads must tolerate both. Mitigated by funneling all synthesis through the single converter; no surface branches on legacy vs new.
- **Legacy data-URL photos** — some old rows store base64 in `photoFront` directly (not a path). The shim must pass those through as `path` without trying to sign them. `getPhotoUrl` already distinguishes data URLs from storage paths — reuse that guard.
- **Merge winner** — when two photos report the same field, `mergeExtractedData` picks one. Out of scope to change, but tasks include a read-through to confirm it doesn't silently drop the better value.
- **Import payload parity** — `lib/import/seedPayload.ts` has a test; update it alongside so batch import round-trips `photos[]`.
