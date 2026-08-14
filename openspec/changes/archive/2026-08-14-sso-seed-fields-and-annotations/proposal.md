## Why

The Simple Seed Organizer prototype today supports basic seed CRUD (add, view, edit, delete) and AI-assisted packet reads, but a real user with 20+ packets quickly runs into three gaps the current build does not address: (1) **missing CRUD verbs** like duplicate, archive/restore, and bulk operations on the inventory; (2) **no way to add or remove fields** beyond the hardcoded shape in `types/seed.ts` (e.g. the user can't add "tray location" or hide "brand"); and (3) **no first-class place for per-seed annotations** that override or augment what's printed on the packet itself — for example "plant 6 in. apart instead of 12, this variety likes density" or "saved from 2023 patch — viability uncertain". The current `notes` text field is one undifferentiated blob and cannot attach to a specific instruction. This change scopes the platform behavior needed so users can manage seed inventory beyond add/edit/delete, customize their packet schema without a code change, and capture hand-entered annotations alongside packet-extracted data.

## What Changes

- **Extend seed CRUD verbs** beyond add / edit / delete: duplicate a packet (with or without photos), archive and restore (soft delete), bulk archive / delete / change-type from the list, and an "empty / used up" state distinct from delete so history is preserved.
- **Introduce a canonical seed field registry** that lists every field the prototype understands today (name, variety, type, brand, source, year, purchase date, quantity, days to germination, days to maturity, planting depth, spacing, sun requirement, planting months, custom expiration, use-first, photos, notes). Each entry records: id, label, data type, group (identity / sourcing / growing / planting / photos / other), default visibility, and whether it is required.
- **Let users hide, show, and re-add canonical fields per account** without changing the database shape. Hidden fields stay in the data model and continue to round-trip with imports / AI fills; they just disappear from add, edit, and detail views until restored.
- **Let users define custom fields per account** (string, number, date, single-select, or long-text) drawn from a per-user list, with stable ids so they survive renames. Custom fields render in add/edit/detail alongside canonical ones and persist with the seed row.
- **Add per-seed annotations** as a structured layer separate from `notes`: each annotation has a target (whole seed, or one of: spacing / depth / planting-months / sun / days-to-germination / days-to-maturity / custom-field-id), free-text body, and a "override vs. additive" flag. Detail view shows annotations inline with the field they annotate; export keeps both packet value and annotation.
- Keep the existing plain `notes` field, but route new free-text additions through the annotation system when the user attaches them to a specific field. Loose, unscoped notes remain valid for whole-seed thoughts.
- **BREAKING**: none. Database adds new columns / tables and new API surface; existing seed rows continue to load.

## Capabilities

### New Capabilities

- `seed-packet-management`: Defines the platform-level rules for seed packet CRUD (including duplicate, archive/restore, bulk actions, used-up state), the canonical+custom field schema (per-account visibility and user-defined fields), and per-seed annotations layered on packet data.

### Modified Capabilities

_(none — existing specs do not cover seed packet data behavior; the design-system spec is unrelated.)_

## Impact

- **Code (`experiments/simple-seed-organizer/prototype/app/`)**:
  - `types/seed.ts` — extend with `status` (active / archived / used-up), `customFields`, `annotations`, and a `userFieldSchema` reference; keep `notes` for unscoped thoughts.
  - `lib/` — new `fieldSchema.ts` (canonical registry + per-user overrides), `annotations.ts` (annotation shape + helpers), updates to `seedUtils.ts` and `autoEntry.ts` so AI/import paths skip hidden fields and round-trip custom fields.
  - `components/` — `AddSeedForm.tsx`, `SeedDetail.tsx`, `SeedList.tsx`, `SeedCard.tsx`: respect visibility, render custom fields, show annotations attached to the field they target; new `FieldSchemaEditor.tsx` (in `app/profile/`) and `SeedAnnotationEditor.tsx`.
  - `app/api/` — new routes for duplicate, archive/restore, bulk actions, field schema, and annotations; existing `seeds` PATCH route extended to accept custom field values and annotations.
- **Database (`supabase/migrations/`)**: new migrations for `seed_status`, `user_field_schema`, `seed_custom_values`, `seed_annotations` (or equivalent JSONB columns on `seeds`), all under RLS scoped by `user_id`.
- **Docs**: `experiments/simple-seed-organizer/docs/PRD.md` (Core Features → Inventory bullet expanded to mention custom fields + annotations); new short note in `figma-source.md` if new screens (field schema editor, annotation editor) get Figma frames.
- **Tests (`tests/`)**: vitest coverage for `fieldSchema`, `annotations`, the new API routes, and migration round-trip; new component tests for the schema editor and annotated detail rendering.
- **Out of scope**: sharing field schemas between accounts, per-seed photo annotations (drawing on the packet image), and any tier/usage gating beyond what existing plan limits already cover.
