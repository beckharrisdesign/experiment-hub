## 1. User outcomes (from spec scenarios)

- [x] 1.1 A zero-scoring session is plotted and counted  
      ↳ verified 2026-08-27 · live data — summarizeAll over the 4 stored rows returns sessionCount 2 for corsi-backward with values [0, 20]
- [x] 1.2 No score-based filtering is applied  
      ↳ verified 2026-08-27 · live data — the series ids equal the stored ids; nothing is dropped by score
- [x] 1.3 Two same-day sessions do not stack  
      ↳ verified 2026-08-27 · component test at the real 8/25 timestamps (15:00:45 / 15:02:00) renders two distinct cx values
- [x] 1.4 A single-day series uses the full plot width  
      ↳ verified 2026-08-27 · component test — min cx is PAD.left, span > 100px for a single-day series
- [x] 1.5 Gaps between days stay proportional  
      ↳ verified 2026-08-27 · component test — a 75s gap renders <1/100th the width of a 7-day gap
- [x] 1.6 A one-day series labels the axis once  
      ↳ verified 2026-08-27 · component test — one 8/25 label for a single-day series
- [x] 1.7 A multi-day series keeps both labels  
      ↳ verified 2026-08-27 · component test — 8/25 and 9/1 both present for a multi-day series
- [x] 1.8 Same-day rows are distinguishable  
      ↳ verified 2026-08-27 · live data — the two 8/25 rows differ on time, duration (9509/65459ms) and trials (2/8)
- [x] 1.9 Every row keeps its headline value  
      ↳ verified 2026-08-27 · live data — the 0 headline survives to its row
- [x] 1.10 The chart spans its container  
      ↳ verified 2026-08-27 · component test — svg carries width 100%, no max-w class
- [x] 1.11 Height does not track width  
      ↳ verified 2026-08-27 · component test — height stays 200 across 912 -> 416 -> 912
- [x] 1.12 Labels and marks keep their intended size  
      ↳ verified 2026-08-27 · component test — every axis label keeps text-[10px] at both widths

## 2. Prototype shell

- [x] 2.1 **N/A — no prototype directory.** The suite ships as hub routes plus pure modules in `lib/exec-function/`, as [the experiment README](../../../experiments/exec-function-assessment/README.md) states. Work happens in place.
- [x] 2.2 Dev command is `npm run dev` (the repo uses npm). Note that it currently fails on a stale `op run` vault reference — unrelated to this change, but it will block local verification until resolved.

## 3. Implementation

**Chart sizing — the one piece with real risk**

- [x] 3.1 Measure the rendered container width in `TrendChart` (`ResizeObserver` on a wrapper) and hold it in state.
- [x] 3.2 Render `viewBox="0 0 {width} 200"` at 1:1 units and drop `max-w-xl`, so 1 SVG unit is 1 CSS pixel and the plot spans the card.
- [x] 3.3 Give the server render a defined first-paint width and re-measure on mount, so there is no flash and no chart that never resizes. Covers 1.10–1.12.

**Chart geometry**

- [x] 3.4 Replace the `dayKey → x` scale with one keyed on the recorded instant; keep the linear time basis so empty days still read as gaps. Covers 1.3–1.5.
- [x] 3.5 Draw the date axis label once when `firstDay === lastDay`, centred under the plot; keep both labels otherwise. Covers 1.6–1.7.
- [x] 3.6 Capitalise the caption's direction clause at the render site, leaving the stored `direction` string lowercase for the SVG `<title>`.

**Session table**

- [x] 3.7 Carry `durationMs` and a per-track secondary count onto `SeriesPoint` in `lib/exec-function/sessions.ts` so the table can read them without re-deriving from `detail`.
- [x] 3.8 Add Date · Time · Duration columns ahead of the measure column, with Duration right-aligned and Date/Time left. Covers 1.8–1.9.
- [x] 3.9 **Decide the `Trials` column per track before building it.** It is only load-bearing on Corsi (8 trials vs 2 is what exposes the false start). A completed n-back is always 6 blocks and a completed check-in always 45 items, so on those two cards the column would be a constant. Proposal: Corsi shows `Trials`; the other tracks omit it and keep four columns. This follows from the approved design but is not visible in it — only the Corsi card was drawn.
- [x] 3.10 Keep every label and alignment identical to desktop below the `L` breakpoint. **Deviation from the design, deliberate:** the fixed widths (96 / 74 / 68 / 52 / 94) were a Figma necessity — a canvas frame cannot reflow, so the columns had to be sized by hand to prove they fit. An HTML `<table>` sizes columns to content and will not clip, so hardcoding those pixels would only risk clipping below 480px, which the design never tested. Implemented as a content-sized table with `whitespace-nowrap` on the cells; the design intent (same five columns, same labels, no clipping) holds, the arbitrary pixel values do not ship.

**Guard the reversed decision**

- [x] 3.11 Confirm no score-based filtering exists anywhere in the summary path, and leave a test that fails if one is reintroduced. Covers 1.1–1.2.

## 4. QA

> §1 and 4.1 are yours to confirm; everything they assert is covered by 4.2–4.3, but a passing test is not the same as looking at it.

- [ ] 4.1 Manual walkthrough on `/exec-function-assessment` against the two stored 8/25 Corsi sessions: two distinct points, one `8/25` axis label, chart flush to the card edge, and a table where the 9s/2-trial run is tellable from the 1m 5s/8-trial one. Repeat at 480px and confirm the columns and labels match 1024.
- [x] 4.2 Automated smoke in `tests/exec-function/`: time-based x separates same-day sessions; single-day series spans the plot; axis label count by day span; no session dropped by headline value; `SeriesPoint` carries duration and count.
- [x] 4.3 Resize check — covered automatically rather than by hand, since `npm run dev` is down (2.2). The test drives the `ResizeObserver` callback at 912 → 416 → 912 and asserts the viewBox tracks it, the height holds at 200, the plot span widens, and label type stays `text-[10px]`.
