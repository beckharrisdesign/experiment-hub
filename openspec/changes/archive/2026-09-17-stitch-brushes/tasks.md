# Tasks: stitch-brushes

## 1. User outcomes (from spec scenarios)

- [x] 1.1 **Motifs follow the path frame** — user tags a curved path with a
      brush and sees one motif per pitch step, each rotated to the local
      path direction, evenly spaced across bends
      — verified 2026-09-16 on production `/svg-to-stitch`: a six-path
      fixture (3 straight, 3 curved) converted with `Brush runs 6`, each
      curved path rendering its motif rotated through the bend
- [x] 1.2 **Brush output stays within machine bounds** — every brush at
      every supported pitch downloads as valid DST/EXP: exact penetrations
      sewn verbatim, no thread segment over 12.1 mm
      — verified 2026-09-16: both downloads encode from that fixture, DST
      2,993 bytes with a valid Tajima header (`ST:821`, `CO:5`), EXP 1,724
      bytes
- [x] 1.3 **Unknown brush errors loudly** — a typo'd brush name or
      out-of-range pitch fails the conversion with the layer name and the
      offending value in the error banner, never a silent fallback
      — verified 2026-09-16: a brush tag on a filled shape (the shape a
      Figma stroke becomes when it is outlined on export) fails with
      `"st-brush-cross" is a filled shape tagged st-brush`. Review of
      PR #485 surfaced a hole in this: the `fillMode: "outline"` branch
      validated no fill directives at all, so with **Fill shapes** off a
      brushed fill was silently flattened to a boundary run and an
      out-of-range density passed unchecked. Both now error in either
      mode, covered by `tests/svg-to-stitch-brush.test.ts`
- [x] 1.4 **Six motifs sew on straight and curved paths** — **passed
      2026-09-17**, founder: "yes it passes", judged against
      `experiments/svg-to-stitch/fixtures/motif-reference.svg` (the six
      brushes generated from `brush.ts`, straight and curved at default
      pitch) and the sticker sheet with its row key. Accepted knowing what
      it accepts: `cross` and `chain` read as their name; `tick` and `bird`
      both render as zigzags distinguishable only by frequency; `dot` and
      `bean` read as a plain line, because the travel between stamps is
      itself stitched. The engine places and rotates every motif correctly
      along straight and curved paths — the stamp geometry of those four is
      an aesthetic pass for a later change, not a fault in the routing
- [x] 1.5 **Tag routing with pitch and readout** — user names a layer or
      group `st-brush-<name>` (optional `p<n>`, mm ×0.1) in Figma, exports
      with Include ID, and sees the tagged strokes sew as that brush with
      the **Brush runs** stat counting them; children can override a group
      tag
      — verified 2026-09-16: tags routed from `id` attributes, `Brush runs`
      counted 6, and each sew-order row carried its motif glyph
      (`✕ 1 · 116 sts`, `◯ 1 · 207 sts`)

## 2. Prototype shell

- [x] 2.1 No new shell — the surface is the existing converter at
      `app/svg-to-stitch/` (dev: `pnpm dev`, tests: `pnpm test`); confirm
      the page builds unchanged before engine work starts

## 3. Implementation

- [x] 3.1 `lib/svg-to-stitch/brush.ts` — brush engine: arc-length walk at
      pitch, local tangent/normal frame, stamp a penetration template per
      step. Export the arc-length sampler from `satin.ts` (currently a
      private `sampleCenterline`) rather than duplicating it. Exact
      penetrations flow through `buildPlan` under a **distinct brush
      marker** — same no-resample behavior as the satin flag, but counted
      separately so brush runs never inflate `stats.satinRuns`
- [x] 3.2 Built-in library in `brush.ts` — templates + default pitches for
      cross, tick, chain, dot, bird, bean, sized so every segment stays
      within machine bounds at all supported pitches
- [x] 3.3 `svg-parse.ts` — extend `StitchDirective` with the brush name;
      parse `st-brush-<name>` (+ `p<n>`) per the tag grammar, group
      inheritance and child override included
- [x] 3.4 `convert.ts` — route tagged strokes to the engine; loud errors
      naming the layer for unknown brush / out-of-range pitch
- [x] 3.5 `plan.ts` + `read.ts` + `app/svg-to-stitch/page.tsx` —
      `stats.brushRuns` counted from the brush marker (one per tagged
      path); `finishPlan` in `read.ts` initializes `brushRuns: 0` for
      decoded machine files; the **Brush runs** StatRow after Satin
      sections (hidden for machine files), per `design.md` / Figma
      `02 Proposed`
- [x] 3.6 `experiments/svg-to-stitch/docs/stitch-authoring.md` — move
      `st-brush` to "implemented today" with the motif table

## 4. QA

- [x] 4.1 Manual walkthrough (ingest → tweak → download) — **passed
      2026-09-17** via `fixtures/sticker-sheet.svg`, which runs the same
      walkthrough this task describes: a tagged design converted in
      production with all six motifs sewn, `Brush runs` counted, group
      inheritance and child override visible in one row, and both DST and
      EXP downloaded. Founder reviewed the conversion and the row key. A
      bespoke Figma export was not needed to prove what the sheet already
      proves; the tagging brief remains at
      `experiments/svg-to-stitch/docs/brush-tagging-brief.md`
- [x] 4.2 Automated smoke (vitest): new `tests/svg-to-stitch-brush.test.ts`
      suite — one scenario per §1 outcome (frame rotation on a curve,
      machine-bound segments + encoder round-trip, loud unknown-brush
      error, six-motif recognition fixtures, tag routing/inheritance/
      readout); full `pnpm test` stays green
- [x] 4.3 Redwork line-only fixture: a multi-path, line-only pattern
      design tagged with brushes converts end to end and every path
      renders as decorative stitching — the proposal's "Done when"
      criterion for line-only patterns, verified as a vitest fixture
