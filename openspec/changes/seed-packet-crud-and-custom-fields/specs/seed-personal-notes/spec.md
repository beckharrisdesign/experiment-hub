## ADDED Requirements

### Requirement: Seed records have a dedicated personal notes field

The `seeds` table SHALL include a `my_notes text` column for user-authored observations, separate from the existing `notes` column (which retains AI-extracted or manually transcribed packet content). The `notes` column SHALL be relabeled "Packet notes" in the UI; `my_notes` SHALL be labeled "My notes" with supporting copy "(not on the packet)".

#### Scenario: New seed starts with empty my_notes

- **WHEN** a seed is created
- **THEN** `my_notes` SHALL be NULL and the "My notes" section SHALL display a placeholder or empty state

#### Scenario: my_notes does not receive AI-extracted content

- **WHEN** the user runs Auto Entry (AI extraction) on a packet image
- **THEN** extracted content (description, planting instructions) SHALL populate `notes`, NOT `my_notes`

#### Scenario: my_notes persists user text through edit form

- **WHEN** the user types into the "My notes" textarea and saves the edit form
- **THEN** the text SHALL be stored in `my_notes` and displayed in the detail view under "My notes"

### Requirement: Edit form presents My notes in a distinct section

In the edit form (`AddSeedForm`), "My notes" SHALL appear as a separate labeled section below the canonical packet fields. It SHALL use an auto-growing textarea with placeholder text that makes its purpose clear (e.g., "Your observations, variations you tried, what worked…"). It SHALL NOT appear in the add flow (new seed creation) — only in the edit flow.

#### Scenario: My notes section visible in edit mode

- **WHEN** the user opens the edit form for an existing seed
- **THEN** a "My notes" section SHALL be present with an auto-growing textarea

#### Scenario: My notes section absent in add mode

- **WHEN** the user opens the form to add a new seed
- **THEN** no "My notes" section SHALL be rendered

### Requirement: Detail view renders My notes in a distinct section

In the read-only detail view (`SeedDetail`), if `my_notes` is non-empty it SHALL appear in a visually distinct "My notes" section, clearly separated from the packet fields section. If `my_notes` is empty, the section SHALL be hidden entirely.

#### Scenario: My notes present — section is visible

- **WHEN** the detail view renders a seed with non-empty `my_notes`
- **THEN** a "My notes" section SHALL be visible with the user's text

#### Scenario: My notes absent — section is hidden

- **WHEN** the detail view renders a seed with NULL or empty `my_notes`
- **THEN** no "My notes" section SHALL appear

### Requirement: Type system includes myNotes

- **WHEN** the `Seed` TypeScript interface is used in the codebase
- **THEN** it SHALL include `myNotes?: string` as an optional property

#### Scenario: myNotes round-trips through storage

- **WHEN** a seed with `myNotes` is saved and then fetched via `getSeedById`
- **THEN** the returned seed's `myNotes` SHALL match what was saved
