## ADDED Requirements

### Requirement: Seed records track which canonical fields are hidden

The `seeds` table SHALL include a `hidden_fields text[]` column (default `'{}'`) listing the camelCase keys of canonical fields the user has explicitly hidden for that seed. Rendering code SHALL skip hidden fields in both the detail view and edit form. Unknown keys in the array SHALL be silently ignored.

#### Scenario: New seed has no hidden fields

- **WHEN** a seed is created
- **THEN** `hidden_fields` SHALL default to an empty array and all canonical fields SHALL be visible

#### Scenario: Field is hidden from a seed

- **WHEN** the user activates the hide-field affordance on a canonical field in the edit form
- **THEN** that field's camelCase key SHALL be added to `hidden_fields` and the field SHALL no longer appear in the detail view or edit form for that seed after save

#### Scenario: Hidden field is restored

- **WHEN** the user activates the "Add field" affordance and selects a previously hidden field
- **THEN** that field's key SHALL be removed from `hidden_fields` and the field SHALL reappear in the detail view and edit form

#### Scenario: Unknown key in hidden_fields is ignored

- **WHEN** `hidden_fields` contains a key that does not match any current canonical field
- **THEN** the UI SHALL render normally without error, and the stale key SHALL remain in the array without modification

### Requirement: AI and import flows MUST NOT mutate `hidden_fields` based on extraction gaps

Auto Entry, packet AI extraction, and bulk import paths SHALL NOT add keys to `hidden_fields` solely because a canonical field was empty, null, or missing from the transcription or source row. Only explicit user hide/restore actions in the seed UI SHALL change `hidden_fields`.

#### Scenario: Auto Entry leaves hidden_fields unchanged by omission

- **WHEN** the user runs Auto Entry and the model returns no value for one or more canonical fields
- **THEN** the system MUST NOT append those fields' keys to `hidden_fields` for that reason alone

#### Scenario: Import does not auto-hide missing columns

- **WHEN** a seed is created or updated via an import path where some canonical columns are absent in the source
- **THEN** `hidden_fields` MUST default to empty for new rows or retain the existing stored array on update, without adding keys based only on missing source data

### Requirement: Add field affordance lists only hidden canonical fields

The edit form and detail view SHALL expose an "Add field" affordance that is only visible when at least one canonical field is hidden. The affordance SHALL present a list of currently hidden fields by their display label. Selecting one SHALL immediately restore it.

#### Scenario: No hidden fields — affordance is absent

- **WHEN** a seed has no hidden fields
- **THEN** the "Add field" affordance SHALL NOT be rendered

#### Scenario: At least one hidden field — affordance is visible

- **WHEN** a seed has one or more hidden fields
- **THEN** the "Add field" affordance SHALL be rendered and its list SHALL include the display labels of all hidden fields

### Requirement: Field hide/restore persists immediately on save

Changes to `hidden_fields` SHALL be committed to the database when the edit form is saved. Toggling visibility in the detail view (if inline editing is supported) SHALL call `updateSeed` immediately without requiring a full form submission.

#### Scenario: Edit form save persists hidden_fields

- **WHEN** the user saves the edit form after hiding one or more fields
- **THEN** the updated `hidden_fields` array SHALL be written to Supabase and reflected on the detail view

#### Scenario: Type system includes hidden_fields

- **WHEN** the `Seed` TypeScript interface is used in the codebase
- **THEN** it SHALL include `hiddenFields?: string[]` as an optional property
