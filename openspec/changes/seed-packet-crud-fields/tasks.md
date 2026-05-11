## 1. Baseline and tests

- [x] 1.1 Audit current seed field usage across `types/seed.ts`, `lib/storage.ts`, add/edit forms, detail/list views, import queue, and packet reader mapping.
- [x] 1.2 Add failing unit tests for canonical field registry metadata, including key, label, type, group, source category, display order, searchability, and retired status.
- [x] 1.3 Add failing storage tests for round-tripping existing canonical seed fields plus custom field values and instruction annotations.
- [x] 1.4 Add failing import/AI merge tests that verify extracted packet facts do not overwrite user notes or annotations without explicit acceptance.

## 2. Canonical field registry

- [ ] 2.1 Create a typed seed field registry module for canonical fields and supported value types.
- [ ] 2.2 Mark each current seed field with source category: packet fact, user note, instruction annotation, or system.
- [ ] 2.3 Add helpers for active fields, retired fields with existing values, searchable fields, editable fields, and detail display groups.
- [ ] 2.4 Update existing hardcoded field lists in form/review/detail code to consume registry metadata where practical.

## 3. Persistence and migration

- [ ] 3.1 Add Supabase migration(s) for custom field definitions owned by user/account.
- [ ] 3.2 Add Supabase migration(s) for custom field values associated with seed packets.
- [ ] 3.3 Add Supabase migration(s) or JSONB extension storage for instruction annotations associated with seed packets and field keys.
- [ ] 3.4 Preserve existing `seeds` table columns and add indexes for any searchable extension values selected for the first pass.
- [ ] 3.5 Document rollback behavior for extension data and ensure old seed rows remain readable.

## 4. Storage and domain model

- [ ] 4.1 Extend `Seed` types or companion types to represent canonical values, custom values, notes, and instruction annotations.
- [ ] 4.2 Update `convertSeedToDbSeed` and DB-to-seed conversion helpers to preserve extension values without dropping existing columns.
- [ ] 4.3 Update create, update, get-by-id, list, and delete functions to include custom values and annotations where each view needs them.
- [ ] 4.4 Ensure delete removes associated custom values, annotations, and storage photos according to RLS and storage ownership rules.

## 5. Packet CRUD user experience

- [ ] 5.1 Update manual add/edit to render active canonical fields from registry metadata and validate values by field type.
- [ ] 5.2 Add custom field management UI for creating, renaming, reordering, hiding, and deleting user custom fields.
- [ ] 5.3 Add custom field value editing within seed create/edit flows.
- [ ] 5.4 Add note editing that is explicitly separate from packet facts and custom fields.
- [ ] 5.5 Add annotation editing for printed instruction fields, starting with spacing and planting depth or the first agreed instruction subset.
- [ ] 5.6 Confirm destructive delete UX still requires user confirmation and communicates photo removal.

## 6. Import and AI review

- [ ] 6.1 Update AI/OCR extraction mapping to resolve known keys through the canonical field registry.
- [ ] 6.2 Preserve unmapped key/value pairs as reviewable raw packet text or custom-field candidates.
- [ ] 6.3 Update import review to show packet fact changes separately from notes, custom values, and annotations.
- [ ] 6.4 Require explicit user acceptance before AI/import replaces existing user-authored content.

## 7. Search, list, and detail display

- [ ] 7.1 Update list/search logic to use registry metadata for searchable canonical fields and enabled custom fields.
- [ ] 7.2 Keep initial list loading performant by avoiding unnecessary photo and extension payloads in summary queries.
- [ ] 7.3 Update seed detail grouping for packet facts, growing instructions, notes, annotations, custom fields, photos, and system metadata.
- [ ] 7.4 Show retired canonical fields only when existing seed data is present, with a neutral retired-field label.

## 8. Verification and documentation

- [ ] 8.1 Run focused unit tests for registry, storage conversion, import merge, and search behavior.
- [ ] 8.2 Run the Simple Seed Organizer build from `experiments/simple-seed-organizer/prototype/app`.
- [ ] 8.3 Smoke test add, detail, edit, delete, import review, custom field, note, and annotation flows.
- [ ] 8.4 Update experiment docs or PRD notes if the final canonical field list or CRUD surface changes user-facing scope.
- [ ] 8.5 Archive this OpenSpec change after implementation and update `openspec/specs/seed-packet-management/spec.md`.
