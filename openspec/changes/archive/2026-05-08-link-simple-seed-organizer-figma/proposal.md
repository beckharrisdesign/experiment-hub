## Why

The Simple Seed Organizer prototype (`experiments/simple-seed-organizer/prototype/app`) ships real UI without a formal, in-repo contract to the **Simple Seed Organizer** Figma file ([design file](https://www.figma.com/design/S8YJQugvMmn5jaRqwFM5XO/Simple-Seed-Organizer?node-id=1-2)). That makes drift likely and slows design–engineering review. We need a durable link path: documented source of truth, component-level traceability, and optional Code Connect so agents and humans align on the same system.

## What Changes

- Record the Figma file as the canonical design-system / screen source for this experiment (not the hub file key `9VJTxmBWKgeCDTyJLsYM7I`).
- Add a short experiment-scoped design contract (spec + markdown) describing required linkage: `@figma FILE_KEY:NODE_ID` on prototype components per `.cursor/rules/component-conventions.mdc`, and where to look before visual edits (`get_design_context`).
- Optionally scaffold **Figma Code Connect** mapping for priority components (incremental rollout), where Org/plan allows.
- Add a maintainable `experiments/simple-seed-organizer/docs/` note (or extend existing doc) with the file URL, file key, and workflow for token parity with `prototype/app` Tailwind / theme.

## Capabilities

### New Capabilities

- `simple-seed-organizer-design-system`: Formal rules for binding the SSO prototype UI to the Simple Seed Organizer Figma file (`S8YJQugvMmn5jaRqwFM5XO`) including traceability and design-tool workflow.

### Modified Capabilities

- (none)

## Impact

- **Docs:** new or updated files under `experiments/simple-seed-organizer/docs/`.
- **Prototype:** `experiments/simple-seed-organizer/prototype/app/components/**/*.tsx` (incremental `@figma` comments); no hub `components/` changes required.
- **Specs:** new capability under `openspec/specs/simple-seed-organizer-design-system/spec.md` when this change is applied and merged (and archived per workflow).
- **Dependencies:** Figma MCP / plugin for verification; Code Connect only if the account supports it.
