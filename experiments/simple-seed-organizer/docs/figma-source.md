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
| `ViabilityBadge` | `100:1412` | full           | **First proof complete (2026-05-27).** All three variants (`Status=Good 100:1406`, `Status=Watch 100:1408`, `Status=Use first 100:1410`) have padding (`space/2,5` L/R, `space/1` T/B), corner radius (`space/1`), fills, strokes, and text fontSize bound to Variables. Snapped `Use first` border `#ffc9c9 → red/200` and text `#e7000b → red/600` (~5% perceptual drift, within tolerance). Code returns `null` for Good — Figma's Good variant is unused; intentional asymmetry. Font family/weight/line-height remain raw values that match `font/family/sans` + `font/weight/medium` + `font/leading/4` by value but aren't bound yet (binding fontName via Plugin API needs a follow-up). |
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

## Figma token system (live state, 2026-05-27)

A real Variables system already exists in this file (predates this change — likely from a prior Tailwind importer). **8 collections, 701 Variables, 13 Text Styles.** Discovery audit + the renames/fixes documented below were applied via the Figma MCP, not by hand.

### Collections in use for parity

| Collection      | Purpose                                                                    | Status                                                                                                                  |
| --------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `space`         | Spacing scale (`space/0`, `space/0,5`, `space/1`, … `space/96`)            | **Renamed from `gap` 2026-05-27.** 34 Variables, leaf names `gap-N → space/N`. Variable IDs preserved — references intact. |
| `font`          | Type tokens: `family/*`, `text/xs…text/9xl`, `weight/*`, `leading/*`, `tracking/*` | **`size/*` Variables renamed to `text/*` 2026-05-27.** 13 size Variables renamed. Other namespaces left alone.            |
| `color`         | Full Tailwind palette (`slate/50…950`, `gray/*`, `red/*`, `green/*`, etc.) | Use as-is. ⚠️ Collection has corrupted duplicates (`50 2` … `950 22`) — known follow-up cleanup outside this change.    |
| `brand`         | One Variable: `primary = #15472d` (SSO dark green header, not in Tailwind) | **Created 2026-05-27.** Scopes: FRAME_FILL, SHAPE_FILL, STROKE_COLOR, TEXT_FILL.                                        |
| `tokens`        | Raw numeric primitives `0,4`, `0,5`, `1`, … that `space` and `font` alias to | Leave alone.                                                                                                            |
| `breakpoints`   | `max-w-screen-*`                                                           | Not relevant to component parity.                                                                                       |
| `opacity`, `stroke`, `* Main` | Misc                                                              | Out of scope.                                                                                                           |

### Text Styles fixed 2026-05-27

- All `Body/Body *` styles switched from **Crimson Text → Inter** (5 styles: XS, S, M, L, XL).
- `Body/Body Base` size **36 → 16**.
- `Display/Dsiplay 2XL` typo → `Display/Display 2XL`.

### Decimal convention

Half-step Tailwind values use **comma**, not dot (Figma file locale): `space/0,5`, `space/1,5`, `space/2,5`, `space/3,5`. Match this convention when referencing.

### Legacy scaffolds (deprecated, do not use)

The **Foundations/Color** (`3:5`) and **Foundations/Typography** (`3:34`) frames in the Components page are template leftovers with generic indigo/secondary placeholder values and semantic typography names (Display-L, Body-S, etc). Disconnected from the real token system above. Safe to delete in a follow-up.

### Brand colors not yet lifted to Variables (consolidation candidates)

These live in `experiments/simple-seed-organizer/prototype/app/app/globals.css` and are close to but not identical to standard Tailwind shades. Plan: consolidate code to use the closest Tailwind shade where the perceptual difference is acceptable; only `--brand-primary` keeps a custom Variable.

| Code variable    | Hex value | Closest Tailwind / Variable | Action          |
| ---------------- | --------- | --------------------------- | --------------- |
| `--brand-primary`  | `#15472d` | `brand/primary` (created)   | ✓ done          |
| `--green-primary`  | `#16a34a` | `color/green/600`           | Use existing    |
| `--green-dark`     | `#166534` | `color/green/800`           | Use existing    |
| `--green-button`   | `#00a63e` | ~`color/green/600`          | Consolidate     |
| `--green-header`   | `#166534` | `color/green/800`           | Use existing    |
| `--text-heading`   | `#101828` | ~`color/gray/900` (`#111827`) | Consolidate (code change) |
| `--text-label`     | `#4a5565` | ~`color/gray/600`           | Consolidate (code change) |
| `--text-muted`     | `#6a7282` | ~`color/gray/500`           | Consolidate (code change) |
| `--text-subtle`    | `#99a1af` | ~`color/gray/400`           | Consolidate (code change) |
| `--bg-light`       | `#f3f4f6` | `color/gray/100`            | Use existing    |
| `--age-new`        | `#f0fdf4` | `color/green/50`            | Use existing    |
| `--age-1yr`        | `#dcfce7` | `color/green/100`           | Use existing    |
| `--age-2yr`        | `#bbf7d0` | `color/green/200`           | Use existing    |
| `--age-3yr`        | `#86efac` | `color/green/300`           | Use existing    |

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
