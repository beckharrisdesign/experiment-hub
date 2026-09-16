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

Giving each brushed path its own stroke colour makes the walkthrough
easier to read, though it isn't required. The app lists sew order by
thread colour and each row already breaks down its motifs — two crosses
and a chain in one thread read as `✕ 2 · ◯ 1 · 412 sts`. Separate
colours just make it obvious which path produced which motif. Don't
invent thread colours the design doesn't want; every extra colour is a
real thread change on the machine.

## What breaks it

**Brushes sew strokes and open paths only.** A filled shape tagged
`st-brush-*` fails the whole conversion with a loud error naming the
layer. If a shape needs both a fill and a brushed edge, they have to be
two layers.

**Strokes must survive export as strokes.** If Figma outlines a stroked
path into a filled shape, its brush tag hits exactly that error. So on
any layer carrying a brush tag: centred stroke, no "Outline stroke", no
boolean operations, no masks, no effects, no dashes.

**Keep the tag a whole word.** Duplicate layer names are fine — Figma
suffixes them and the parser splits on underscores, so
`st-brush-cross_2` still sews a cross. What fails is a suffix that fuses
to the brush name: `st-brush-cross2` and `st-brush-cross-2` both error
with "isn't in the library", because the brush name is read to the end
of the token.

## Export

SVG, per frame, with:

- **Include "id" attribute** — checked. Without it no tag reaches the
  converter and every shape silently falls back to heuristics.
- **Simplify stroke** — checked, so strokes stay `stroke=`.

Check the export before handing it over:

```bash
grep -o 'id="[^"]*st-[^"]*"' design.svg
```

Every tagged layer should be listed, group tags included.

For the flattening check, grep only answers for paths that carry a brush
tag in their own `id` — it can't see a path that inherits its tag from a
group, and it ignores `rect`, `circle` and the other shapes. So treat a
`fill=` on a directly-tagged path as a definite problem:

```bash
grep -o '<path[^>]*st-brush-[^>]*fill="#[^>]*>' design.svg
```

Anything it prints has been outlined. Silence doesn't clear the export,
though — the real check is converting the file, which fails loudly and
names the offending layer whichever way the tag was inherited.

## Hand back

The SVG file, the page URL, and the node id of each exported frame.
