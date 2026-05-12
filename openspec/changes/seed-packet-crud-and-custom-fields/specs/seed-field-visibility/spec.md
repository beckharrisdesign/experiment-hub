## ADDED Requirements

### Requirement: Seed records track which canonical fields are hidden

The `seeds` table SHALL include a `hidden_fields text[]` column (default `'{}'`) listing the camelCase keys of canonical fields the user has explicitly hidden for that seed. Rendering code SHALL skip hidden fields in both the detail view and edit form. Unknown keys in the array SHALL be silently ignored.

#### Scenario: New seed has no hidden fields

- **WHEN** a seed is created
- **THEN** `hidden_fields` SHALL default to an empty array and all canonical fields SHALL be visible

#### Scenario: Field is removed from a seed

- **WHEN** the user activates the "remove field" affordance on a canonical field in the edit form or detail view
- **THEN** that field's camelCase key SHALL be added to `hidden_fields` and the field SHALL no longer appear in the detail view or edit form for that seed

#### Scenario: Hidden field is restored

- **WHEN** the user activates the "Add field" affordance and selects a previously hidden field
- **THEN** that field's key SHALL be removed from `hidden_fields` and the field SHALL reappear in the detail view and edit form

#### Scenario: Unknown key in hidden_fields is ignored

- **WHEN** `hidden_fields` contains a key that does not match any current canonical field
- **THEN** the UI SHALL render normally without error, and the stale key SHALL remain in the array without modification

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
