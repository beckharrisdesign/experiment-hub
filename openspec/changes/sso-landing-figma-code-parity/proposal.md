## Why

The first SSO–Figma linkage established the correct file key, `@figma` tags on major surfaces, and `docs/figma-source.md`. The **landing** experience is still a dense mix of inline UI, nested symbols, and optional Code Connect; without a structured pass, divergences and missed componentization stay invisible. A second pass inventories the landing page first, flags Figma vs code component candidates, and drives small, explicit creations in Figma and/or the prototype so the source of truth stays actionable.

## What Changes

- Add a **documented inventory** (starting with landing) that maps sections/elements to Figma nodes/components, React components (or inline regions), and parity status (aligned, split candidate, Figma component candidate, gap).
- **Figma**: Promote or adjust components where the inventory shows raw frames or duplicated structure that should be system components; align naming where helpful for Code Connect later.
- **Code**: Extract or adjust React components where the design is already componentized in Figma or where reuse/parity demands a stable boundary; keep `@figma` traceability and tokens consistent.
- **Code Connect**: Record where mappings exist, are added, or are explicitly deferred per component pair.
- No **BREAKING** API or auth contract changes; prototype-scoped UX/refactor risk only.

## Capabilities

### New Capabilities

_(none — requirements extend the existing SSO design-system capability.)_

### Modified Capabilities

- `simple-seed-organizer-design-system`: Add normative requirements for a landing-focused Figma–code **inventory**, **recorded gaps and next actions** (Figma component, code component, Code Connect, or deferral), and **Code Connect coverage notes** for landing-linked pairs.

## Impact

- **Figma**: `S8YJQugvMmn5jaRqwFM5XO` — landing-related frames/components (e.g. node `18:2709` and children); possible new main components or instance cleanup.
- **Code**: `experiments/simple-seed-organizer/prototype/app/components/LandingPage.tsx` (and possible new sibling components under `components/`).
- **Docs**: `experiments/simple-seed-organizer/docs/figma-source.md` (or a short linked `landing-inventory.md` if the table grows large).
- **Tooling**: Figma MCP (`get_design_context`, and authoring via official Figma workflow when creating nodes); optional Code Connect artifacts (e.g. `.figma.ts`) if mappings are added.
- **Dependencies**: No new npm dependencies required for inventory documentation; Code Connect tooling only if mappings are implemented.
