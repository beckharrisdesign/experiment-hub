## ADDED Requirements

### Requirement: Seed packet status lifecycle (active, archived, used-up)

Every seed packet SHALL carry a status of `active`, `archived`, or `used_up`. Default views (list, search, filters) MUST show only `active` rows unless the user explicitly opts into another status. Hard delete MUST remain available but MUST NOT be the default destructive action in the UI.

#### Scenario: Default list hides non-active seeds

- **WHEN** a user opens the seed list with no status filter applied
- **THEN** the system SHALL render only seeds with `status = 'active'`
- **AND** SHALL display a chip or filter showing how many archived and used-up seeds exist, with one-click access to those subsets

#### Scenario: Archive preserves the row

- **WHEN** the user archives a seed from the detail view or via bulk action
- **THEN** the seed row SHALL persist in the database with `status = 'archived'` and an updated `updated_at`
- **AND** SHALL be restorable to `active` with a single user action without data loss

#### Scenario: Used-up is distinct from archive

- **WHEN** the user marks a seed as used up
- **THEN** the seed row SHALL persist with `status = 'used_up'` and a `used_up_at` timestamp
- **AND** SHALL remain visible in a dedicated "Used up" filter for re-order / history reference, separately from archived seeds

#### Scenario: Hard delete requires explicit confirmation

- **WHEN** the user invokes hard delete on a seed
- **THEN** the system SHALL show a confirmation dialog clarifying that hard delete is irreversible and offer archive as an alternative

### Requirement: Duplicate seed packet

The system SHALL provide a duplicate action on any single seed that creates a new `active` seed row copying all packet data (canonical fields, custom field values) from the source, with the user able to opt in or out of copying photos and annotations.

#### Scenario: Duplicate without photos

- **WHEN** the user invokes duplicate and opts out of copying photos
- **THEN** the system SHALL create a new seed row with the same canonical and custom field values
- **AND** the new row's `photoFront`, `photoBack`, and corresponding storage paths SHALL be unset
- **AND** the new row SHALL have a fresh `id`, `created_at`, and `updated_at`

#### Scenario: Duplicate carries or drops annotations per user choice

- **WHEN** the user invokes duplicate
- **THEN** the system SHALL ask whether to copy existing annotations
- **AND** SHALL only create new annotation rows on the duplicate when the user opts in

### Requirement: Bulk operations on the seed list

The system SHALL support multi-select on the seed list and apply `archive`, `restore`, `delete`, and `set_type` actions to the selected set atomically.

#### Scenario: Bulk archive succeeds atomically

- **WHEN** the user selects N seeds and invokes bulk archive
- **THEN** the system SHALL update all N rows to `status = 'archived'` in a single server operation
- **AND** SHALL report partial failures (per-row) if any row cannot be updated, leaving successful rows in their new state

#### Scenario: Bulk delete defaults are protective

- **WHEN** the user selects N seeds and invokes bulk delete
- **THEN** the system SHALL show a confirmation dialog displaying the count and offer bulk archive as the primary alternative
- **AND** SHALL only execute hard delete after explicit confirmation

### Requirement: Canonical field registry

The system SHALL maintain a canonical, code-versioned registry of every seed field the platform understands, including at minimum `id`, `label`, `dataType` (one of `string` / `number` / `date` / `enum` / `long-text` / `months` / `photo` / `boolean`), `group`, `defaultVisible`, and `required` flags. The registry SHALL be the single source of truth used by add forms, edit forms, detail views, AI enrichment, and import paths.

#### Scenario: Add and edit forms render from the registry

- **WHEN** a user opens the add or edit seed form
- **THEN** every field rendered SHALL correspond to a registry entry resolvable by `id`
- **AND** any field rendered MUST NOT use a label hardcoded outside the registry

#### Scenario: Hidden fields still round-trip through AI and import

- **WHEN** AI enrichment or packet import produces a value for a field the user has hidden
- **THEN** the system SHALL still persist the value to the seed row
- **AND** SHALL NOT render that field in the user's detail or edit views until they re-show it

### Requirement: Per-user canonical field visibility

The system SHALL let each user hide and re-show any canonical field that is not flagged `required`, persisting the choice per user account. Visibility changes MUST NOT alter stored seed values.

#### Scenario: Hide a canonical field

- **WHEN** the user hides a canonical field from the field schema editor
- **THEN** that field SHALL stop appearing in add, edit, and detail views for that user
- **AND** the underlying seed data for every seed SHALL remain intact

#### Scenario: Re-show a hidden field reveals existing values

- **WHEN** the user re-shows a previously hidden field
- **THEN** every seed that has a non-null value for that field SHALL render it immediately, without re-import or re-extraction

#### Scenario: Required fields cannot be hidden

- **WHEN** the user attempts to hide a field flagged `required` in the registry (e.g. `name`)
- **THEN** the system SHALL refuse the change and explain why in the UI

### Requirement: User-defined custom fields

The system SHALL allow each user to define custom fields scoped to their account, where each custom field has a stable UUID `id`, a mutable `label`, a fixed `dataType` (`string` / `number` / `date` / `select` / `long-text`), an optional ordered `options` list (when `dataType = 'select'`), and a `group` placement. Custom field values SHALL persist on seed rows keyed by the stable id, surviving any later label changes.

#### Scenario: Create a custom field

- **WHEN** the user creates a custom field with a label, type, and (for select) options
- **THEN** the system SHALL persist the field to the user's schema with a freshly generated UUID id
- **AND** that custom field SHALL appear in the add and edit forms and on detail views

#### Scenario: Rename a custom field preserves values

- **WHEN** the user renames an existing custom field
- **THEN** every seed that has a value for that field SHALL continue to display the value under the new label
- **AND** the underlying id MUST remain unchanged

#### Scenario: Delete a custom field

- **WHEN** the user deletes a custom field
- **THEN** the system SHALL ask whether to keep or drop existing values
- **AND** SHALL remove the field from forms and detail views
- **AND** if the user chose to drop values, SHALL purge that field's entries from every seed's custom values

### Requirement: Custom field values participate in CRUD

Custom field values SHALL be readable, writable, updatable, and deletable through the same seed CRUD surface used for canonical fields, with no additional API for value-only changes.

#### Scenario: Custom field value persists on save

- **WHEN** the user enters a value into a custom field on the add or edit form and saves
- **THEN** the system SHALL persist that value on the seed row keyed by the field's stable id
- **AND** SHALL load it on subsequent detail views without additional fetches

#### Scenario: Orphan custom values are dropped on read

- **WHEN** the system reads a seed whose custom values include a key not present in the user's current field schema
- **THEN** the system SHALL omit the orphan key from rendered data
- **AND** SHALL leave the underlying storage untouched unless the user explicitly deletes the corresponding field with drop-values selected

### Requirement: Per-seed annotations layered on packet data

The system SHALL support free-text annotations attached to a seed, where each annotation has a `body`, an optional `target_field_id` (canonical or custom), and an `override` flag indicating whether the annotation replaces the packet value in the detail view (`true`) or augments it (`false`). Annotations MUST NOT modify the underlying seed field values.

#### Scenario: Add an additive annotation to a field

- **WHEN** the user adds an annotation with `override = false` targeting the `spacing` field
- **THEN** the detail view SHALL render the packet `spacing` value followed by the annotation body inline
- **AND** the seed's stored `spacing` value SHALL be unchanged

#### Scenario: Add an override annotation to a field

- **WHEN** the user adds an annotation with `override = true` targeting the `spacing` field
- **THEN** the detail view SHALL render the annotation body in place of the packet `spacing` value with a visible "edited from packet" badge
- **AND** SHALL provide an affordance to view the original packet value
- **AND** the seed's stored `spacing` value SHALL be unchanged

#### Scenario: Whole-seed annotation has no target

- **WHEN** the user adds an annotation with `target_field_id = NULL`
- **THEN** the system SHALL render the annotation in a dedicated annotations area on the detail view, distinct from any field
- **AND** the legacy `notes` field SHALL remain available for unscoped free text

#### Scenario: AI re-enrichment does not stomp annotations

- **WHEN** AI enrichment updates a canonical field that has an existing `override` annotation
- **THEN** the system SHALL update the underlying field value
- **AND** SHALL preserve the annotation, so the override continues to display until the user clears it

### Requirement: Annotation CRUD lifecycle

The system SHALL support create, read, update, and delete on annotations, scoped to the owning user via row-level security, with foreign-key cascade on seed delete.

#### Scenario: Edit an annotation

- **WHEN** the user edits an existing annotation's body, target, or override flag
- **THEN** the system SHALL persist the change with a refreshed `updated_at`
- **AND** SHALL re-render the detail view to reflect the new state

#### Scenario: Delete an annotation

- **WHEN** the user deletes an annotation
- **THEN** the system SHALL remove the annotation row
- **AND** the previously-overridden field (if any) SHALL revert to showing the underlying packet value

#### Scenario: Hard-deleting a seed cascades annotations

- **WHEN** a seed row is hard-deleted
- **THEN** all annotations referencing that seed SHALL be removed in the same operation

#### Scenario: Archiving a seed retains annotations

- **WHEN** a seed is archived or marked used-up
- **THEN** annotations SHALL persist unchanged, and re-appear when the seed is restored or viewed in its non-active filter

### Requirement: Field schema and annotations respect per-user row-level security

All data introduced by this capability — `user_field_schema` rows, `seed_annotations` rows, and `seeds.custom_values` entries — SHALL be enforced under row-level security tied to the owning `user_id`. Cross-user reads or writes MUST be rejected at the database layer.

#### Scenario: Another user cannot read my field schema

- **WHEN** an authenticated user other than the owner attempts to read or modify a `user_field_schema` row
- **THEN** the database SHALL reject the operation under RLS

#### Scenario: Another user cannot read my annotations

- **WHEN** an authenticated user other than the owner attempts to read, update, or delete a `seed_annotations` row
- **THEN** the database SHALL reject the operation under RLS
