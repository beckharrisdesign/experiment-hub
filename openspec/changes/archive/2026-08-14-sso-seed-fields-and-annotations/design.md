## Context

- **Current data shape**: `experiments/simple-seed-organizer/prototype/app/types/seed.ts` defines a flat `Seed` interface with ~20 fields. The `seeds` table (`supabase/migrations/001_create_seeds_table.sql`) mirrors that shape one-to-one. Every field is either present-on-every-row or `NULL`; there is no concept of "this field is hidden for this user", "this field is custom", or "this value has an annotation attached".
- **Current CRUD surface**: routes exist for add (`/add`), detail (`/seeds/[id]`), edit (`/seeds/[id]/edit`), and delete (button in `SeedDetail`). Import (`/import`, `BatchImport.tsx`, `BulkCameraCapture.tsx`) creates seeds in bulk. Server routes live under `app/api/seeds/` (today only `enrich/` is broken out; basic CRUD goes through Supabase client calls in `lib/storage.ts`).
- **Current annotation surface**: a single optional `notes` text field. `SeedDetail` shows it as a free block under planting cards. There is no link between a note and a specific instruction (depth / spacing / planting month, etc.).
- **AI / import constraint**: `lib/packetReaderAI.ts` and `lib/autoEntry.ts` write into canonical fields by name. Hiding or remapping fields cannot break that path — the schema customisation must remain a presentation/registry concern, not a storage rename.
- **RLS**: all `seeds` rows are scoped by `user_id` (migration 002). Any new tables must inherit the same per-user RLS policy.
- **Tier / limits**: `lib/limits.ts` and `lib/plans.ts` already cap seed count and AI usage by tier. Custom fields and annotations are not currently metered; we will reuse the same plumbing if metering is added later.

## Goals / Non-Goals

**Goals:**

- Cover the **remaining CRUD verbs** a real inventory user needs: duplicate, archive/restore (soft delete), bulk archive/delete/change-type, and an "empty / used up" state that preserves history.
- Make the **canonical field list explicit and centralised** so it can be reasoned about as data instead of a TypeScript interface, and so the add/edit forms, the detail view, the AI enrichment path, and the import path all draw from the same registry.
- Let users **hide and re-show canonical fields** per account without losing data, and let them **define their own custom fields** (string, number, date, select, long-text) that participate in CRUD just like canonical ones.
- Give users a **first-class annotation layer** so they can write "plant 6 in. apart" against the `spacing` field instead of burying it in `notes`, and so the detail view shows the annotation next to the field it modifies, with a clear "override vs. additive" indicator.
- Keep the design **prototype-scale**: a single migration step, no new infra dependencies, no changes to AI / Stripe.

**Non-Goals:**

- Sharing field schemas or annotations between accounts (no public templates, no org-level config).
- Spatial / drawing annotations on the packet photo itself.
- Field validation richer than per-type basics (e.g. no regex constraints on custom string fields, no min/max on custom numbers beyond what HTML inputs give).
- Tier-based gating of custom fields or annotations — the platform supports unlimited; a follow-up change can wire limits if needed.
- A migration tool to fold legacy `notes` content into structured annotations. `notes` stays valid; the annotation system is additive.

## Decisions

### 1. Capability boundary: one capability, three requirement clusters

We register a single new capability, `seed-packet-management`, with three requirement clusters: **CRUD verbs**, **field schema (canonical + custom + visibility)**, and **annotations**. They are tightly coupled — adding a custom field implies CRUD on the field schema, and annotations target field ids that come from the schema — so splitting would force cross-capability references on every requirement.

**Alternative considered**: three separate capabilities (`seed-crud`, `seed-field-schema`, `seed-annotations`). Rejected: leads to forwarding requirements and makes the spec harder to read; the user's request explicitly tied the three together.

### 2. Field registry lives in code, per-user customisation lives in DB

The canonical field list (id, label, group, data type, default visibility, required) is a constant array in `lib/fieldSchema.ts`, not a database table. It changes with code releases. Per-user customisation — which canonical fields are hidden, and what custom fields the user has defined — is stored in a `user_field_schema` row (one per user) as JSONB with a versioned shape.

**Rationale**: the canonical list is a code concern (it has to match TypeScript types and AI extraction logic); the user's choices are data. A pure-DB approach would force a migration on every new canonical field; a pure-code approach would block per-user custom fields.

**Alternative considered**: store the canonical registry in DB too, treating code as a seed loader. Rejected: doubles the source of truth and complicates type safety.

### 3. Custom field values: JSONB column on `seeds`, keyed by stable field id

Custom field values live in a new `seeds.custom_values JSONB` column, keyed by the stable `customFieldId` (UUID generated on field creation, never reused). This avoids a side table and an extra join on list views, and naturally supports add/remove of fields without DDL.

**Rationale**: prototype scale; cardinality per seed is small (≤ ~20 custom fields realistically); we never need to query custom values across seeds in a structured way (search uses the existing free-text indexes). JSONB also makes import / export round-trip trivial.

**Alternative considered**: a `seed_custom_values (seed_id, field_id, value)` long table. Rejected for now: more joins, more migration noise, no clear payoff until we need cross-seed analytics on custom values.

### 4. Annotations: dedicated table, not a `seeds.annotations` JSONB blob

Annotations live in a new `seed_annotations` table (`id`, `seed_id`, `user_id`, `target_field_id` nullable, `body`, `override` boolean, `created_at`, `updated_at`). Unlike custom field values, annotations have their own create/update/delete lifecycle, can be sorted by recency in the detail view, and benefit from foreign-key cascade on seed delete.

**Rationale**: annotations are first-class user content, often plural per seed; a separate table keeps them queryable (e.g. "show all my override annotations") and gives clean RLS. `target_field_id` of `NULL` means "annotation applies to the whole seed" (i.e. a structured replacement for free-form notes targeted at no specific field).

**Alternative considered**: `seeds.annotations JSONB`. Rejected: harder to filter, no foreign keys, and per-annotation timestamps clutter the seed row.

### 5. Override vs. additive annotations are presentational, not destructive

An annotation flagged `override = true` means the detail view SHALL display the annotation **in place of** the packet value for that field, with a small "edited" affordance and a way to peek at the packet original. It does **not** modify `seeds.<field>` — the original value remains intact in case the user clears the annotation.

**Rationale**: keeps the packet read (manual or AI) immutable and recoverable; matches the user's mental model ("the packet says 12 in., but I'm planting closer"). It also means AI re-enrichment can update packet values without stomping the user's annotation, because storage and presentation are decoupled.

**Alternative considered**: overwrite the field directly. Rejected: loses provenance and forces the user to remember what the packet originally said.

### 6. Soft delete (archive) is the new default destructive action; hard delete still exists

A seed has a `status: 'active' | 'archived' | 'used_up'` column. Archive is the primary UI action (was: delete); hard delete is moved behind a confirm dialog from the archive view. `used_up` is a separate state distinct from archive — used-up seeds disappear from default views (same as archive) but are intended for history / re-order tracking and don't carry the "I'm cleaning up" implication.

**Rationale**: users with 20+ packets routinely empty a packet without wanting to forget they had it; archive is the standard inventory verb. Hard delete remains for genuinely wrong rows (test data, duplicates).

### 7. Bulk actions are list-level, not detail-level

Bulk actions (archive / delete / change-type) live on the list (`SeedList.tsx`) behind a select-mode toggle. The detail view stays single-seed. Bulk operations hit one new API route (`POST /api/seeds/bulk`) that accepts `{ ids: string[], action: 'archive' | 'restore' | 'delete' | 'set_type', payload? }` and runs atomically server-side.

### 8. Hidden canonical fields keep round-tripping

When a user hides a canonical field, AI extraction and import still write into it; the value persists in the database row. The field is simply not rendered in add / edit / detail until the user re-shows it. This preserves the "you can always change your mind" property and means hiding is cheap.

### 9. UI placement

- **Field schema editor**: lives under `/profile` (or a new `/profile/fields` sub-route) — schema lives with the user, not with any one seed. Reachable from a small "Customise fields" affordance in the add/edit form.
- **Annotations**: live on the seed detail page, attached inline next to the field they target. The add seed flow does **not** expose annotations (you can't annotate something you haven't saved yet); they appear after first save on the detail view.
- **Used-up state**: a button next to archive on the detail view; a filter chip on the list to show used-up rows.

### 10. Figma traceability

Per `figma.mdc` and the existing `simple-seed-organizer-design-system` spec, any new UI components (`FieldSchemaEditor`, `SeedAnnotationEditor`, archive/used-up controls) MUST carry `@figma S8YJQugvMmn5jaRqwFM5XO:<node>` JSDoc when their Figma counterparts exist. New Figma frames for the schema editor and annotation editor are added in the same change set; nodes are recorded in `figma-source.md` during implementation, not pre-allocated here.

## Risks / Trade-offs

- **[Risk] Schema-vs-storage drift**: a user hides a canonical field while AI fills it; the user doesn't realise the value is still there.  
  **Mitigation**: detail view shows a small "N hidden fields with values" affordance with a one-click reveal; field schema editor lists hidden fields with a value-present indicator.

- **[Risk] Custom field id collisions on rename**: if we keyed custom values by `label` instead of a stable id, renaming would silently drop values.  
  **Mitigation**: every custom field gets a UUID at creation; `label` is mutable metadata. The renderer always resolves by id.

- **[Risk] JSONB `custom_values` becomes a dumping ground**: schema drift over time makes old data hard to read.  
  **Mitigation**: `user_field_schema` is the canonical source for what keys mean; a tiny migration helper (`lib/fieldSchema.ts → normalise()`) drops orphan keys and types values on read.

- **[Risk] Annotation count grows unbounded**: a user could write dozens of annotations per seed, slowing the detail view.  
  **Mitigation**: page annotations on the seed detail (most recent first, "show all" link); index `seed_annotations(seed_id, created_at)`.

- **[Risk] Override semantics confuse users** ("did this change the packet?").  
  **Mitigation**: explicit "edited from packet" badge on overridden fields, with a peek/restore affordance. Detail view never silently shows a value that doesn't exist in the database.

- **[Risk] Bulk delete is destructive**: select-many + delete is easy to mis-tap on mobile.  
  **Mitigation**: bulk delete shows a count-and-confirm dialog with the option to archive instead; default bulk action is archive, not delete.

- **[Trade-off] No tier metering on custom fields / annotations now**: keeps the change small but means a free-tier user could create 100 custom fields. We accept this for now (`Non-Goals`); a follow-up change can wire `lib/limits.ts`.

## Migration Plan

1. **Code-only ship first** (one PR per logical layer, on the same change branch):
   - Migration `006_seed_packet_management.sql`: add `status`, `custom_values JSONB`, `used_up_at` to `seeds`; create `user_field_schema (user_id PK, version, hidden_canonical_ids TEXT[], custom_fields JSONB, updated_at)`; create `seed_annotations` with FK + RLS.
   - `lib/fieldSchema.ts`, `lib/annotations.ts`, type extensions in `types/seed.ts`.
   - API routes: `POST /api/seeds/[id]/duplicate`, `POST /api/seeds/bulk`, `PATCH /api/seeds/[id]/status`, full CRUD under `/api/field-schema` and `/api/seeds/[id]/annotations`.
   - UI: list select-mode + bulk bar, archive/used-up controls, field schema editor route, annotation editor on detail.
2. **Backfill**: existing rows get `status = 'active'`, `custom_values = '{}'::jsonb`. No data loss; `notes` untouched.
3. **Rollback**: revert PR; the new tables and columns are additive — dropping them does not affect existing flows. If a deploy needs to be rolled back after users have created custom fields, those rows remain in the dropped tables until manually purged (acceptable for a prototype).

## Open Questions

- **Annotation reordering**: do users want to drag-reorder annotations on a seed, or is created-at order sufficient? Default to created-at desc; revisit if user feedback says otherwise.
- **Field groups in the registry**: is `identity / sourcing / growing / planting / photos / other` the right grouping for the add/edit form, or do we want a flatter list? Lock the groups during implementation by walking the existing `AddSeedForm.tsx` sections.
- **Should "used up" auto-trigger when `quantity` reaches 0?** Defer: requires structured parsing of `quantity` (currently a free-text string like "1/4 oz"). Keep `used_up` as an explicit user action for v1.
- **Export format**: do custom field values and annotations get included in any future CSV/JSON export? Out of scope here, but the storage shape supports it cleanly.
