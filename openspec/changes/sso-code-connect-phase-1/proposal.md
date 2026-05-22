## Human anchor

> "I want these two systems to MATCH and be SYNCED so that I can set up codeconnect and manage the frontend display styling from Figma."

## Outcomes

- **Who:** Katy working across Figma and the SSO prototype
- **Job:** Make Figma Dev Mode show live React usage for any SSO component, so styling changes can be driven from Figma without cross-referencing docs
- **Done when:** `figma connect publish` has run successfully; all 5 core app components have `@figma` annotations; inspecting any annotated component in Figma Dev Mode shows the correct React import and usage example; wired Figma components have an `⚡` prefix in their name so any page on the Surfaces or Components page is scannable at a glance
- **Not doing:** Building Figma frames for unannotated surfaces (Profile, Import, BatchImport, LoginForm, etc.) — that's phase 2. Not changing any visual styling or component behavior.

## Why

`figma-source.md` is a static lookup table. Without Code Connect published, a designer inspecting a Figma component in Dev Mode sees nothing — they have to cross-reference the doc manually, which breaks down as soon as either side drifts. Publishing Code Connect makes the mapping live: the correct React component appears inline in Figma whenever a frame or symbol is inspected.

The groundwork is mostly done: 15 of 32 components have `@figma` annotations, two mobile frames were built to exactly match the prototype code, and the surface inventory is documented. The gap is (a) 5 missing annotations on the core app components we use most and (b) the publish step has never been run.

## What changes

1. **Add `@figma` annotations** to 5 unannotated core app components:
   - `SeedDetail.tsx` → `98:1398` (mobile frame, Surfaces page)
   - `SearchBar.tsx` → `17:706` ("Search Bar" symbol, Blocks)
   - `FilterBar.tsx` → `17:727` ("Search Filters" symbol, Blocks)
   - `SeedPill.tsx` → `13:791` primary (Type=Badge); also `17:1227` (Filter Plain), `17:1265` (Filter Selected) — individual variant symbols in Elements, no component set
   - `ViabilityBadge.tsx` → `100:1408` primary (Status=Watch); also `100:1410` (Status=Use First) — variant symbols in Blocks frame `100:1412`

2. **Create `figma.config.ts`** at `experiments/simple-seed-organizer/prototype/app/` — maps every `@figma`-annotated component to its Figma node for the Code Connect CLI.

3. **Run `figma connect publish`** — wires all annotated components to the SSO Figma file (`S8YJQugvMmn5jaRqwFM5XO`), making React usage visible in Dev Mode.

4. **Prefix wired Figma component names with `⚡`** — rename each component on the Components page whose Code Connect mapping is published (e.g. `SeedCard` → `⚡ SeedCard`). Makes it scannable on the Surfaces and Components pages: `⚡` = live code wired, no prefix = Figma-only.

5. **Update `figma-source.md`** — change Code Connect status from "Deferred" to active; document the config file location, publish command, and the `⚡` naming convention.

## Capabilities

### New capabilities

- `sso-code-connect`: Code Connect config published for the SSO Figma file — React component usage visible in Dev Mode for all annotated components

### Modified capabilities

- `sso-figma-inventory`: `@figma` annotations complete for the 5 core app components; `figma-source.md` reflects active Code Connect status and `⚡` naming convention

## Impact

No user-facing changes. Dev workflow only — Figma becomes the live source of truth for component-level styling in the SSO prototype.

## Optional links

- Surface inventory: `experiments/simple-seed-organizer/docs/figma-source.md`
- Figma file: `https://www.figma.com/design/S8YJQugvMmn5jaRqwFM5XO/Simple-Seed-Organizer`
- Experiment directory: `experiments/simple-seed-organizer/`
