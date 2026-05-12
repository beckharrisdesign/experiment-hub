## Context

The Simple Seed Organizer (`experiments/simple-seed-organizer/prototype/app/`) stores seed packets in a Supabase `seeds` table. All packet fields (`spacing`, `planting_depth`, etc.) are nullable columns. CRUD is largely implemented: the `AddSeedForm` handles create and update via a full-page edit flow; `SeedDetail` handles read; deletion is confirmed in `seeds/[id]/page.tsx`.

Three gaps remain:
1. No way to hide irrelevant fields per seed — every seed always shows every canonical field, even ones not on the packet.
2. The single `notes` column conflates AI-extracted packet content (description, planting instructions) with user observations. There's no dedicated place for personal notes.
3. No way to attach a user comment to a specific packet value (e.g., "I plant these 6 inches apart, not 12").

All three are pure data additions with no schema-breaking changes; existing rows are fully valid once the three new nullable columns are added.

## Goals / Non-Goals

**Goals:**
- Add `hidden_fields text[]` column: tracks which canonical field keys a user has explicitly hidden for a specific seed.
- Add `my_notes text` column: user-authored observations clearly separated from packet content.
- Add `field_annotations jsonb` column: inline string annotations keyed by canonical field name (e.g., `{ "spacing": "I use 6 in raised beds" }`).
- Surface all three in `AddSeedForm` (edit) and `SeedDetail` (read).
- Update `types/seed.ts`, `lib/storage.ts` column projection, and `convertDbSeedToSeed` to include new fields.

**Non-Goals:**
- User-defined completely custom fields (arbitrary key-value pairs per seed) — the complexity of schema-less storage is not warranted yet.
- Bulk field-hiding across all seeds at once (global field preferences) — that's a profile-level setting for a future change.
- Reordering canonical fields — display order stays fixed.

## Decisions

### 1. `hidden_fields` as a text array, not a visibility flags JSONB

**Decision**: `hidden_fields text[]` — a Postgres text array listing canonical field keys the user has hidden (e.g., `['spacing', 'daysToGermination']`).

**Rationale**: An allowlist of hidden fields is smaller and more forward-compatible than a full visibility map. Adding a new canonical field in the future automatically makes it visible to all existing seeds without a migration. An explicit "hidden" list also makes intent clear.

**Alternative considered**: `visible_fields text[]` (allowlist of what's shown) — rejected because it would require a migration to make new fields visible on existing seeds.

**Alternative considered**: JSONB map `{ spacing: false, ... }` — more verbose for the same information, and requires keeping the map in sync with the canonical list.

### 2. `field_annotations` as JSONB

**Decision**: `field_annotations jsonb` with the shape `{ [canonicalKey: string]: string }`.

**Rationale**: Annotations are keyed by canonical field name and are sparse (most fields have no annotation). JSONB is the natural fit for sparse, key-addressed string data in Postgres. Supabase returns JSONB as a JS object, requiring no parsing code.

**Alternative considered**: A separate `seed_annotations` junction table — overkill for a simple string-per-field annotation; adds a join to every seed fetch.

### 3. `my_notes` as a separate text column (not merged into existing `notes`)

**Decision**: Add `my_notes text`, keep `notes` for packet-extracted content.

**Rationale**: The existing `notes` column is populated by AI extraction (`description` + `plantingInstructions` from the packet). Merging user observations into the same field makes it impossible to re-extract or re-sync from the packet without wiping personal content. Separation preserves both sources independently.

**Alternative considered**: A prefix/delimiter convention in `notes` (e.g., `--- My notes ---`) — brittle, hard to parse, bad UX.

### 4. UI placement — annotation toggle per field row, not a separate panel

**Decision**: In `AddSeedForm` and `SeedDetail`, each field row gets a small annotation affordance (a `+` icon or "annotate" link) that reveals a textarea inline below the packet value. Hidden field management lives in an "Add field" chip list below the last visible field.

**Rationale**: Keeping annotations inline with their parent field makes the relationship clear without adding a separate panel or page. The "Add field" affordance at the bottom of the form is a familiar pattern (similar to adding fields in Notion or Linear).

**Alternative considered**: A dedicated "My Customizations" section listing all annotations — readable, but severs the visual link between the annotation and the field value it references.

### 5. Canonical field key names

The canonical keys used in `hidden_fields` and `field_annotations` match the `Seed` TypeScript interface camelCase property names (`spacing`, `plantingDepth`, `daysToGermination`, etc.). This avoids a translation layer and makes type-safe helpers straightforward.

## Risks / Trade-offs

- **JSONB vs text array in Supabase RLS**: Both types are fully supported in Supabase RLS policies. No risk here, but any future row-level policies that filter on `field_annotations` content will need GIN indexes.
- **`hidden_fields` becoming stale**: If a canonical field is renamed or removed, the hidden_fields array silently carries a dead key. Mitigation: the rendering layer ignores unknown keys in the array — no crash, just a harmless stale entry.
- **`notes` content hygiene**: The proposal to keep `notes` as packet-sourced and `my_notes` as user-authored requires UI copy to be clear. Risk: users write personal notes into `notes` anyway (it already exists and is labeled just "Notes"). Mitigation: relabel `notes` as "Packet notes" in the form and detail view; label `my_notes` as "My notes" with a sub-label "(not on the packet)".

## Migration Plan

1. Write a new Supabase migration `006_seed_custom_fields.sql`:
   - `ALTER TABLE seeds ADD COLUMN hidden_fields text[] DEFAULT '{}';`
   - `ALTER TABLE seeds ADD COLUMN my_notes text;`
   - `ALTER TABLE seeds ADD COLUMN field_annotations jsonb DEFAULT '{}';`
2. Apply locally via Supabase CLI or dashboard SQL editor; apply to production via Supabase dashboard migrations.
3. Update `SEEDS_COLUMNS_WITHOUT_PHOTOS` in `lib/storage.ts` to include the three new columns.
4. Update `convertDbSeedToSeed` and `convertSeedToDbSeed` helper functions to round-trip the new fields.
5. Update `types/seed.ts` — no breaking changes since all new fields are optional.
6. Update `AddSeedForm` and `SeedDetail` — new UI surfaces described in specs.

Rollback: columns are additive and nullable. Reverting the code changes leaves three unused columns — safe and non-breaking.

## Open Questions

- Should the "My notes" section and field annotations appear in the **add** flow (new seed), or only in the **edit** flow after the seed has been created? The add flow is already dense. Recommendation: show only in edit; add flow stays focused on packet extraction.
- Should `hidden_fields` be initialized from the AI extraction result (e.g., auto-hide fields where AI returned no value)? Probably not — the user should choose explicitly. Start with no auto-hiding.
