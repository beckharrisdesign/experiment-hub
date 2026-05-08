## Why

The [pass 2 landing inventory](../../../experiments/simple-seed-organizer/docs/landing-figma-inventory.md) explicitly deferred Figma-side cleanup: production-only chrome (e.g. **page footer**), **main components** for repeated landing primitives, **copy alignment** (Stash tier AI line), and clearer **design-system** alignment. The SSO [design system in Figma](https://www.figma.com/design/S8YJQugvMmn5jaRqwFM5XO/Simple-Seed-Organizer?node-id=13-128) (`node` `13:128`) is the right anchor to reconcile **what ships in code** with **what exists as components in the file**—in both directions (add missing art, add missing code).

## What Changes

- **Figma (`fileKey` `S8YJQugvMmn5jaRqwFM5XO`):** Add or update frames/components so production landing/footer and deferred inventory items are represented; promote repeated landing patterns to **main components** where pass 2 called out raw groups; align **Stash tier** copy with the agreed product string in **both** Figma and code; rename ambiguous layer names (e.g. duplicate “Section Three Points”) when touching those frames.
- **Prototype (`experiments/simple-seed-organizer/prototype/app/`):** Introduce or wire **React** components that correspond to SSO design-system components already in Figma but not yet mirrored as discrete modules in code (per inventory + DS review at `13:128`), with `@figma` traceability and existing token/style patterns.
- **Documentation:** Update `landing-figma-inventory.md` (and `figma-source.md` if the DS anchor or workflow shifts) to record pass 3 outcomes, final node ids, and any remaining deferrals.

No **BREAKING** API contracts; marketing copy may change after product confirms the Stash AI line.

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `simple-seed-organizer-design-system`: Add requirements for **reciprocal** Figma–prototype alignment using the documented design-system anchor, **closing pass-2 gaps** where feasible (production chrome in Figma, DS components in code), and **post-pass documentation** of component/main-component state.

## Impact

- **Figma** file `S8YJQugvMmn5jaRqwFM5XO` — landing (`18:2709` subtree), marketing page level for footer, and [design system overview `13:128`](https://www.figma.com/design/S8YJQugvMmn5jaRqwFM5XO/Simple-Seed-Organizer?node-id=13-128).
- **Code:** SSO prototype `components/` (new or adjusted components, possible small edits to `LandingPage` sections).
- **Docs:** `experiments/simple-seed-organizer/docs/`.
- **Tooling:** Figma MCP / Desktop for reads and (with `figma-use` + `use_figma`) writes; optional Code Connect later, not required for this pass.
