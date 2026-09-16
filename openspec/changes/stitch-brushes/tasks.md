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
      `"st-brush-cross" is a filled shape tagged st-brush`
- [ ] 1.4 **Six motifs sew on straight and curved paths** — user can tag
      `st-brush-cross`, `-tick`, `-chain`, `-dot`, `-bird`, or `-bean` and
      recognize each motif from the Figma explorations in the preview, on
      straight and curved paths alike
      — **open, founder call.** At the 2.5 in default, `cross` and `chain`
      read unmistakably; `tick` and `bird` both read as zigzags and are
      hard to tell apart; `dot` and `bean` read as a line with texture,
      because the travel between stamps is itself stitched
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

- [~] 4.1 Manual walkthrough (ingest → tweak → download): export a tagged
      test design from Figma with Include ID, convert, verify each motif
      and the Brush runs count in the preview, download DST and EXP
      — de-risked 2026-09-16 against production with a hand-built fixture
      (see 1.1–1.3, 1.5). What remains is the founder's own Figma export,
      per `experiments/svg-to-stitch/docs/brush-tagging-brief.md`, and the
      motif-recognition call in 1.4
- [x] 4.2 Automated smoke (vitest): new `tests/svg-to-stitch-brush.test.ts`
      suite — one scenario per §1 outcome (frame rotation on a curve,
      machine-bound segments + encoder round-trip, loud unknown-brush
      error, six-motif recognition fixtures, tag routing/inheritance/
      readout); full `pnpm test` stays green
- [x] 4.3 Redwork line-only fixture: a multi-path, line-only pattern
      design tagged with brushes converts end to end and every path
      renders as decorative stitching — the proposal's "Done when"
      criterion for line-only patterns, verified as a vitest fixture
