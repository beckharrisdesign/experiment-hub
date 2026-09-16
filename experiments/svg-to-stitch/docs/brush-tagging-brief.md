# Tagging an existing design for Stitch Check

Instructions for tagging artwork already drawn in Figma so the exported
SVG exercises every stitch directive the converter implements.

The tag grammar itself — every tag, its parameters, the six brush names
and their default pitches — is specified in
[stitch-authoring.md](stitch-authoring.md). Read that first; this brief
only covers applying it.

## What to tag

Rename layers in place. A tag may sit anywhere in the name, so keep the
descriptive part: `outer petal` becomes `outer petal st-brush-chain`.

Cover all of this, so one export walks the whole feature:

- **All six brushes** — `cross`, `tick`, `chain`, `dot`, `bird`, `bean`
  — on open stroked paths, at least once each
- **At least two brushes on curved paths.** Motifs rotate into the local
  path direction; a straight line doesn't prove that
- **One explicit pitch** — e.g. `st-brush-cross p20` for 2.0 mm instead
  of the 3.0 mm default. Valid range `p10`–`p100`
- **One tagged group with a child override** — group named
  `st-brush-tick`, one child left unnamed to inherit, one child named
  `st-brush-chain` to override
- **One `st-skip`** on a guide, hoop mark, or annotation
- **One `st-run`** on a narrow stroke, pinning it to a running line
  instead of the satin it would otherwise get
- **One `st-satin w20`** on a hairline
- **One `st-tatami a0 d8`** on a filled shape
- **At least one shape left untagged**, so the heuristic fallback still
  shows up in the same file

Give each brushed path its own stroke colour. The app lists sew order by
thread colour, so same-coloured paths merge into one row and the
per-motif counts become impossible to read.

## What breaks it

**Brushes sew strokes and open paths only.** A filled shape tagged
`st-brush-*` fails the whole conversion with a loud error naming the
layer. If a shape needs both a fill and a brushed edge, they have to be
two layers.

**Strokes must survive export as strokes.** If Figma outlines a stroked
path into a filled shape, its brush tag hits exactly that error. So on
any layer carrying a brush tag: centred stroke, no "Outline stroke", no
boolean operations, no masks, no effects, no dashes.

**Names must be unique.** Duplicates collide in the export.

## Export

SVG, per frame, with:

- **Include "id" attribute** — checked. Without it no tag reaches the
  converter and every shape silently falls back to heuristics.
- **Simplify stroke** — checked, so strokes stay `stroke=`.

Check the export before handing it over:

```bash
grep -o 'id="[^"]*st-[^"]*"' design.svg
```

Every tagged layer should be listed. Then confirm no brushed path got
outlined — this count must equal the number of brush tags, not zero:

```bash
grep -o '<path[^>]*st-brush-[^>]*>' design.svg | grep -c 'stroke='
```

## Hand back

The SVG file, the page URL, and the node id of each exported frame.
