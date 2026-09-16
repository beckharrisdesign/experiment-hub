# Design: etsy-ecosystem-map

## Context

The proposal and specs are approved (PR #479). Two capabilities: `ecosystem-map` (the living map, FigJam board first with the doc in lockstep) and `shop-design-system` (two chapters codified from fragments, every principle carrying its receipt, checkable yes/no). This change ships no tooling — its "UI" is the map itself: the FigJam board and `docs/ETSY_ECOSYSTEM_MAP_2026-09.md`.

One thing changed between spec approval and this design: Katy surfaced the W+H Listing Generator's `Garden Components` page, which shows Figma's real footprint is bigger than the map drew it. The `Layouts` component set (12 variants — Basic, Badge, Content Center/Bottom Left/Top Left, Recos 4up/2up/Hoop, Transferring patterns, FAQ 1–3) maps ≈1:1 onto the 12 gallery roles; each variant exposes `Slot-Background` / `Slot-BaseArtwork` plus shared Watermark, Banner, and Logo components. The Plant Markers/Sayings libraries on the same page show the system spans full-shop product lines, and `staging/<SKU>/` frames assemble bundle galleries from these components. The galleries synced to Notion are instances of this library, not ad-hoc renders. Per the map spec's own rule (a surface reframed updates the map in the same change), this design carries that map update.

## Goals / Non-Goals

**Goals:**

- The map's v4 iteration shows Figma as two roles — artwork birth *and* the listing template system / design-system home — on both surfaces (board page v4, doc §1 + mermaid), keeping the lockstep requirement true from day one.
- Name the homes and skeletons for everything the specs require: the two design-system chapters, the monthly-review ritual, and the shop health ledger — so tasks can be a checklist, not a design exercise.
- The image-principles chapter codifies *from* the `Layouts` component set (its receipt), never re-deriving composition rules from prose memory.

**Non-Goals:**

- No hub UI, no code, no schema. Nothing here renders in the experiment hub app.
- No restructuring of the Figma component library itself — the map cites it; it doesn't reorganize it.
- No automation of pulls or the ledger; the distilled data model stays the contract, manual capture stays the implementation.

## User flow / IA

**Reading the map (any day):** FigJam board → Index page → topmost line (CURRENT) → v4. The doc says the same things in prose for grep and PR review. Archived pages banner-link back to the current version.

**Updating the map (surface-touching PR):** edit the doc section + mermaid in the PR; if structural, add a new board version page per the living-diagram conventions (new page below Index, CURRENT banner moves, old page gets the archive banner, Index gets the new top line).

**Monthly review:** verify/correct every live-state row → append one ledger observation per line (completeness, favorites-per-view, net revenue + MoM) → record the check. Pulls cited by their `docs/pulls/` notes, never raw files.

**Document homes (decided here, built in tasks):**

```
docs/
  ETSY_ECOSYSTEM_MAP_2026-09.md      # prose mirror of the board (exists; v4 in this change)
  ETSY_SHOP_HEALTH_LEDGER.md         # append-only ledger, one row per line per month (new)
  shop-design-system/
    image-principles.md              # chapter 1 (new)
    content-principles.md            # chapter 2 (new)
  pulls/                             # distilled pull notes (exists, #480)
```

## Visual design / Figma

This change's visual surface is the FigJam board, not a hub screen — the as-is/proposed pair is the board's own version pages, built before this design per the living-diagram conventions.

| Item               | Value |
| ------------------ | ----- |
| Primary file URL   | https://www.figma.com/board/ln6p2z1vppiTdqDPNVdoOZ |
| As-is frame(s)     | Page `v3 — 2026-09-16 — loop untangled (superseded)` — Figma flattened to one "Design in Figma" pair |
| Proposed frame(s)  | Page `v4 — 2026-09-16 — Figma footprint surfaced (CURRENT)` — Figma domain split into Source art files / Listing template system (Layouts set, 12 role variants + slots) / Full-shop libraries, with the standards seam "Image principles live here as components" |
| Libraries / version| FigJam living-diagram conventions (Index TOC, CURRENT banner, archive banners); component receipts cite `ZZusgWsPM4Fz8YuhKxnD4R` Garden Components (node 2041:55504, Layouts set 2041:55505) |
| Code Connect       | N/A — no code surface |
| Breakpoints        | N/A — FigJam canvas, not a responsive screen |
| Status             | v4 built and live on the board; awaiting Katy's review with this design |

## Decisions

1. **Figma is drawn as two roles, not one node.** Source art (Xmas Cut Files, Embroidery Components) and the listing template system (Layouts set + slots + staging frames) get separate nodes, with full-shop libraries alongside. Receipt: the Garden Components page itself — the 12 variants name the 12 gallery roles.
2. **The image-principles chapter starts from the component set.** Each principle cites the Layouts variant or slot that embodies it, then the code that consumes it (`scenes.ts`, `generator.ts`, `palette.ts`), then dated session lessons. A principle with no surviving artifact behind it is dropped — this is how "every principle carries its receipt" stays honest.
3. **Chapters live at `docs/shop-design-system/`, one file each.** Two files keep "image" and "content" independently linkable ("one link away" scenario) while remaining one findable set. MVDS is the expressed base; Etsy extensions are marked as such inline.
4. **Checkability is a format rule:** every principle is written as a statement a reviewer can mark met/not-met against a real listing, followed by its receipt line. No principle ships as advice-prose.
5. **The ledger is its own append-only doc** (`docs/ETSY_SHOP_HEALTH_LEDGER.md`), not rows inside the dated map doc — it accumulates across months while map docs may be superseded by later snapshots. Each row carries capture provenance (sync query, pull note link, or statement pull date). No targets column exists, by construction.
6. **Board-first sequencing on every future iteration:** new board page first, doc in the same PR — matching the spec's "board treated as the primary review surface" and Katy's ask to put the FigJam version as early in the schema as possible.

## Risks / Trade-offs

- **Two-surface drift** is the standing risk of board+doc lockstep. Mitigation is procedural (same-PR rule, monthly review check), not tooling — accepted for a solo shop.
- **Figma nodes referenced by id** (2041:55504/55505) can be renamed or moved in Figma without the map noticing until the next review. Accepted: names + node ids together make the citation recoverable.
- **The ledger depends on a manual ritual.** If a month is missed, the spec's "series lapses" failure fires at review — that's the enforcement, and it is deliberately light.
- **The map doc's dated name** (`_2026-09`) implies snapshots while the spec treats it as living. Deferred to tasks: either the monthly review renames/re-dates it, or the date becomes "established" rather than "valid-as-of." Not resolved here.
