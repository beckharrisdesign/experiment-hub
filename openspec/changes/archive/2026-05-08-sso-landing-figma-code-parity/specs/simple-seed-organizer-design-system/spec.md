## ADDED Requirements

### Requirement: Landing surface Figma–code component inventory

The project SHALL maintain a structured inventory that maps the **landing** experience between the Simple Seed Organizer Figma file and the prototype, identifying UI regions (hero, pricing, auth panels, footers, etc.), their representation in Figma (frame, instance, or main component name and node id where stable), and their representation in code (component file/name or explicitly marked inline block).

#### Scenario: Inventory is discoverable and scoped to landing first

- **WHEN** a maintainer opens Simple Seed Organizer experiment documentation for the second-pass parity work
- **THEN** they SHALL find a landing-focused inventory document or section that lists mapped regions with Figma reference and code reference columns, with landing listed before any future surfaces expand the same table

#### Scenario: Status per row

- **WHEN** each inventory row is written
- **THEN** it SHALL include a status or next-action category (for example: aligned, promote Figma component, extract code component, Code Connect gap, or deferred with rationale) sufficient to prioritize follow-up work

### Requirement: Parity gaps must not remain implicit

When the inventory identifies a repeated or system-worthy pattern that appears as **raw unscoped geometry** in Figma while implemented as **structured UI** in code, or the inverse (symbol in Figma vs monolithic JSX), the change SHALL either implement the corrective Figma component or code component with `@figma` linkage, or record an explicit deferral with short rationale in the same documentation set.

#### Scenario: No silent mismatch

- **WHEN** the inventory marks a row as requiring alignment
- **THEN** the documented next action SHALL be concrete (create/main Figma component, extract React module, add Code Connect, or defer) before the change slice is treated as complete for that row

### Requirement: Code Connect state recorded for landing-linked pairs

For each landing-related prototype component or documented sub-region that corresponds to a Figma main component or primary frame, the documentation SHALL state whether a Code Connect mapping exists, is out of scope for the org/plan, or is deferred.

#### Scenario: Maintainers see Connect coverage at a glance

- **WHEN** a maintainer reviews the landing inventory after this pass
- **THEN** they SHALL be able to tell for each listed pair whether Code Connect is present, not applicable, or deferred without opening Figma settings
