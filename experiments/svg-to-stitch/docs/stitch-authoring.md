# Stitch authoring principles

**Status: adopted — 2026-09-12** (principles and the four decisions below
approved by the founder in session). The founding decision this document
records:

> "I don't want my code to try and figure it out backwards - I'd rather be
> able to use much more powerful editing software and have my tools
> interpret that standard format properly." (founder)

Stitch Check should read *declared intent* from the design file, the way
LightBurn reads layer colors as machine operations. Guessing stitch types
from geometry is a courtesy for un-prepped files, never the architecture.

## Principles

1. **Explicit beats inferred.** The design file states what each shape
   sews as. Heuristics (satin range detection, ribbon pairing) remain
   only as fallbacks for untagged shapes — graceful degradation, not the
   contract.
2. **The design tool is the editor.** Figma (or any SVG editor) is where
   stitch decisions are authored. Stitch Check interprets; it does not
   second-guess. No proprietary sidecar files — everything rides in the
   SVG itself.
3. **Only channels that survive export.** A directive is useless if the
   exporter strips it. The contract uses what Figma reliably writes into
   SVG: **layer names** (exported as `id` when "Include ID" is on),
   geometry, stroke width, and document order. Colors are *never*
   directives — color means thread color, period (unlike the laser
   workflow, where color is free to mean an operation).
4. **Stitch decisions are physical.** Densities, widths, and lengths are
   millimeters at output size, not proportions of the artwork. Tags carry
   mm; the preview reports mm.
5. **Sew order is document order.** Bottom layer sews first, exactly as
   the layer stack reads. No reordering magic beyond same-color grouping,
   which the preview must always show.
6. **The preview never lies.** Every shape shows which rule produced its
   stitches — *declared* or *inferred* — so a prepped file is verifiably
   deterministic and an un-prepped one is honestly labeled.

## The directive channel: layer-name tags

Figma exports layer names as `id` attributes (sanitized: spaces become
underscores, duplicates get numeric suffixes). Tags are therefore written
to survive that sanitization: lowercase, dash-separated, prefixed `st-`.
Anything without a tag falls back to today's heuristics.

A tag names the stitch type, optionally followed by parameters:

| Tag | Sews as | Parameters (mm unless noted) |
| --- | --- | --- |
| `st-run` | running stitch along the path | `l25` stitch length ×0.1 (2.5 mm) |
| `st-bean` | bean stitch (each segment ×3) | `l25` |
| `st-satin` | two-rail satin (stroke width or ribbon rails) | `d4` density ×0.1 (0.4 mm) |
| `st-tatami` | tatami fill | `a45` angle °, `d4` density ×0.1 |
| `st-brush-<name>` | motif brush along the path (future) | `p20` pitch ×0.1 |
| `st-skip` | not sewn — guides, annotations, hoop marks | — |

Examples as Figma layer names: `heart st-satin`, `veins st-run l20`,
`background st-tatami a30`, `hoop guide st-skip`.

Rules:

- The tag may appear anywhere in the name; the rest of the name is yours.
- A tag on a **group** applies to every untagged child (children may
  override). `st-skip` prunes its whole subtree — guides don't sew.
- Parameters are optional; omitted ones use the panel defaults, so the
  panel remains the global knob and tags are the per-shape override.
- `st-satin` on a stroke thinner than 1 mm with no `w` parameter sews at
  the documented default of **2 mm**.
- Unknown tags are reported in the preview, never silently ignored.

**Implemented today:** `st-run`, `st-satin` (`w`, `d`), `st-tatami`
(`a`, `d`), `st-skip`, group inheritance, loud errors for over-range
satin and out-of-range densities. Still to come: `st-bean`,
`st-brush-*`, declared-vs-inferred labeling in the preview, and
reporting of unknown tags.

## What this replaces, and when

Today's pipeline infers: stroke width in 1–10 mm → satin; narrow fill →
satin (fixed-axis, then ribbon pairing); everything else → tatami.
Under this contract that whole decision tree becomes the **untagged
fallback**, and the preview labels its output "inferred". Tagged shapes
bypass it entirely.

Un-prepped files (bought art, quick tests) keep working exactly as they
do now — the heuristics are good and staying. The difference is that a
*prepped* file is deterministic: resize it, re-export it, and every shape
sews the way its tag says, no surprises.

## Decisions (settled 2026-09-12)

1. **Tag syntax:** `st-` + kebab parameters, as specified above.
2. **Physical size:** panel only — artwork stays proportional, output
   size is chosen per conversion. No size tags.
3. **Satin over-range:** error loudly. A shape tagged `st-satin` that
   exceeds the 10 mm range anywhere is flagged in the preview and not
   guessed at — the fix happens in the design tool. Purest form of "the
   preview never lies".
4. **Brushes:** built-in library first (cross, tick, chain, dot, and the
   rest of the founder's stitch-brush explorations), referenced by name
   (`st-brush-cross`). Figma-component-defined brushes are a later
   evolution, not v1.
