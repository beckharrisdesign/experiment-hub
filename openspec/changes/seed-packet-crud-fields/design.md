## Context

- Simple Seed Organizer stores packets in Supabase table `seeds` and maps rows through `types/seed.ts` and `lib/storage.ts`.
- The current `Seed` model has fixed fields: required `name`, `variety`, and `type`; optional brand/source/year/purchase/quantity/growing fields; `notes`; front/back packet photos; use-first and expiration helpers.
- Add/edit, detail, list/search, AI packet reads, import queue, and enrichment all know about portions of the same field set. Adding or removing a field currently requires coordinated edits in several places.
- The user need is broader than packet OCR: gardeners need to keep printed packet facts, personal notes, and annotations/overrides to printed instructions side by side.

## Goals / Non-Goals

**Goals:**

- Make seed packet CRUD explicit for create, read/detail, list/search/filter, update, delete, and useful adjacent actions such as duplicate or archive if implementation confirms they reduce manual re-entry.
- Create a canonical field registry so field keys, labels, data types, display grouping, source behavior, searchability, and retired/hidden state live in one reusable definition.
- Support adding/removing/hiding fields from the canonical seed list without losing existing seed data.
- Support user-defined custom fields when canonical fields are insufficient.
- Preserve a clear distinction between packet facts, user notes, and user annotations to printed instructions.
- Keep import/AI review as a user-confirmed merge into canonical packet facts.

**Non-Goals:**

- A full garden planner, bed layout tool, or scheduling calendar.
- Collaborative multi-user field schema administration beyond the current per-account ownership model.
- Rebuilding existing photo storage, auth, tier limits, or use-first/viability rules unless the new field model directly touches them.
- Requiring AI to infer personal annotations; annotations are user-authored unless the user explicitly accepts suggested text in a later feature.

## Decisions

1. **Introduce a field registry as code first, with migration-ready persistence.**

   Start with a typed registry module for canonical seed fields, then add database support for custom fields and values. Canonical fields should have stable keys such as `name`, `variety`, `spacing`, or `notes`; labels; input type; value type; group; display order; source category; and visibility/search flags.

   Alternative considered: keep the existing `Seed` interface as the only source of truth. That is simpler short-term, but it keeps field behavior duplicated across forms, storage, AI mapping, and display code.

2. **Use explicit source categories instead of one generic custom blob.**

   Field values should be classified as:

   - `packet_fact`: printed or AI-extracted packet information
   - `user_note`: general user-authored inventory context
   - `instruction_annotation`: user-authored comment or override tied to printed instructions or growing fields
   - `system`: computed or app-managed values such as use-first and timestamps

   Alternative considered: append all manual content to `notes`. That matches the current model but makes it hard to show "the packet says 12 inches, I plant 8 inches" without rewriting the original fact.

3. **Keep current columns for stable first-class fields; add extension storage for custom fields and annotations.**

   Existing high-use columns should remain because they are already used by search, filters, list performance, viability, and import flows. New custom field values and instruction annotations can live in related tables or a JSONB extension column, chosen during implementation after checking Supabase query and migration ergonomics.

   A related-table shape is favored when fields need per-user definitions, sorting, and searchable values. JSONB is acceptable for low-query metadata, but it must not make common list/search paths slower.

4. **Retire canonical fields by hiding them, not dropping data immediately.**

   Removing a field from the canonical list should mark it hidden/retired for future entry and default displays while preserving existing stored values for detail view, export/migration, and rollback.

   Alternative considered: destructive column removal during each field-list change. That is risky for user data and makes product experimentation harder.

5. **Import and AI write only through a review/merge layer.**

   Packet extraction should map raw OCR/AI output into registry fields and show source context before save. AI may fill canonical packet facts, but it must not overwrite user notes, custom field values, or annotations unless the user explicitly chooses to replace them.

6. **Treat annotations as overlays on packet instructions.**

   Printed instruction fields such as `spacing`, `plantingDepth`, `sunRequirement`, and future instruction fields should support a paired user annotation. Detail views should be able to show both "packet says" and "my note" without hiding either.

## Risks / Trade-offs

- **[Risk] Field flexibility turns a simple app into a spreadsheet.** → Mitigation: keep the canonical list opinionated, expose custom fields behind progressive disclosure, and prioritize detail/edit clarity over dense table configuration.
- **[Risk] Search/list performance degrades with custom fields.** → Mitigation: keep first-class columns for common list fields, index any related-table fields that become searchable, and avoid loading photos/custom payloads in the initial list query.
- **[Risk] AI extraction drifts from the registry.** → Mitigation: require a single mapping layer from extraction keys to registry keys and test unknown/retired-field behavior.
- **[Risk] Retired fields confuse users.** → Mitigation: show retired fields only when an existing seed has a value, with neutral labeling such as "saved from older field".
- **[Risk] Data migration is hard to roll back.** → Mitigation: add nullable extension tables/columns first, backfill from existing `notes` only when a deterministic mapping exists, and keep old columns until the new read/write paths are verified.

## Migration Plan

- Add registry code and tests while preserving current `Seed` read/write behavior.
- Add Supabase migration(s) for custom field definitions, custom values, and instruction annotations or equivalent JSONB extension storage.
- Update storage converters to round-trip existing fields plus extension data.
- Update add/edit/detail/import flows to consume registry metadata.
- Backfill only safe defaults, such as creating annotation containers for existing seeds without parsing freeform `notes`.
- Rollback by hiding new UI paths and leaving extension data untouched; existing seed columns continue serving the current app.

## Open Questions

- Should custom fields be per account/user only, or eventually shareable as templates? The first implementation should assume per-user ownership.
- Should "delete seed" remain destructive, or should an archive action come first for users who want seasonal history? The spec can support both, but implementation may defer archive if product scope needs to stay small.
- Which canonical instruction fields should get first-class annotation UI first: spacing, planting depth, sun, planting months, or a broader "printed instructions" block?
- Should `sunRequirement` keep the current enum in the TypeScript type, or become verbatim packet text with normalized filter metadata? Current code comments and migrations already diverge, so implementation should resolve this deliberately.
