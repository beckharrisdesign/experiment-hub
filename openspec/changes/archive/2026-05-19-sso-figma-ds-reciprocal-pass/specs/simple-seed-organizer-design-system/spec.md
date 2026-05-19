## ADDED Requirements

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
