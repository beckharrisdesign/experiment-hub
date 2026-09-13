# Design: stitch-brushes

## Context

Brushes change almost nothing in the panel and almost everything on the
canvas. The tag contract (`st-brush-<name>`, `p<n>`) is the declaration
channel — an adopted decision, so there is no picker, no toggle, no new
control. The visible surface of this change is exactly two things:

1. **One new stat row** — "Brush runs" in the DESIGN readout, so a tag
   has a visible effect (the panel principle: no capability without a
   readout).
2. **The motifs themselves** — six decorative stitch vocabularies
   rendered in the preview, which is where the founder does her
   imagine-and-QA pass before a file goes in the store.

## Goals / Non-Goals

**Goals:**

- The Brush runs count sits with its kindred stats (directly after
  Satin sections), so related readouts stay adjacent.
- Each motif is visually recognizable as its Figma exploration at
  preview zoom — crosses read as X's, bird tracks as V's, bean as a
  heavy tripled dash — on the same fabric/penetration-dot rendering
  satin already uses.
- Unknown brush names and out-of-range pitch surface through the
  existing error banner, naming the layer (loud-error principle).

**Non-Goals:**

- No panel brush picker, no per-brush toggles, no show/hide behavior
  (adopted decisions; panel principles).
- No in-app motif legend for v1 — the legend lives in the Figma file
  and `stitch-authoring.md`; the tag is the interface.
- No new preview affordances; brush runs render through the existing
  polyline + penetration-marker pipeline.

## User flow / IA

1. In Figma, name a stroke layer (or group) `st-brush-cross` — optional
   `p25` for 2.5 mm pitch — and export SVG with **Include ID**.
2. Drop the SVG in Stitch Check. Tagged paths convert as the named
   motif following the path's curves; everything else behaves as today.
3. The DESIGN readout shows **Brush runs** (after Satin sections,
   before Thread colors); hidden for machine files, like Satin
   sections.
4. QA loop: zoom the preview, check motif orientation on bends, check
   the count matches the tagged layers, download DST/EXP.
5. Failure path: a typo'd brush name or out-of-range pitch fails the
   conversion with the layer name in the existing error banner — never
   a silent fallback to running stitch.

Panel IA is otherwise unchanged from the shipped layout (controls with
readouts up top, DESIGN stats, SEW ORDER, EXPORT at the bottom).

## Visual design / Figma

> UI changes require a Figma **as-is + proposed** pair (see
> `openspec/changes/archive/2026-07-20-stop-the-leaks/design.md`).

| Item                | Value                                                                                                                                                                                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Primary file URL    | <https://www.figma.com/design/aiw0eWYOYS413Mbi0ATJMG> ("svg-to-stitch — stitch-brushes")                                                                                                                                                     |
| As-is frame(s)      | `01 Current state` → Stitch Check panel (node `3:46`) — shipped panel reconstructed from `app/svg-to-stitch/page.tsx`: chips, Fabric, three switches, fill selects, DESIGN stats, SEW ORDER, EXPORT                                          |
| Proposed frame(s)   | `02 Proposed` → `Panel — proposed (Brush runs readout)` (node `4:2`, adds the **Brush runs** stat row after Satin sections) and `Brush library — built-in motifs` (node `4:73`, the six motifs as stroke drawings: cross, tick, chain, dot, bird, bean, each labeled `st-brush-<name>`) |
| Libraries / version | MVDS Core (library key in `rules/figma.mdc`) — Badge (`variant=neutral` stats, `variant=muted` chips), Switch, Label imported by component key (`importComponentByKeyAsync`; works without library subscription)                             |
| Code Connect        | No new mappings — the new row reuses the existing StatRow/Badge pattern; no new components introduced                                                                                                                                        |
| Breakpoints         | S · 480px mobile / L · 1024px desktop (BHD Content Types) — panel stays the fixed 300px rail, one row taller; see `rules/design-guidelines.mdc`                                                                                              |
| Status              | Built 2026-09-13 (pages `00 Components` / `01 Current state` / `02 Proposed`); awaiting founder approval                                                                                                                                     |

## Decisions

- **Readout-only UI.** Tags declare, the panel reports. A picker would
  duplicate the design file's authority and add controls without a
  matching workflow — declared intent comes from Figma, per the
  authoring principles.
- **Row placement.** Brush runs goes immediately after Satin sections:
  both count decorative stitch sections, and the adjacency principle
  keeps kindred readouts together. Hidden for machine files (formats
  carry no stroke semantics — same rule as Satin sections).
- **Legend lives in Figma/docs, not the app.** v1 users are the founder
  and tag-literate stitchers; `stitch-authoring.md` gets the motif
  table when `st-brush` moves to "implemented".
- **The Figma legend is the aesthetic target, not the pixel spec.**
  Motif geometry authority is the brush template code and its tests;
  the legend exists so approval is a visual act, not a code read.
- **Errors reuse the banner.** Unknown brush / bad pitch flow through
  `friendlyError` with the layer name — no new error surface.

## Risks / Trade-offs

- **Motif legibility at fit zoom.** Small motifs plus penetration dots
  can smear at fit-to-screen zoom on dense patterns. Mitigation:
  library default pitches sized so motifs stay ≥ ~2 mm; QA happens
  zoomed, where the dot rendering already reads well.
- **Panel height.** One more stat row lengthens the rail slightly;
  acceptable — the rail scrolls and EXPORT stays anchored at the
  bottom of the stack.
- **Six motifs in one release.** Motif count is scope risk in the
  engine, not the UI — the panel change is one row either way, so a
  library that ships 4/6 motifs would not change this design.
