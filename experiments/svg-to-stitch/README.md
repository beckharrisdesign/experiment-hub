# Stitch Check

Convert and preview embroidery files in the browser so stitchers trust a
design before sewing it. A **commercial** experiment, grown from the
SVG to Stitch quick tool (2026-09-11).

- **Live route:** `/svg-to-stitch` (hub app route, fully client-side)
- **Converter library:** `lib/svg-to-stitch/`
- **Tests:** `tests/svg-to-stitch*.test.ts(x)` — 72 across converter, fills, and preview

## Who it's for

Home and small-shop machine embroiderers who get designs as vector art or
buy machine files online — and don't trust a file until they've sewn it.

## What it does today

1. Parses an SVG (paths incl. curves/arcs, basic shapes, nested transforms,
   stroke/fill colors) and flattens it to stitchable geometry.
2. **Filled shapes stitch as tatami fills**: scanline hatch at a chosen angle
   and density under the even-odd rule (holes stay empty), serpentine
   columns with per-row stagger, a sparse perpendicular underlay pass, and a
   boundary run. Strokes stitch as running-stitch outlines, sewn after their
   element's fill.
3. **Optimizes the plan**: sliver segments and needle-poke runs culled,
   nearest-neighbor run ordering, and short in-region gaps stitched over
   instead of jumped — the exported file carries the optimized plan.
4. **Interactive preview**: full-viewport canvas with pan/zoom (wheel, pinch,
   buttons), click-to-highlight per thread color synced with the sew-order
   panel, recessed underlay rendering, and quiet dashed jumps.
5. Encodes and downloads **DST** (Tajima) and **EXP** (Melco). Everything
   runs in the browser; files never upload anywhere.
6. **The design file decides.** The panel carries no stitch controls — only
   a fabric backdrop for the preview. Stitch type comes from `st-` layer
   tags or the documented fallback, and physical size from an `st-size`
   tag (millimetres or inches), falling back to the 2.5 in patch. The same
   file converts the same way in any session.

## Hypothesis

Stitchers will use (and may pay for) a converter + previewer that shows how
a file will actually sew — stitches, colors, size, sew order, trims —
before they waste stabilizer, thread, and hooping time.

## Authoring contract

Stitch decisions belong in the design file, not in reverse-inference —
see [docs/stitch-authoring.md](docs/stitch-authoring.md) for the
principles and the `st-` layer-name tag spec (draft). Heuristics remain
as the fallback for un-prepped files.

## Not yet built (the "previewer" half and beyond)

- **Reading machine files** — opening an existing DST for preview (today the
  tool only writes them).
- Satin columns for 1–10 mm strokes (borders, lettering).
- Sew-order playback, needle penetration points, stitch-length warnings.
- Tie-in/tie-off lock stitches; pull compensation.

## Why not EMB?

EMB is Wilcom's **proprietary** format with no public specification — no
third-party tool writes it legitimately. DST/EXP are the honest interchange
formats, and Wilcom/Hatch import them and can save EMB.

## History

- **2026-09-11** — born as _SVG to Stitch_, a personal outline-only converter
  tool (PR #459), explicitly unscored.
- **2026-09-11** — same day: interactive preview + full-viewport layout
  (#460), tatami fills (#461), letterform artifact fix (#462), fill optimizer
  (#464), 2.5 in default (#465).
- **2026-09-12** — reframed as **Stitch Check**, a commercial experiment for
  stitchers: converter + previewer. Scores pending market research.
