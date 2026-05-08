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

### Requirement: Design system anchor documented for reciprocal work

The repository SHALL treat the Figma node **`13:128`** in file `S8YJQugvMmn5jaRqwFM5XO` as the documented **entry for Simple Seed Organizer design-system components** when reconciling Figma DS with prototype components, in addition to per-screen `@figma` anchors already listed in experiment docs.

#### Scenario: Discoverable from experiment documentation

- **WHEN** a maintainer looks for where SSO UI components are systematized in Figma for parity with code
- **THEN** they SHALL find in `docs/figma-source.md` (or linked inventory) the canonical URL or node reference for **`13:128`** alongside the existing file key and landing symbol references

### Requirement: Reciprocal alignment for pass-2 gaps

The project SHALL address the pass-2 inventory outcomes for **(a)** production UI present only in code (notably **landing footer chrome**), **(b)** Figma design-system components that lack a matching prototype file where extraction adds clarity, and **(c)** **copy** agreed for the Stash tier AI feature line—by updating **Figma**, the **prototype**, or **both**, and refreshing the **landing inventory** status for affected rows.

#### Scenario: Footer gap closed or explicitly scoped

- **WHEN** the pass-2 inventory marked footer as absent from the landing symbol
- **THEN** after this change either Figma SHALL contain a representative footer consistent with production placement and copy, or documentation SHALL state a deliberate scope exception and where the footer lives in the file

#### Scenario: Stash copy is single source

- **WHEN** this change completes
- **THEN** the Stash tier AI packets string SHALL match the chosen product string in both Figma (pricing free tier) and code (`LandingPricingSection`), and the inventory SHALL note that row as aligned or document deferral

### Requirement: Main components and naming hygiene where deferred in pass 2

Where pass 2 deferred **promotion to main components** for landing primitives (feature column, problem column, pricing card shells) or noted **duplicate section names** in Figma, this pass SHALL either complete that promotion/rename for the agreed subset or record **updated** deferrals with rationale and target nodes in the inventory.

#### Scenario: Inventory reflects DS pass

- **WHEN** implementation ends
- **THEN** `landing-figma-inventory.md` SHALL be updated with pass 3 verification date and revised parity / next-action notes for landing and DS-related rows touched in this pass
