# Design: Etsy Listing Kit

## User flow

A single linear funnel — this is the primary KPI surface (ad → paid conversion):

```
Ad click
  → 1. Landing + Upload   (message-match to ad; drop/paste one design file)
  → 2. Preview + Paywall  (watermarked 6-image grid + $3 pay CTA)   ← checkout starts here
  → Stripe Checkout (hosted, payment mode)
  → 3. Processing         (webhook-verified; "close the tab, we'll email you")
  → 4. Result + Download   (un-watermarked zip + delivered strip + next steps)

Recovery branches:
  · Payment cancelled  → return to Preview, upload intact, no charge
  · Processing failed  → auto-retry → auto-refund + email if it can't complete
```

Each transition maps to an analytics event (see below) — the funnel *is* the deliverable.

## Visual design / Figma

**File:** [etsy-listing-kit — OpenSpec design](https://www.figma.com/design/5oeip2GtLOFpGWpmhyd0fK) · fileKey `5oeip2GtLOFpGWpmhyd0fK`
**Palette (decided 2026-07-24):** **MVDS neutral base + a product terracotta primary** — NOT the hub's green brand override. Light theme (MVDS default mode). All pairs WCAG-checked (see Contrast below):

| Token | Value | Role |
| --- | --- | --- |
| `--background` | `#ffffff` | page bg |
| `--surface` / `--border` | `#f7f7f7` / `#e5e5e5` | headers, panels, thumbs |
| `--foreground` (ink) | `#252525` | headings + body (15.3:1) |
| `--muted-foreground` | `#555555`–`#737373` | secondary text (≥4.7:1) |
| **`--primary` (brand)** | **`#b24a2e` terracotta** | CTAs, accents (white text 5.37:1) |
| `--primary-hover` | `#8f3a24` | hover/press |
| **`--accent` (2nd)** | **`#d99a2b` ochre** | eyebrow tags, highlights — **decorative + dark text only** (ink 6.28:1; NOT for white text) |
| `--accent-tint` | `#f5e3be` | tag/pill backgrounds (ink text) |
| `--warm-surface` | `#fdf3ee` | cream section wash (warms stark white; all text passes) |

Two-accent system (terracotta + ochre + cream) added 2026-07-24 — a single terracotta on white read sterile. Ochre carries eyebrow tags ("FOR EMBROIDERY & CRAFT SELLERS", "⚡ INSTANT DOWNLOAD") and the cream warms dropzone/purchase panels. Spacing pass same date: hero→dropzone gap opened up, dropzone given side margins.

Type: **Fraunces** headings + **Inter** body (reviewable — MVDS default is Inter-only; Fraunces is the product's display choice, see REVIEW_QUEUE #14).
**File naming convention** (per `rules/figma.mdc`): numbered pages, each iteration a NEW page, never edited in place. Mobile frames live alongside desktop on the same iteration page, named by breakpoint.

**Iteration pages:**
- `01 Current state` — net-new note.
- `02.1 Proposed — MVDS single accent` — MVDS neutral base + terracotta only (node IDs `11:*`).
- `02.2 Proposed — terracotta + ochre + spacing` — adds ochre 2nd accent, cream warmth, spacing + text-wrapping fixes (node IDs in table below).
- `02.3 Proposed — warmer copy` — **current**; maker-to-maker voice, de-AI'd copy (clones of 02.2, node IDs `16:*`). This is the review target.

> **Process note:** early iterations (v0 hub-green, first MVDS recolor) were edited in place before the numbered-page convention was applied — they survive only as screenshots in the 2026-07-24 session, not as pages. Convention followed from `02.1` onward.

Node IDs in the table below are the **02.2 (current)** frames.

| Page | Frame | Node ID | Breakpoint | Notes |
| --- | --- | --- | --- | --- |
| 01 Current state | Current state · net-new | `1:3` | — | Net-new; documents prior-art `etsy-listing-manager` |
| 02.2 Proposed | Landing+Upload | `2:2` / `8:2` | Desktop 1024 / **Mobile 480** | Ad landing + drop/paste upload |
| 02.2 Proposed | Preview+Paywall | `3:2` / `8:19` | Desktop 1024 / **Mobile 480** | 6 watermarked previews + $3 panel — **primary conversion screen** (mobile: 2-col grid, panel stacks) |
| 02.2 Proposed | Processing | `4:2` / `8:54` | Desktop 1024 / **Mobile 480** | Post-payment; close-tab reassurance |
| 02.2 Proposed | Result+Download | `4:11` / `8:61` | Desktop 1024 / **Mobile 480** | Un-watermarked zip + delivered strip |
| 02.2 Proposed | State · Payment cancelled | `4:34` | (card, both) | Recovery: upload intact, no charge |
| 02.2 Proposed | State · Processing failed | `4:40` | (card, both) | Recovery: auto-retry → auto-refund + email |

**Code Connect:** not set up (no published hub Figma component library to map against); implementation maps to MVDS components in code.

## Contrast (WCAG 2.1 AA) — audited 2026-07-24

Rules baked into the palette after an audit caught failures:
- **Never light-green (or any light color) as text on white** — `#14ae5c` on white = 2.90 (FAIL). On light surfaces, text is ink `#252525` (15.3) or muted `#737373` (4.74).
- **Terracotta primary** `#b24a2e`: white text 5.37, and usable as a link on white 5.37 — both AA.
- Secondary/label text uses `#555555`+ (≥7:1 on white/surface), not the earlier muted green (2.92, FAIL — fixed).
- Primary button label is **white** on terracotta (5.37), not a tinted color.
Re-run before launch with the MVDS `check:contrast` tooling.

## Component mapping (MVDS → screens)

| Need | MVDS / hub | Product-local? |
| --- | --- | --- |
| Buttons (primary CTA) | MVDS Button (accent) | No |
| Layout / spacing | MVDS Grid/Stack tokens, tailwind tokens | No |
| Upload dropzone | MVDS surface + local dropzone behavior (reuse `/patterns` paste/drag idea) | Partly — behavior local |
| Watermarked preview grid | MVDS Card + local 3×2 image grid | Yes — product-specific |
| Purchase panel | MVDS Card + Button | No |
| Processing / empty / error states | MVDS status patterns | No |

Product-specific components (preview grid, dropzone) are candidates for `docs/PACKAGE_CONTRIBUTION_CANDIDATES.md`, not shared-package edits.

## Breakpoints

BHD Content Types: **S = 480px**, **L = 1024px**. Single-column funnel; the Preview+Paywall two-column (grid + panel) collapses to stacked panel-under-grid at S.

## Analytics instrumentation (first-class — the primary KPI)

Per-step events fire the funnel: `landing_view → upload_started → preview_viewed → checkout_started → payment_completed → processing_started → result_delivered`, plus `payment_cancelled`, `processing_failed`, `payment_refunded`. UTM/click-ID captured at `landing_view` and persisted through Checkout metadata so CAC = spend ÷ `payment_completed`. Full event contract in `docs/ANALYTICS_PLAN.md` (tasks phase).
