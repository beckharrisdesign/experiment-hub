## Context

The Simple Seed Organizer (`experiments/simple-seed-organizer/prototype/app/`) stores seed packets in a Supabase `seeds` table. All packet fields (`spacing`, `planting_depth`, etc.) are nullable columns. CRUD is largely implemented: the `AddSeedForm` handles create and update via a full-page edit flow; `SeedDetail` handles read; deletion is confirmed in `seeds/[id]/page.tsx`.

Three gaps remain:

1. No way to hide irrelevant fields per seed — every seed always shows every canonical field, even ones not on the packet.
2. The single `notes` column conflates AI-extracted packet content (description, planting instructions) with user observations. There's no dedicated place for personal notes.
3. No way to attach a user comment to a specific packet value (e.g., "I plant these 6 inches apart, not 12") in a structured way that survives re-extraction.

**Implementation choice:** Per-field notes reuse the existing `instruction_annotations` JSONB column and `Seed.instructionAnnotations` (`SeedInstructionAnnotation[]` with `fieldKey`). No separate `field_annotations` map column — one less migration surface and a single source of truth for “my note on this field.”

All additions are backward compatible; existing rows remain valid after new nullable columns default.

## Goals / Non-Goals

**Goals:**

- Add `hidden_fields text[]` column: tracks which canonical field keys a user has explicitly hidden for a specific seed.
- Add `my_notes text` column: user-authored observations clearly separated from packet content.
- **Reuse** `instruction_annotations` for per-field user notes (no new JSONB map column).
- Surface `hidden_fields`, `my_notes`, and instruction annotations in `SeedDetail` (read). Surface **instruction annotations** on `AddSeedForm` in **both create (new seed) and edit** modes so users can attach per-field notes before first save. (`my_notes` remains scoped to edit/detail per product density — see specs.)
- Update `types/seed.ts`, `lib/storage.ts` column projection, and `convertDbSeedToSeed` / `convertSeedToDbSeed` for the new columns; annotations already round-trip via existing converters.

**Non-Goals:**

- User-defined completely custom fields (arbitrary key-value pairs per seed) — the complexity of schema-less storage is not warranted yet.
- Bulk field-hiding across all seeds at once (global field preferences) — that's a profile-level setting for a future change.
- Reordering canonical fields — display order stays fixed.
- **Inferring `hidden_fields` from AI output** — empty or missing transcription for a canonical field MUST NOT add that key to `hidden_fields`; only explicit user hide/restore.

## Decisions

### 1. `hidden_fields` as a text array, not a visibility flags JSONB

**Decision**: `hidden_fields text[]` — a Postgres text array listing canonical field keys the user has hidden (e.g., `['spacing', 'daysToGermination']`).

**Rationale**: An allowlist of hidden fields is smaller and more forward-compatible than a full visibility map. Adding a new canonical field in the future automatically makes it visible to all existing seeds without a migration. An explicit "hidden" list also makes intent clear.

**Alternative considered**: `visible_fields text[]` (allowlist of what's shown) — rejected because it would require a migration to make new fields visible on existing seeds.

**Alternative considered**: JSONB map `{ spacing: false, ... }` — more verbose for the same information, and requires keeping the map in sync with the canonical list.

### 2. Per-field annotations: reuse `instruction_annotations`, not `field_annotations`

**Decision**: Keep using `instruction_annotations` (JSONB array of objects with `fieldKey` and annotation text, aligned with `SeedInstructionAnnotation`). Do **not** add `field_annotations jsonb`.

**Rationale**: The column and UI paths already exist; adding a parallel map would duplicate semantics and complicate merges (which map wins?). Extending the existing array model keeps one persistence path and matches `seedFieldRegistry` helpers.

**Alternative considered**: New `field_annotations jsonb` as `{ [key]: string }` — rejected to avoid duplicate storage and migration.

### 3. `my_notes` as a separate text column (not merged into existing `notes`)

**Decision**: Add `my_notes text`, keep `notes` for packet-extracted content.

**Rationale**: The existing `notes` column is populated by AI extraction (`description` + `plantingInstructions` from the packet). Merging user observations into the same field makes it impossible to re-extract or re-sync from the packet without wiping personal content. Separation preserves both sources independently.

**Alternative considered**: A prefix/delimiter convention in `notes` (e.g., `--- My notes ---`) — brittle, hard to parse, bad UX.

### 4. UI placement — annotation toggle per field row, not a separate panel

**Decision**: In `AddSeedForm` (new seed **and** edit) and `SeedDetail`, each field row gets a small annotation affordance that reveals a textarea inline below the packet value. On **create**, annotations are held in component state and written with the initial insert as `instruction_annotations` (empty array default). Hidden field management lives in an "Add field back" chip list below the last visible field (seed form).

**Rationale**: Keeping annotations inline with their parent field makes the relationship clear without adding a separate panel or page. The "Add field" affordance at the bottom of the form is a familiar pattern (similar to adding fields in Notion or Linear). New and edit flows share the same row-level pattern so Auto Entry + annotation can happen in one pass.

**Alternative considered**: A dedicated "My Customizations" section listing all annotations — readable, but severs the visual link between the annotation and the field value it references.

### 5. AI transcription MUST NOT drive `hidden_fields`

**Decision**: Auto Entry, packet AI extraction, and import paths SHALL fill canonical columns and `notes` as they do today and SHALL **not** append keys to `hidden_fields` based on empty, null, or missing extracted values for those keys. `hidden_fields` changes only from explicit user hide/restore actions in the UI.

**Rationale**: Auto-hiding "blank" fields would surprise users, hide data they might fill manually, and conflate "AI had nothing" with "I do not want this field."

### 6. Canonical field key names

The canonical keys used in `hidden_fields` and in `instruction_annotations[].fieldKey` match the `Seed` TypeScript interface camelCase property names (`spacing`, `plantingDepth`, `daysToGermination`, etc.). Shared helpers live in `lib/seedPacketHideableFields.ts` for hideable packet rows.

## Risks / Trade-offs

- **JSONB array in Supabase RLS**: Already supported; existing GIN index on `instruction_annotations` remains relevant.
- **`hidden_fields` becoming stale**: If a canonical field is renamed or removed, the hidden_fields array silently carries a dead key. Mitigation: the rendering layer ignores unknown keys in the array — no crash, just a harmless stale entry.
- **`notes` content hygiene**: Keeping `notes` as packet-sourced and `my_notes` as user-authored requires UI copy to be clear. Risk: users write personal notes into `notes` anyway (it already exists and is labeled just "Notes"). Mitigation: relabel `notes` as "Packet notes" in the form and detail view; label `my_notes` as "My notes" with a sub-label "(not on the packet)".

## Migration Plan

1. Migration `006_seed_field_extensions.sql` (already in repo) adds `instruction_annotations` if not present.
2. Migration `007_seed_hidden_and_personal_notes.sql` adds `hidden_fields text[] NOT NULL DEFAULT '{}'`, `my_notes text`, with comments clarifying annotation storage.
3. Apply locally via Supabase CLI or dashboard SQL editor; apply to production when ready.
4. Update `SEEDS_COLUMNS_WITHOUT_PHOTOS` and converters for `hidden_fields` / `my_notes`.
5. Update `types/seed.ts` — optional `hiddenFields`, `myNotes`; annotations remain `instructionAnnotations`.
6. Update `AddSeedForm` and `SeedDetail` as in specs.

Rollback: columns are additive. Reverting code leaves unused columns — safe and non-breaking.

## Resolved (was open)

- **Instruction annotations in add flow:** Yes — same per-row affordance on `AddSeedForm` for new seeds and edits; persisted on first insert with `instruction_annotations`.
- **`my_notes` in add flow:** Still **edit-only** (and detail) to keep the first-save form lighter; revisit if user research says otherwise.
- **`hidden_fields` vs AI:** Confirmed — no auto-population of `hidden_fields` from missing or empty AI output (see Decision §5).
