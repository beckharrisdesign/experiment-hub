## ADDED Requirements

### Requirement: Visual distinction between packet-sourced and user-authored content

In `AddSeedForm` and `SeedDetail`, content that originates from the packet (AI-extracted or manually transcribed) SHALL be visually distinct from content the user writes themselves (personal notes, field annotations). The distinction MUST be achievable without breaking the existing light-theme design of the SSO prototype.

#### Scenario: Packet content is styled as read-only packet data

- **WHEN** a field value is shown in the detail view
- **THEN** it SHALL use the existing field-value typography (no special indicator needed — packet origin is implied)

#### Scenario: User annotation is distinguished from packet value

- **WHEN** a field annotation is rendered in the detail view
- **THEN** it SHALL use a visually lighter style (e.g., muted text color `#6a7282`, italic, or a pencil/note icon prefix) that reads as a personal comment, not a packet datum

#### Scenario: My notes section is labeled clearly

- **WHEN** the "My notes" section is rendered
- **THEN** it SHALL carry a heading that distinguishes it from the packet fields section (e.g., "My notes" vs "Packet notes" or an icon that connotes personal authorship)

### Requirement: Field hide/restore controls are unobtrusive in add and edit flows

Controls for hiding fields (remove-field icon) and restoring them ("Add field" affordance) SHALL not compete visually with packet data entry. They SHALL be secondary or ghost-styled and only visible on hover/focus in desktop layouts; always accessible in mobile layouts.

#### Scenario: Remove-field affordance is present but secondary

- **WHEN** the edit form renders a canonical field row
- **THEN** a remove-field affordance SHALL be accessible but not prominent — e.g., a small × or hide icon at the end of the row, visible on hover on desktop

#### Scenario: Add field affordance is discoverable

- **WHEN** the edit form has at least one hidden field
- **THEN** an "Add field" chip or link SHALL appear below the last visible field, listing hidden field labels

### Requirement: Annotation affordance is per-row and inline in add and edit flows

The annotation affordance in `AddSeedForm` (create and edit) SHALL be co-located with its field row (not in a separate panel), and its expand/collapse behavior SHALL not cause layout shift in adjacent rows.

#### Scenario: Annotation textarea expands inline

- **WHEN** the user activates the annotation affordance for a field
- **THEN** a textarea SHALL appear directly below that field's input, within the same row container, without repositioning other rows abruptly

#### Scenario: Annotation textarea collapses inline

- **WHEN** the user clears the annotation and blurs the textarea (and it is empty)
- **THEN** the textarea SHALL hide and the row SHALL return to its compact state
