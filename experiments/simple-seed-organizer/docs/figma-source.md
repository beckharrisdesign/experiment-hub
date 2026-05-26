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

| React component  | Figma node | Parity         | Notes                                                                                                                                                                                                          |
| ---------------- | ---------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AppShell`       | `21:4993`  | not-yet-linked | Page wrapper — Body Slot. Companion frame `21:1422` is the Content Slot variant.                                                                                                                               |
| `Header`         | `13:128`   | not-yet-linked | Header block symbol (canonical **DS anchor** for MCP / inventory).                                                                                                                                             |
| `BottomNav`      | `21:2114`  | drifted        | Figma shows Type\|FAB\|Import (3 items); code renders Type\|FAB\|Photos\|Import (4 items, Month+Age hidden). Photos tab is missing from Figma symbol.                                                          |
| `LandingPage`    | `18:2709`  | not-yet-linked | Landing Page Content symbol (see [landing inventory](./landing-figma-inventory.md) for section nodes).                                                                                                         |
| `LandingFooter`  | `88:1285`  | not-yet-linked | **Corrected from `80:1268`** (that node is not in the file — confirmed via Figma MCP 2026-05-26).                                                                                                              |
| `SeedList`       | `17:799`   | not-yet-linked | Seed List symbol.                                                                                                                                                                                              |
| `SeedCard`       | `17:1164`  | not-yet-linked | Seed Card Wide variant. Sibling variant `18:1300` is "Seed Card No Tag".                                                                                                                                       |
| `AddSeedForm`    | `21:3028`  | not-yet-linked | Packet Editing View (full form context).                                                                                                                                                                       |
| `ViabilityBadge` | `100:1412` | partial        | **First-proof component.** Frame has three variants: `Status=Good 100:1406`, `Status=Watch 100:1408`, `Status=Use first 100:1410`. Code returns `null` for Good (Figma renders it — Figma variant is unused). Figma uses hardcoded `px-[10px] py-[4px] rounded-[4px]` + raw hex colors — exact target for the parity refactor. |
| `SeedPill`       | `17:1298`  | partial        | Figma calls this frame **"Button"** (name divergence — see decision in [design.md](../../../openspec/changes/sso-design-code-loop/design.md)). Shared variants: `default 13:211`, `filter-plain 17:1227`, `filter-selected 17:1265`, `badge 13:791`, `filter-badge-icon 17:1242`. Figma also has Primary/Secondary variants with no code analogue.                  |
| `SearchBar`      | `17:706`   | not-yet-linked | Single frame, no variants.                                                                                                                                                                                     |
| `FilterBar`      | _composition_ | not-yet-linked | Composition — a row of `SeedPill`s, not a single Figma symbol. Canonical anchor: `17:727` "Search Filters". Audit parity at the row level (gap, padding) only; per-pill parity rolls up from `SeedPill`.    |
| `SeedDetail`     | `13:3`     | not-yet-linked | Desktop frame `13:3` / mobile `98:1398`. Not yet wired into `/dev/components` (needs seed mock + lib stubs).                                                                                                   |

### Components present in Figma but not (yet) tracked

The Blocks (`13:610`), Elements (`13:184`), and Sections (`13:820`) frames also contain these symbols. Add a row above as a code counterpart is created or audited.

| Figma symbol         | Node       | Notes                                                                                                              |
| -------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------ |
| Footer               | `18:2219`  | No code component yet.                                                                                             |
| Subheader            | `13:153`   | No code component yet.                                                                                             |
| Sections (2/3/4 Col) | `21:1763`  | Layout primitives — variants `13:1003 / 21:1762 / 21:1764`.                                                        |
| Packet Title Lockup  | `13:585`   | Part of SeedDetail composition.                                                                                    |
| Packet Images        | `13:525`   | Part of SeedDetail composition; uses Packet Image atom (`13:867`).                                                 |
| Sidebar              | `13:223`   | Part of SeedDetail composition.                                                                                    |
| Planting Stats       | `13:429`   | Part of SeedDetail composition.                                                                                    |
| Notes section        | `13:564`   | Part of SeedDetail composition.                                                                                    |
| Search Filters       | `17:727`   | See `FilterBar` row above — same anchor.                                                                           |
| Seed List Content    | `17:405`   | Section-level frame above the SeedList symbol.                                                                     |
| Left Content         | `13:312`   | Section-level frame.                                                                                               |
| Key Value Pair       | `13:1601`  | Atom — small label/value row used inside Sidebar / Planting Stats.                                                 |
| Card (Number / Date) | `13:1637`  | Atom — variants `13:1311 / 13:1346`.                                                                               |
| Packet Image atom    | `13:867`   | Atom — variants `13:821 Default` / `13:868 Empty`.                                                                 |
| Image Field Row      | `21:4441`  | Form atom — variants `21:4429 Default` / `21:4461 Textarea`.                                                       |

Update this table if frames move in Figma; keep JSDoc in sync. Update the **Parity** column whenever you finish a parity pass on a component, or when you spot drift you're not fixing immediately.

## Dev surfaces

Local-only routes that help close the design↔code loop. Not user-facing; `NODE_ENV=development` only.

| Route               | What it shows                                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `/dev/components`   | Priority components rendered in isolation with inline mock props. Boots with `npm run dev`; no sign-in required.    |

## Figma scaffold → real tokens (one-time replacement)

The Figma file's existing **Foundations/Color** (`3:5`) and **Foundations/Typography** (`3:34`) frames are **template scaffolds** (the frame description says "Replace token values and component anatomy once capture is available"). They use generic Tailwind sample values (Primary-500 = `#4F46E5` indigo) that do not match the real prototype palette. Before creating Figma Variables, swap the scaffold values for the prototype's actual tokens, listed below.

### Color palette (from `experiments/simple-seed-organizer/prototype/app/app/globals.css`)

| Figma Variable name | Hex value  | Tailwind equivalent | Used for                       | Source                |
| ------------------- | ---------- | ------------------- | ------------------------------ | --------------------- |
| `color/green/primary` | `#16a34a` | `green-600`         | Primary brand action color     | `--green-primary`     |
| `color/green/dark`    | `#166534` | `green-800`         | Header secondary               | `--green-dark`        |
| `color/green/button`  | `#00a63e` | (custom)            | Button fill                    | `--green-button`      |
| `color/brand/primary` | `#15472d` | (custom dark green) | Header / hero bar              | `--brand-primary`     |
| `color/green/header`  | `#166534` | `green-800`         | Header fallback                | `--green-header`      |
| `color/bg/light`      | `#f3f4f6` | `gray-100`          | App background                 | `--bg-light`          |
| `color/bg/white`      | `#ffffff` | `white`             | Surface background             | `--bg-white`          |
| `color/text/heading`  | `#101828` | (~gray-900 #111827) | Headings                       | `--text-heading`      |
| `color/text/label`    | `#4a5565` | (~gray-600)         | Form labels                    | `--text-label`        |
| `color/text/muted`    | `#6a7282` | (~gray-500)         | Muted/secondary text           | `--text-muted`        |
| `color/text/subtle`   | `#99a1af` | (~gray-400)         | Subtle/tertiary text           | `--text-subtle`       |
| `color/age/new`       | `#f0fdf4` | `green-50`          | Newest age indicator           | `--age-new`           |
| `color/age/1yr`       | `#dcfce7` | `green-100`         | 1-year age indicator           | `--age-1yr`           |
| `color/age/2yr`       | `#bbf7d0` | `green-200`         | 2-year age indicator           | `--age-2yr`           |
| `color/age/3yr`       | `#86efac` | `green-300`         | 3-year age indicator           | `--age-3yr`           |

### Badge tone colors (inferred from `ViabilityBadge` Figma `100:1412`)

These aren't in `globals.css` yet — they live as hardcoded values in the Figma badge frame and (likely) in `SeedPill`'s badge variant. Lift to Variables and back-reference from code if not already.

| Figma Variable name      | Hex value | Tailwind equivalent | Used for                       |
| ------------------------ | --------- | ------------------- | ------------------------------ |
| `color/tone/attention/bg`     | `#fef2f2` | `red-50`       | Badge background (`use-first`) |
| `color/tone/attention/border` | `#ffc9c9` | (~red-200)     | Badge border (`use-first`)     |
| `color/tone/attention/text`   | `#e7000b` | (~red-600)     | Badge text (`use-first`)       |
| `color/tone/warning/bg`       | `#fefce8` | `yellow-50`    | Badge background (`watch`)     |
| `color/tone/warning/border`   | `#fde047` | `yellow-300`   | Badge border (`watch`)         |
| `color/tone/warning/text`     | `#a16207` | `yellow-700`   | Badge text (`watch`)           |
| `color/tone/success/bg`       | `#f0fdf4` | `green-50`     | Badge background (good — unused in code, present in Figma) |
| `color/tone/success/border`   | `#bbf7d0` | `green-200`    | Badge border (good — unused)                                |
| `color/tone/success/text`     | `#15803d` | `green-700`    | Badge text (good — unused)                                  |

### Typography (rename existing Figma styles → Tailwind names)

The existing Figma Typography frame (`3:34`) uses **semantic names** (Display-L / Display-M / Heading / Body-L/M/S / Label). The parity convention is to **rename these to Tailwind names** so the same token name reads identically on both sides. Mapping (values where Tailwind matches Figma exactly):

| Figma current name | New Figma Variable name | Size / line height       | Tailwind class |
| ------------------ | ----------------------- | ------------------------ | -------------- |
| Body-S             | `text/xs`               | 12px / 16px              | `text-xs`      |
| Body-M             | `text/sm`               | 14px / 20px              | `text-sm`      |
| Body-L             | `text/base`             | 16px / 24px              | `text-base`    |
| Heading            | `text/2xl`              | 24px / 32px              | `text-2xl`     |
| Label              | `text/xs-medium`        | 12px / 16px (semi-bold)  | `text-xs font-medium` (composite — keep separate or split family/size/weight Variables) |
| Display-M          | `text/3xl` or `text/4xl`| 32px / auto              | None clean — pick `text/3xl` (30px in Tailwind) and adjust size, or add custom Variable. |
| Display-L          | `text/4xl` or `text/5xl`| 40px / auto              | None clean — same as above. |

For each Variable: split into four sub-Variables (`text/<size>/family`, `text/<size>/size`, `text/<size>/line-height`, `text/<size>/weight`) per [design.md](../../../openspec/changes/sso-design-code-loop/design.md) → Decisions → "Typography: Figma Variables, not Text Styles". Optional parallel Text Styles can compose these sub-Variables for one-click application.

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
