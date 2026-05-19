## Why

Simple Seed Organizer already has the core add/import/list/detail/edit/delete loop, but seed packet data is still shaped by a fixed set of hardcoded fields. The next product slice should make it clear which seed fields are canonical, which can be added or retired over time, and how gardeners record manual knowledge that is not printed on the packet, such as notes or personal annotations to planting instructions.

## What Changes

- Define seed packet CRUD as a durable capability: create, read/list/search, update, delete, and duplicate/archive-style follow-ups where useful for a real packet collection.
- Establish a canonical seed field registry that can be extended, hidden/retired, reordered, and grouped without scattering field definitions across forms, storage mappings, import review, and detail views.
- Separate packet-extracted facts from user-authored additions:
  - packet facts: printed values such as crop name, variety, brand, year, quantity, days to germination, spacing, and sun text
  - user notes: freeform inventory notes not necessarily tied to packet text
  - instruction annotations: user overrides or comments on printed instructions, such as "plant closer together in raised beds"
- Plan for custom fields that users can add when the canonical list does not cover their workflow, while still keeping search/detail displays predictable.
- Preserve existing packet photo storage, AI extraction review, use-first, viability, and auth/RLS behavior.
- No **BREAKING** user-facing API changes are intended; database migration may be required to add field metadata, custom fields, and annotation storage while preserving existing seed rows.

## Capabilities

### New Capabilities

- `seed-packet-management`: Seed packet CRUD, canonical/custom field management, packet fact vs manual note separation, and user annotations to printed instructions.

### Modified Capabilities

_(none)_

## Impact

- **Code:** Simple Seed Organizer prototype under `experiments/simple-seed-organizer/prototype/app/`, especially `types/seed.ts`, `lib/storage.ts`, `components/AddSeedForm.tsx`, `components/SeedDetail.tsx`, import review components/hooks, and seed list/search surfaces.
- **Database:** Supabase `seeds` table and migrations; likely new JSON or related-table storage for field definitions, custom field values, and instruction annotations.
- **AI/import:** Packet extraction (`packetReaderAI`, import queue, batch import) must map extracted data into canonical packet facts and leave user-authored fields untouched unless explicitly accepted by the user.
- **UX:** Add/edit/detail experiences need controls for managing canonical/custom fields, editing notes, and annotating printed instructions without turning the product into a full planner.
- **Docs/specs:** New OpenSpec capability under `openspec/specs/seed-packet-management/` once implemented and archived.
