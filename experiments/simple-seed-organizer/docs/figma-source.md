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

**Parity status** (column below):

- `full` — layer tree + tokens mirrored end-to-end
- `partial` — some tokens or some structure mirrored; gaps documented in row notes
- `drifted` — was mirrored, has since diverged (needs reconciliation)
- `not-yet-linked` — pairing exists in name only

| React component | Figma node | Parity         | Notes                                                                                                                                                                              |
| --------------- | ---------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AppShell`      | `21:4993`  | not-yet-linked | Page wrapper — Body Slot                                                                                                                                                           |
| `Header`        | `13:128`   | not-yet-linked | Header block symbol (canonical **DS anchor** for MCP / inventory)                                                                                                                  |
| `BottomNav`     | `21:2114`  | drifted        | Figma shows Type\|FAB\|Import (3 items); code renders Type\|FAB\|Photos\|Import (4 items, Month+Age hidden). Photos tab is missing from Figma symbol.                              |
| `LandingPage`   | `18:2709`  | not-yet-linked | Landing Page Content symbol (see [landing inventory](./landing-figma-inventory.md) for section nodes)                                                                              |
| `LandingFooter` | `80:1268`  | not-yet-linked | Landing footer chrome — **`Sections`** frame (`13:820`), production parity                                                                                                         |
| `SeedList`      | `17:799`   | not-yet-linked | Seed List symbol                                                                                                                                                                   |
| `SeedCard`      | `17:1164`  | not-yet-linked | Seed Card Wide variant                                                                                                                                                             |
| `AddSeedForm`   | `21:3028`  | not-yet-linked | Packet Editing View (full form context)                                                                                                                                            |
| `ViabilityBadge`| _TBD_      | not-yet-linked | First-proof component for the figma-code-parity loop; Figma frame to be created. Rendered in `/dev/components` (see [Dev surfaces](#dev-surfaces)).                                |
| `SeedPill`      | _TBD_      | not-yet-linked | Fallback first-proof component. Rendered in `/dev/components`.                                                                                                                     |
| `SearchBar`     | _TBD_      | not-yet-linked | Rendered in `/dev/components` for visual checks.                                                                                                                                   |
| `FilterBar`     | _TBD_      | not-yet-linked | Rendered in `/dev/components` for visual checks.                                                                                                                                   |
| `SeedDetail`    | `13:3`     | not-yet-linked | Desktop frame `13:3` / mobile `98:1398`. Not yet wired into `/dev/components` (needs seed mock + lib stubs).                                                                       |

Update this table if frames move in Figma; keep JSDoc in sync. Update the **Parity** column whenever you finish a parity pass on a component, or when you spot drift you're not fixing immediately.

## Dev surfaces

Local-only routes that help close the design↔code loop. Not user-facing; `NODE_ENV=development` only.

| Route               | What it shows                                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `/dev/components`   | Priority components rendered in isolation with inline mock props. Boots with `npm run dev`; no sign-in required.    |

## Token sync (manual)

Spacing/sizing and typography in the Figma file are kept in lockstep with the prototype's Tailwind v4 setup via **Figma Variables**. No automation yet — manual until evidence shows churn is high enough to justify a script.

**When to re-sync:**

- Tailwind config changes (custom scale value added/removed/renamed).
- A new spacing/text utility class shows up in prototype code that doesn't yet have a matching Figma Variable.
- A Variable in Figma is renamed or its resolved value changes.

**Canonical Tailwind class list (run from repo root):**

```bash
grep -rEho "(gap|p|px|py|pl|pr|pt|pb|m|mx|my|ml|mr|mt|mb|w|h|text)-[a-z0-9.]+" \
  experiments/simple-seed-organizer/prototype/app/components/ \
  | sort -u
```

That output is the source of truth for which `space/*` and `text/*` Variables the SSO Figma file needs. Anything missing → add the Variable. Anything Figma has that no code uses → safe to delete.

**How to add a new Variable in Figma:** open the **Tokens** page → relevant collection (`space/*` or `text/*`) → "Create variable" → name it to match the Tailwind class suffix (e.g. `space/4` for `gap-4`/`p-4` — units are `n × 4px` per Tailwind default). For `text/<size>`, create four sub-variables: `family`, `size`, `line-height`, `weight`. Reference the new Variable from any frame that needs it; do not type raw pixel values.

## Surface inventory

All surfaces in the SSO ecosystem — Figma frames and code routes. The **Surfaces** page (`0:1`) is the canonical Figma home for these; the **Components** page (`1:2`) supplies the symbols they use. Add rows here as new surfaces are designed or built; fill in missing node IDs as Figma frames are created.

| Surface | Route | Desktop node | Mobile node | Status |
| ------- | ----- | ------------ | ----------- | ------ |
| Landing / Marketing | `/` (unauthenticated) | `18:2588` | — | Desktop designed; no mobile frame |
| Home / Seed List | `/` (authenticated) | `17:277` | `98:1270` ✓ | Desktop designed; mobile = code-faithful |
| Seed Detail | `/seeds/[id]` | `13:3` | `98:1398` ✓ | Desktop designed; mobile = code-faithful |
| Edit Seed Packet | `/seeds/[id]/edit` | `21:1572` | — | Desktop designed; no mobile frame |
| Add Seed | `/add` | — | — | In code only (`AddSeedForm.tsx`, node `21:3028` is form content only) |
| Import Zone | `/import` | `21:1614` | — | Desktop placeholder; no mobile frame |
| Pricing | `/pricing` | `21:1528` | — | Desktop placeholder; no mobile frame |
| Profile | `/profile` | `21:1700` | — | Desktop placeholder; no mobile frame |
| Forgot Password | `/forgot-password` | `21:1529` | — | Desktop placeholder; no mobile frame |
| Reset Password | `/reset-password` | — | — | In code only |
| Login | `/login` | — | — | In code only |
| Privacy Policy | `/privacy` | — | — | In code only |
| Terms of Service | `/terms` | — | — | In code only |
| Error | (error boundary) | `21:1657` | — | Desktop placeholder; no mobile frame |

**Key:**
- ✓ = code-faithful reproduction built at 390px, suitable for Code Connect wiring
- "Desktop designed" = full component-based Figma frame on the Surfaces page
- "Desktop placeholder" = frame exists with Page Wrappers shell but content is a rectangle placeholder, not yet designed
- "In code only" = route exists in the prototype but no Figma frame yet

**Mobile frames** (`98:1270`, `98:1398`) live on the **Surfaces** page alongside the desktop frames. Both were built to exactly match the React prototype code.

**Seed Detail mobile layout notes** (node `98:1398`):
- Subheader: 73px white bar — chevron \| "Seed details" (18px Semi Bold #101828) \| "Edit" (16px #16a34a). No standalone bottom Edit button.
- Title lockup: left col 141px (`flex-1 min-w-0`, gap-4, right col 201px fixed). Name wraps at 34px Bold; badges amber (warning) or orange (attention).
- Image slots: 192.5×256px portrait, `overflow-x-auto` clipped container, `#d4d4d4` empty state with white "+".
- PlantingCards: `#faf5ff` / `#e9d4ff` border / `#8200db` label / `#59168b` value.
- GrowthStatCards: `#eff6ff` / `#bedbff` border / `#1447e6` label / `#1c398e` value.
- AI button: `border-[#bbf7d0]` / `text-[#16a34a]`. Delete: `text-red-500` (#ef4444).

## Code Connect

**Deferred** — Org/Code Connect templates can be added later with the `/figma-code-connect` skill where the Figma plan supports it.
