# Simple Seed Organizer — Figma source of truth

This experiment’s UI is specified in a **dedicated Figma file**, not the BHD Labs hub file.

| Item                                                          | Value                                                                                                                        |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Canonical URL**                                             | [Simple Seed Organizer (Figma)](https://www.figma.com/design/S8YJQugvMmn5jaRqwFM5XO/Simple-Seed-Organizer?node-id=1-2)       |
| **fileKey**                                                   | `S8YJQugvMmn5jaRqwFM5XO`                                                                                                     |
| **Hub design file (do not use for SSO prototype components)** | `9VJTxmBWKgeCDTyJLsYM7I` — applies to `components/` in the repo root, not `experiments/simple-seed-organizer/prototype/app/` |

## Workflow

1. **Cursor:** install the Figma integration with `/add-plugin figma` (see [docs/FIGMA_SETUP.md](../../../docs/FIGMA_SETUP.md)).
2. **Before changing layout/visuals** on a linked component, call **`get_design_context`** (Figma MCP) with this `fileKey` and the node ID from the `@figma` JSDoc on that component.
3. **Tokens:** map Figma variables to the prototype’s Tailwind/theme; treat MCP snippets as **reference** and normalize to local tokens (same posture as hub rules).
4. **Typography:** **Inter** is loaded via **`next/font/google`** in `app/layout.tsx` (no Google Fonts `@import` in `globals.css`).

**CSS bridge:** `globals.css` defines `--brand-primary` (currently **`#15472d`**, aligned with Figma `brand/primary` on Header node **13:128**). Update that variable when the Figma token changes.

**Landing parity inventory:** [landing-figma-inventory.md](./landing-figma-inventory.md) — Figma vs code rows for the marketing landing (`18:2709`), Code Connect deferrals, and follow-ups.

## Component → Figma nodes (Blocks / symbols)

Prioritized prototype files include `/** @figma S8YJQugvMmn5jaRqwFM5XO:<node> */` above their props interface. Initial mappings:

| React component | Figma node | Notes                                                                                                 |
| --------------- | ---------- | ----------------------------------------------------------------------------------------------------- |
| `AppShell`      | `21:4993`  | Page wrapper — Body Slot                                                                              |
| `Header`        | `13:128`   | Header block symbol                                                                                   |
| `BottomNav`     | `21:2114`  | Bottom Navigation symbol                                                                              |
| `LandingPage`   | `18:2709`  | Landing Page Content symbol (see [landing inventory](./landing-figma-inventory.md) for section nodes) |
| `SeedList`      | `17:799`   | Seed List symbol                                                                                      |
| `SeedCard`      | `17:1164`  | Seed Card Wide variant                                                                                |
| `AddSeedForm`   | `21:3028`  | Packet Editing View (full form context)                                                               |

Update this table if frames move in Figma; keep JSDoc in sync.

## Code Connect

**Deferred** — Org/Code Connect templates can be added later with the `/figma-code-connect` skill where the Figma plan supports it.
