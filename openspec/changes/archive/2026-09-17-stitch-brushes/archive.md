# Archive — stitch-brushes

**Archived:** 2026-09-17 · **Created:** 2026-09-13 · **Tasks:** 18/18
**Outcome:** SHIPPED

Decorative motif brushes sew along a path in its own tangent frame, reachable
by an `st-brush-<name>` layer tag.

**Evidence:** `lib/svg-to-stitch/brush.ts` on `main` exports `brushRun`,
`BRUSHES` and `BRUSH_NAMES`; `svg-parse.ts` routes `st-brush-<name>` with a
`p` pitch; `plan.ts` counts `brushRuns` separately from satin. Merged in
#469, live at `labs.beckharrisdesign.com/svg-to-stitch`.
`tests/svg-to-stitch-brush.test.ts` plus the fixtures suite run all six
motifs; `fixtures/sticker-sheet.svg` sews them alongside group inheritance
and a child override, and both machine formats download.

**Left open:** Four of the six motifs do not read as their name — `tick` and
`bird` render as zigzags separable only by frequency, and `dot` and `bean` as
a plain line, because the travel between stamps is itself stitched. The
founder passed 1.4 on 2026-09-17 knowing this: placement and rotation are
correct, and the stamp geometry of those four is an aesthetic pass for a
later change. `fixtures/motif-reference.svg` is the artifact that change
should be judged against.
