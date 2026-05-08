## Context

Per [component-conventions.mdc](../../../.cursor/rules/component-conventions.mdc), prototype components use **their own** Figma file key — not the hub design file. Simple Seed Organizer’s source of truth is the dedicated file below.

## Figma source of truth

| Field                     | Value                                                                                                                      |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **File**                  | [Simple Seed Organizer (Figma)](https://www.figma.com/design/S8YJQugvMmn5jaRqwFM5XO/Simple-Seed-Organizer?node-id=1-2&p=f) |
| **fileKey**               | `S8YJQugvMmn5jaRqwFM5XO`                                                                                                   |
| **Entry node** (from URL) | `1:2` (use for file overview / default `get_design_context` when no component node yet)                                    |

### Visual design / Figma

| Item                                        | Value                                                                                                                                                                  |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Primary Figma file**                      | `https://www.figma.com/design/S8YJQugvMmn5jaRqwFM5XO/Simple-Seed-Organizer`                                                                                            |
| **Libraries in use**                        | _(list published libraries enabled in that file — update when you attach team/community kits)_                                                                         |
| **Screens / components in scope (initial)** | Shell navigation (`AppShell`, `BottomNav`, `Header`), marketing/entry (`LandingPage`), high-traffic flows (`SeedList`, `SeedCard`, `AddSeedForm`) — expand iteratively |
| **Code Connect**                            | Optional: add `.figma.tsx` (or project-supported template) next to mapped components for Org/Enterprise; use `/figma-code-connect` skill                               |

### Token and implementation mapping

- **Prototype path:** `experiments/simple-seed-organizer/prototype/app/`
- **Styles:** follow existing Tailwind / theme in that app; **normalize** Figma MCP output to local tokens (same rule as hub: no raw hex/spacing dumps as permanent source).
- **Verification:** Before changing markup or styles on a component that has a `@figma` tag, call **`get_design_context`** (or screenshot) for that node to compare parity.

## Approach

1. Add **`docs/figma-source.md`** (or equivalent) under the experiment with URL, file key, and workflow bullets (MCP, `@figma` format, hub vs SSO keys).
2. **Incremental `@figma` JSDoc** on prototype default-export components: `/** @figma S8YJQugvMmn5jaRqwFM5XO:<nodeId> */` above the props interface (per conventions).
3. **Code Connect** as a follow-on batch if valuable—not a gate for closing the “formal link” story.

## Risks

- Node IDs in Figma change when frames are duplicated; prefer stable component nodes for `@figma` targets.
- Code Connect requires compatible Figma plan/org settings—skip if blocked, keep JSDoc + docs as the contract.
