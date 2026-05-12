## ADDED Requirements

### Requirement: Seed records store per-field user annotations

The `seeds` table SHALL include a `field_annotations jsonb` column (default `'{}'`) storing a map of `{ [camelCaseFieldKey: string]: string }`. Each value is a short user-authored annotation attached to the named packet field (e.g., `{ "spacing": "I use 6 inches in raised beds" }`).

#### Scenario: New seed has no annotations

- **WHEN** a seed is created
- **THEN** `field_annotations` SHALL default to an empty object and no annotation indicators SHALL appear

#### Scenario: Annotation is saved to a field

- **WHEN** the user types an annotation for a field and saves the edit form
- **THEN** that field's key and annotation string SHALL appear in `field_annotations` in Supabase

#### Scenario: Annotation is cleared

- **WHEN** the user clears the annotation textarea for a field and saves
- **THEN** that field's key SHALL be removed from `field_annotations` (not stored as an empty string)

### Requirement: Edit form exposes an annotation affordance on each canonical field row

In the edit form, each canonical field row SHALL include a small affordance (e.g., an icon button labeled "Add note" or "+") that toggles an annotation textarea inline below the packet value. The textarea SHALL be pre-populated with any existing annotation for that field. The affordance SHALL be visually unobtrusive and only draw attention when the field already has an annotation.

#### Scenario: Field has no annotation — affordance is collapsed

- **WHEN** a canonical field has no existing annotation
- **THEN** the annotation textarea SHALL be hidden and only the add-annotation affordance SHALL be visible (small, secondary)

#### Scenario: Field has an existing annotation — textarea is expanded

- **WHEN** a canonical field already has a saved annotation
- **THEN** the annotation textarea SHALL be rendered expanded with the saved text on form load

#### Scenario: User adds an annotation and saves

- **WHEN** the user opens the annotation textarea for a field, types text, and submits the edit form
- **THEN** the annotation SHALL be stored in `field_annotations` under that field's camelCase key

### Requirement: Detail view renders annotations inline below packet values

In the read-only detail view (`SeedDetail`), any field that has an annotation SHALL display the annotation text directly below the packet value, visually distinguished (e.g., italic, muted color, or an icon prefix). Fields with no annotation SHALL render without change.

#### Scenario: Field with annotation renders annotation inline

- **WHEN** the detail view renders a canonical field that has an annotation
- **THEN** the annotation text SHALL appear below the field value, styled differently from the packet value (e.g., lighter weight, italic, or prefixed with a pencil icon)

#### Scenario: Field without annotation renders normally

- **WHEN** the detail view renders a canonical field with no annotation
- **THEN** the field SHALL render exactly as before with no annotation element

### Requirement: Type system includes fieldAnnotations

- **WHEN** the `Seed` TypeScript interface is used in the codebase
- **THEN** it SHALL include `fieldAnnotations?: Record<string, string>` as an optional property

#### Scenario: fieldAnnotations round-trips through storage

- **WHEN** a seed with `fieldAnnotations` is saved and then fetched via `getSeedById`
- **THEN** the returned seed's `fieldAnnotations` SHALL match what was saved
