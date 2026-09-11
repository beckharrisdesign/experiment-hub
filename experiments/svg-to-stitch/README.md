# SVG to Stitch

Drop an SVG, download machine-ready embroidery files. A quick **tool** experiment — no market scoring.

- **Live route:** `/svg-to-stitch` (hub app route, fully client-side)
- **Converter library:** `lib/svg-to-stitch/`
- **Tests:** `tests/svg-to-stitch.test.ts`

## What it does

1. Parses an SVG (paths incl. curves/arcs, rects, circles, ellipses, lines, polylines, polygons; nested transforms; stroke/fill colors).
2. Flattens everything to polylines and plans a **running stitch** at a configurable stitch length, scaled to a physical design size.
3. Groups elements by thread color (one color change per thread), inserts jumps between runs.
4. Encodes and downloads:
   - **DST** (Tajima) — the universal embroidery machine format
   - **EXP** (Melco)

Everything runs in the browser. Files never upload anywhere.

## Why not EMB?

EMB is Wilcom's **proprietary** format with no public specification — no third-party tool writes it legitimately. The pragmatic path: export DST or EXP, open in Wilcom/Hatch (or ask your digitizer), save as EMB there. The UI says this plainly.

## Known limits (by design, for v1)

- **Outlines only** — filled shapes stitch as their outline. No satin columns or tatami fills yet.
- No tie-in/tie-off lock stitches.
- No underlay, pull compensation, or density logic — this preps geometry; it is not a digitizer.
- Gradients/patterns resolve to black; `use`/`symbol` references are skipped.

## Possible next steps

- Lock stitches at run start/end
- Satin along stroked paths using `stroke-width`
- Tatami fill for closed filled shapes
- PES/JEF writers (Brother/Janome home machines)
