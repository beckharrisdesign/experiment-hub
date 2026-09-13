# Proposal: stitch-brushes

## Human anchor

> "I want to be able to move between vectors and lines in machine files
> to preview images of the same artwork. It helps me imagine what it
> will become, or do QA on the paths before I put it in my store." —
> founder, 2026-09-13
>
> "that, but with a longer term goal in mind of replicating more complex
> custom strokes like these [Figma stitch-brush explorations] and
> successfully rendering line only patterns like these" — founder,
> 2026-09-12, choosing curved satin as step one of a brush engine
>
> "lets do stitch brushes! but with openspec the right way this time" —
> founder, 2026-09-13
>
> "and I want to make it clear when I'm designing for hand stitching,
> machine stitching, or a machine doing a proof of hand style
> stitching." — founder, 2026-09-13
>
> "But I want to stay within industry standards even when proposing
> hand stitching." — founder, 2026-09-13

Founding record: `experiments/svg-to-stitch/docs/intent.md`; authoring
contract: `experiments/svg-to-stitch/docs/stitch-authoring.md`.

## Outcomes

- **Who:** Stitchers (the founder first) who design line art in Figma,
  sell the resulting machine files, and want decorative machine stitches
  — not just running lines — when the artwork converts in Stitch Check.
- **Job:** Move between the vector artwork and the machine-file stitch
  view of the same design: draw a path, name its layer
  `st-brush-<name>`, export, drop in Stitch Check, and see that path
  sewn as the named decorative motif — crosses, ticks, chain, dots,
  bird-tracks, bean — following the path's curves at a declared pitch —
  to imagine what it will become and to QA the paths before the file
  goes in the store.
- **Done when:** The six built-in brushes from the founder's Figma
  explorations sew correctly along straight and curved paths; the
  redwork-style line-only pattern designs render as decorative stitching
  end to end; every brush is reachable by tag with a pitch parameter and
  visible in the Satin sections-style readout.
- **Not doing:** Figma-component-defined brushes (adopted decision: later
  evolution, not v1); a panel brush picker (tags are the v1 channel);
  brush use inside fills (paths and strokes only); editing or previewing
  brushes outside the converter.

## Why

The adopted authoring principles commit Stitch Check to interpreting
declared intent from the design file. Satin proved the machinery — a
spine with a moving tangent/normal frame — and the founder's Figma
explorations define the aesthetic target: decorative stitches that read
as hand-worked thread. Brushes are the generalization that turns the
converter into a digitizer: running stitch and satin become the two
simplest members of a family the designer can extend by name.

Of the founder's three design targets — hand stitching, machine
stitching, and a machine proofing hand-style stitching — brushes are
the third: the machine executing hand-stitch aesthetics, so a hand-look
pattern can be imagined, proofed, and sold with confidence. Hand-style
is an aesthetic, never a format deviation: every brush emits standard
DST/EXP penetrations within machine stitch-length bounds, the same
industry constraints the rest of the converter obeys.

## What changes

- A brush engine stamps a repeating penetration template along a path in
  its local tangent/normal frame, at a declared pitch, reusing the
  arc-length sampling the satin module already has.
- A built-in brush library ships the six motifs from the founder's
  explorations: `cross`, `tick`, `chain`, `dot`, `bird`, `bean`.
- `st-brush-<name>` layer tags (with `p<n>` pitch, mm ×0.1) route strokes
  to the engine per the authoring contract; unknown brush names error
  loudly with the layer name.
- The stats readout counts brush runs so the tag has a visible effect.

## Capabilities

### New Capabilities

- `brush-engine`: stamp a penetration template along a path in its moving
  frame at a declared pitch, producing exact-penetration runs the plan
  sews verbatim.
- `brush-library`: the built-in named motifs (cross, tick, chain, dot,
  bird, bean) and their `st-brush-<name>` tag routing with parameters.

### Modified Capabilities

- (none — satin, tatami, and tag parsing gain no new behavior; the tag
  grammar already reserves `st-brush-*`)

## Impact

- `lib/svg-to-stitch/`: new `brush.ts`; `svg-parse.ts` directive type
  gains the brush name; `convert.ts` routes tagged strokes; `plan.ts`
  stats.
- `app/svg-to-stitch/`: readout only (brush runs count); no new controls.
- `tests/`: new brush suite; tag suite grows.
- `experiments/svg-to-stitch/docs/stitch-authoring.md`: `st-brush`
  moves from "still to come" to implemented.

## Optional links

- Experiment directory: `experiments/svg-to-stitch/`
- Figma explorations: stitch brushes node 7-1565, line-only pattern node
  37-59 in "Experimenting with stitch brushes"
