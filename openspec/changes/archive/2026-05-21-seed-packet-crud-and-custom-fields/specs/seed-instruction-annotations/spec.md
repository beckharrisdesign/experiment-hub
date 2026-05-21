## ADDED Requirements

### Requirement: Seed records store per-field user annotations in `instruction_annotations`

Per-field user notes SHALL be stored in the existing `instruction_annotations` JSONB column (default empty array), as an array of objects compatible with `SeedInstructionAnnotation` (each entry includes a `fieldKey` matching camelCase canonical keys and user-authored text). The system SHALL NOT introduce a separate `field_annotations` map column for the same purpose.

#### Scenario: New seed has no annotations

- **WHEN** a seed is created
- **THEN** `instruction_annotations` SHALL default to an empty array and no annotation indicators SHALL appear

#### Scenario: Annotation is saved on first create

- **WHEN** the user types an annotation for a field on the **new seed** form and submits to create the seed
- **THEN** an object with that `fieldKey` and text SHALL appear in `instruction_annotations` in Supabase on the new row (replacing or merging with any prior entry for that key per app merge rules)

#### Scenario: Annotation is saved when updating an existing seed

- **WHEN** the user types an annotation for a field on the **edit** form and saves
- **THEN** an object with that `fieldKey` and text SHALL appear in `instruction_annotations` in Supabase (replacing or merging with any prior entry for that key per app merge rules)

#### Scenario: Annotation is cleared

- **WHEN** the user clears the annotation for a field and saves
- **THEN** that field's entry SHALL be removed from the `instruction_annotations` array (not stored as an empty string)

### Requirement: Add and edit forms SHALL expose an annotation affordance on each annotatable canonical field row

In `AddSeedForm`, for **both creating a new seed and editing an existing seed**, each canonical field row that supports instruction annotations SHALL include a small affordance (e.g., an icon button labeled "Add note" or "+") that toggles an annotation textarea inline below the packet value. The textarea SHALL be pre-populated with any existing annotation for that field in edit mode, and empty in create mode until the user types. The affordance SHALL be visually unobtrusive and only draw attention when the field already has an annotation.

#### Scenario: Field has no annotation — affordance is collapsed

- **WHEN** a canonical field has no existing annotation
- **THEN** the annotation textarea SHALL be hidden and only the add-annotation affordance SHALL be visible (small, secondary)

#### Scenario: Field has an existing annotation — textarea is expanded (edit mode)

- **WHEN** the edit form loads a canonical field that already has a saved annotation
- **THEN** the annotation textarea SHALL be rendered expanded with the saved text on form load

#### Scenario: User adds an annotation and saves from create flow

- **WHEN** the user opens the annotation textarea for a field on the **new seed** form, types text, and submits to create the seed
- **THEN** the annotation SHALL be stored in `instruction_annotations` with that field's camelCase `fieldKey`

#### Scenario: User adds an annotation and saves from edit flow

- **WHEN** the user opens the annotation textarea for a field on the **edit** form, types text, and submits the form
- **THEN** the annotation SHALL be stored in `instruction_annotations` with that field's camelCase `fieldKey`

### Requirement: Detail view renders annotations inline below packet values

In the read-only detail view (`SeedDetail`), any field that has a matching entry in `instructionAnnotations` SHALL display the annotation text directly below the packet value, visually distinguished (e.g., italic, muted color, or "My note:" prefix). Fields with no annotation SHALL render without change.

#### Scenario: Field with annotation renders annotation inline

- **WHEN** the detail view renders a canonical field that has an annotation
- **THEN** the annotation text SHALL appear below the field value, styled differently from the packet value (e.g., lighter weight, italic, or prefixed with a pencil icon)

#### Scenario: Field without annotation renders normally

- **WHEN** the detail view renders a canonical field with no annotation
- **THEN** the field SHALL render exactly as before with no annotation element

### Requirement: Seed TypeScript interface SHALL use instructionAnnotations for per-field notes

The `Seed` TypeScript interface MUST expose per-field user notes only as optional `instructionAnnotations?: SeedInstructionAnnotation[]` and MUST NOT add a parallel `fieldAnnotations` map (or equivalent) on `Seed`.

#### Scenario: instructionAnnotations round-trips through storage

- **WHEN** a seed with `instructionAnnotations` is saved and then fetched via `getSeedById`
- **THEN** the returned seed's `instructionAnnotations` SHALL match what was saved
