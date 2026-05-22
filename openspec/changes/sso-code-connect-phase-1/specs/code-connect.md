## Outcomes

→ See [proposal.md](../proposal.md): Figma Dev Mode shows live React usage for all annotated SSO components; wired components are visually scannable on the Components page.

---

### Requirement: All targeted components have a valid `@figma` annotation

Every component in scope has a `/** @figma S8YJQugvMmn5jaRqwFM5XO:<nodeId> */` JSDoc comment pointing to an existing node in the SSO Figma file.

**Fails until:** `SeedDetail.tsx`, `SearchBar.tsx`, `FilterBar.tsx`, `SeedPill.tsx`, and `ViabilityBadge.tsx` each have a `@figma` annotation; node IDs resolve to real nodes in file `S8YJQugvMmn5jaRqwFM5XO`.

The component SHALL declare a `@figma` JSDoc annotation on the line immediately above its props interface.

#### Scenario: SeedDetail is annotated

WHEN a developer opens `SeedDetail.tsx`
THEN line 1–3 contains `/** @figma S8YJQugvMmn5jaRqwFM5XO:98:1398 */`

#### Scenario: Remaining 4 components are annotated

WHEN a developer opens each file
THEN:
- `SearchBar.tsx` has `@figma S8YJQugvMmn5jaRqwFM5XO:17:706`
- `FilterBar.tsx` has `@figma S8YJQugvMmn5jaRqwFM5XO:17:727`
- `SeedPill.tsx` has `@figma S8YJQugvMmn5jaRqwFM5XO:13:791` (primary/badge; filter variants `17:1227`, `17:1265` noted in comment)
- `ViabilityBadge.tsx` has `@figma S8YJQugvMmn5jaRqwFM5XO:100:1408` (watch variant; use-first `100:1410` noted in comment)

---

### Requirement: A Code Connect config file exists at the prototype root

A `figma.config.ts` (or `figma.config.json`) at `experiments/simple-seed-organizer/prototype/app/` maps every `@figma`-annotated component to its Figma node and exports the correct `accessToken`/`documentUrl` settings.

**Fails until:** `figma connect parse` exits 0 with no "component not found" warnings when run from the prototype directory.

The config SHALL include an entry for every component that carries a `@figma` annotation.

#### Scenario: Parse command succeeds

WHEN `figma connect parse` is run from `experiments/simple-seed-organizer/prototype/app/`
THEN the command exits 0 and lists all annotated components without error

---

### Requirement: Code Connect is published and visible in Figma Dev Mode

Running `figma connect publish` pushes all component mappings to the SSO Figma file. A designer inspecting a wired component in Dev Mode sees the React import and a usage snippet.

**Fails until:** At least one component (e.g. `SeedCard`) shows a "Code" tab with a React snippet when inspected in Figma Dev Mode.

Publishing SHALL succeed without authentication errors; the Figma file SHALL show updated Code Connect entries.

#### Scenario: Dev Mode shows React snippet

WHEN a designer opens Figma Dev Mode and selects a wired component instance on any surface
THEN the Code panel shows the correct React import path and a representative usage example

#### Scenario: Publish is repeatable

WHEN `figma connect publish` is run again after a code change
THEN the command exits 0 and updates the existing mappings without creating duplicates

---

### Requirement: Wired components carry an `⚡` prefix in Figma

Every component on the Figma Components page whose Code Connect mapping has been published is renamed with an `⚡` prefix (e.g. `SeedCard` → `⚡ SeedCard`). Unpublished components retain their original names.

**Fails until:** At least the components wired in this phase have `⚡` prefixes visible in the Figma component picker and layers panel.

The renaming SHALL be applied on the Components page (`1:2`) only — surface frames are not renamed.

#### Scenario: Wired component has ⚡ prefix

WHEN a designer opens the Components page (`1:2`) in the SSO Figma file
THEN every component with a published Code Connect mapping shows an `⚡` prefix in its name

#### Scenario: Unwired component has no prefix

WHEN a designer opens the Components page
THEN components without a published Code Connect mapping have no `⚡` prefix
