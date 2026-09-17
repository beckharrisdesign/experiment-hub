# Tasks: retire-umbrella-switches

## 1. User outcomes (from spec scenarios)

- [x] 1.1 **Panel carries no all-or-nothing stitch control** — user opens
      the converter and finds no **Fill shapes**, **Satin narrow fills**
      or **Satin strokes** switch; **Fabric** remains
- [x] 1.2 **Un-prepped art converts unchanged** — user converts an SVG
      with no `st-` tags and gets the plan it produces today
- [x] 1.3 **Stitch type is reproducible from the file alone** — user
      converts the same file in two sessions with the panel left
      differently and gets the same stitch count, colour blocks and sew
      order
- [x] 1.4 **A tagged fill overrides the hidden defaults** — user tags a
      fill `st-tatami a0 d8` and it sews at 0° and 0.8 mm while untagged
      regions sew at 45° and 0.4 mm
- [x] 1.5 **A fill tagged st-run sews its outline** — user tags a filled
      shape `st-run` and only its boundary rings sew, with no interior
      hatching
- [x] 1.6 **Margin inside the frame survives** — user tags a frame
      `patch st-size w635` with an inset motif and the design converts
      63.5 mm overall with the inset intact, not the motif scaled up to
      fill it
- [~] 1.7 **A nested size sizes its own subtree** — **not implemented.**
  The outermost declaration sets the document extent (and a nested one is
  ignored rather than applied to its subtree). Per-subtree scaling needs
  a transform applied during geometry extraction; deferred, see below — user nests
  `st-size w200` inside a frame tagged `st-size w635` and the design
  stays 63.5 mm while that group sews 20 mm — only the first half holds
  today
- [x] 1.8 **A bare group cannot declare a size** — user tags a group that
      exports with neither a clip nor a background and the conversion
      fails, naming the layer
- [x] 1.9 **Bought art still converts** — user converts an SVG with no
      `st-size` and no physical units and gets 63.5 mm, as today
- [x] 1.10 **An impossible size is refused** — user tags `st-size w5000`
      and the conversion fails, naming the layer and the value

## 2. Prototype shell

- [x] 2.1 No new shell — the surface is the existing converter at
      `app/svg-to-stitch/` (dev: `npm run dev`, tests: `npm test`).
      Confirm the page builds unchanged before removal work starts

## 3. Implementation

- [x] 3.1 `app/svg-to-stitch/page.tsx` — remove the three `Switch` rows
      and their state, and the **Design size**, **Fill angle** and **Fill
      density** selects. **Fabric** and every readout stay
- [x] 3.2 `lib/svg-to-stitch/convert.ts` — drop the `fillMode`,
      `satinFills` and `satinStrokes` options and delete the
      `fillMode === "outline"` branch; `rejectBrushOnFill` and
      `checkTagDensity` collapse back to one call site each. Keep the
      fill angle and spacing defaults at 45° and 0.4 mm
- [x] 3.3 `lib/svg-to-stitch/svg-parse.ts` — add `st-size` to the
      directive grammar, reusing the existing `w` parameter (mm ×10).
      Resolve it **outermost-first**, against the innermost-wins rule the
      other directives use — see the callout in the spec
- [x] 3.4 `lib/svg-to-stitch/svg-parse.ts` — read a tagged element's box:
      the root `<svg>`'s `width`/`height`/`viewBox`, or a referenced clip
      rect. `clippath` is currently in `SKIP_TAGS`, so a group has no
      readable box today. Apply the existing CSS length parser (it
      already carries an `mm` factor) so `width="63.5mm"` is honoured
- [x] 3.5 `lib/svg-to-stitch/convert.ts` — scale from the declared box
      rather than the artwork bounds when a size is declared, preserving
      margin; fall back to `bounds.span / 63.5` when nothing is declared.
      Error loudly for an unmeasurable element and for a size outside
      10–400 mm
- [x] 3.6 `experiments/svg-to-stitch/docs/stitch-authoring.md` — add
      `st-size` to the tag table, rewrite the untagged fallback from
      future tense to shipped behaviour, and **reverse decision 2**,
      which currently reads "Physical size: panel only … No size tags".
      Record the cascade as the model the vocabulary follows
- [x] 3.7 `experiments/svg-to-stitch/README.md` — panel description

## 4. QA

- [ ] 4.1 Manual walkthrough (ingest → tweak → download) — material is
      ready: `experiments/svg-to-stitch/fixtures/sticker-sheet.svg` covers
      every promise in one file, with `fixtures/errors/` for the loud
      failures (they cannot share a file, since one error aborts the whole
      conversion). Expectations per specimen are in
      `fixtures/README.md`; `tests/svg-to-stitch-fixtures.test.ts` runs
      them all so they cannot rot between walkthroughs
- [x] 4.2 Automated smoke (vitest): a `document-declared-size` suite —
      declared size, nested size, unmeasurable element, undeclared
      fallback, out-of-range — plus coverage that untagged conversion is
      byte-identical to today's default-panel output. Retire the
      outline-mode regressions in `tests/svg-to-stitch-brush.test.ts`
      with the mode they guard. Full `npm test` stays green
- [x] 4.3 Founder review of the Figma rounds before implementation —
      **approved 2026-09-17** ("figma is approved"). Round `03.6` is the
      approved surface: no umbrella switches, no fill parameters, no size
      control; File, Fabric and Size on one 150 px value column with Size
      as a readout; MVDS `Button` instances and MVDS spacing, radius and
      type tokens throughout. The reorderable sew-order _behaviour_ shown
      in `03.5`/`03.6` is a separate change — this one ships the panel,
      not the dragging
