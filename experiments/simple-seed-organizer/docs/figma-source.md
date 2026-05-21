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

## Design-system anchor (`13:128`)

For **simple-seed-organizer** reciprocal Figma ↔ prototype work, use **[node `13:128`](https://www.figma.com/design/S8YJQugvMmn5jaRqwFM5XO/Simple-Seed-Organizer?node-id=13-128)** as the documented **design-system entry** (Header block returned by MCP `get_design_context`; pair with **[landing parity inventory](./landing-figma-inventory.md)** for section-level nodes).

## Component → Figma nodes (Blocks / symbols)

Prioritized prototype files include `/** @figma S8YJQugvMmn5jaRqwFM5XO:<node> */` above their props interface. Initial mappings:

| React component | Figma node | Notes                                                                                                 |
| --------------- | ---------- | ----------------------------------------------------------------------------------------------------- |
| `AppShell`      | `21:4993`  | Page wrapper — Body Slot                                                                              |
| `Header`        | `13:128`   | Header block symbol (canonical **DS anchor** for MCP / inventory)                                     |
| `BottomNav`     | `21:2114`  | Bottom Navigation symbol — ⚠️ Figma shows Type\|FAB\|Import (3 items); code renders Type\|FAB\|Photos\|Import (4 items, Month+Age hidden). Photos tab is missing from Figma symbol. |
| `LandingPage`   | `18:2709`  | Landing Page Content symbol (see [landing inventory](./landing-figma-inventory.md) for section nodes) |
| `LandingFooter` | `80:1268`  | Landing footer chrome — **`Sections`** frame (`13:820`), production parity                            |
| `SeedList`      | `17:799`   | Seed List symbol                                                                                      |
| `SeedCard`      | `17:1164`  | Seed Card Wide variant                                                                                |
| `AddSeedForm`   | `21:3028`  | Packet Editing View (full form context)                                                               |

Update this table if frames move in Figma; keep JSDoc in sync.

## Mobile screen frames (code-faithful reproductions for Code Connect)

Built to exactly match the React prototype at 390px (iPhone SE / 14) so Code Connect can be wired up. Both frames live on the **Today** page.

| Screen | Figma node | React source |
| ------ | ---------- | ------------ |
| Home / Seed List | `98:1270` | `app/app/page.tsx` + `SeedList.tsx` |
| Seed Detail | `98:1398` | `SeedDetail.tsx` |

**Seed Detail layout notes** (node `98:1398`):
- Subheader: 73px white bar — chevron \| "Seed details" (18px Semi Bold #101828) \| "Edit" (16px #16a34a). No standalone bottom Edit button.
- Title lockup: left col 141px (`flex-1 min-w-0`, gap-4, right col 201px fixed). Name wraps at 34px Bold; badges amber (warning) or orange (attention).
- Image slots: 192.5×256px portrait, `overflow-x-auto` clipped container, `#d4d4d4` empty state with white "+".
- PlantingCards: `#faf5ff` / `#e9d4ff` border / `#8200db` label / `#59168b` value.
- GrowthStatCards: `#eff6ff` / `#bedbff` border / `#1447e6` label / `#1c398e` value.
- AI button: `border-[#bbf7d0]` / `text-[#16a34a]`. Delete: `text-red-500` (#ef4444).

## Code Connect

**Deferred** — Org/Code Connect templates can be added later with the `/figma-code-connect` skill where the Figma plan supports it.
