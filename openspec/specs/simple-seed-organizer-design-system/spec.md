# simple-seed-organizer-design-system

## Purpose

Bind the Simple Seed Organizer Next.js prototype (`experiments/simple-seed-organizer/prototype/app/`) to the **Simple Seed Organizer** Figma file (`fileKey` `S8YJQugvMmn5jaRqwFM5XO`) as the visual source of truth, separately from the hub design file.

## Requirements

### Requirement: Documented Figma source for Simple Seed Organizer

The repository SHALL record the Simple Seed Organizer Figma file as the design source of truth for the SSO prototype, including the `fileKey`, canonical URL, and a short workflow for engineers and agents.

#### Scenario: Discoverable from experiment docs

- **WHEN** a maintainer opens the Simple Seed Organizer experiment documentation
- **THEN** they SHALL find a dedicated document (or clearly marked section) listing the Figma URL, file key `S8YJQugvMmn5jaRqwFM5XO`, and instructions to use Figma MCP (`get_design_context`) before visual changes

### Requirement: Component-level design traceability in the prototype

UI components in `experiments/simple-seed-organizer/prototype/app/components/` that map to Figma SHALL expose traceability via `@figma FILE_KEY:NODE_ID` JSDoc above the props interface (or immediately above the component when there are no props), using file key `S8YJQugvMmn5jaRqwFM5XO` and the correct node ID from the Simple Seed Organizer file (not the hub file key).

#### Scenario: Conventions respected

- **WHEN** a new or existing prototype component is designated as design-linked
- **THEN** the file SHALL include a comment of the form `@figma S8YJQugvMmn5jaRqwFM5XO:<node_id>` consistent with `.cursor/rules/component-conventions.mdc` for prototypes

#### Scenario: Incremental rollout allowed

- **WHEN** not every component is annotated yet
- **THEN** the project SHALL prioritize shared chrome and high-traffic surfaces first (e.g. shell, list, card, add flow) and track remaining mappings in experiment docs (`docs/figma-source.md`)

### Requirement: Optional Code Connect alignment

Where Figma Code Connect is available for the account, the project MAY add Code Connect templates mapping Figma components to prototype React components to strengthen parity checks.

#### Scenario: Code Connect is skipped

- **WHEN** Code Connect is unavailable or deferred
- **THEN** documentation and `@figma` JSDoc remain the authoritative formal link; no requirement to block shipping the linkage work
