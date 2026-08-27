## Context

The surface is a single **TrackCard** on `/exec-function-assessment` — one card per track, rendered by [HistoryDashboard.tsx](../../../app/exec-function-assessment/HistoryDashboard.tsx) with the chart in [TrendChart.tsx](../../../app/exec-function-assessment/components/TrendChart.tsx). The Corsi — backward card is the one carrying real data, so it is the card drawn in every frame, with its actual stored sessions rather than lorem values.

Two things about this surface are easy to get wrong from memory. It does **not** use the hub's greens: [layout.tsx](../../../app/exec-function-assessment/layout.tsx) wraps the subtree in `.efa-theme`, which restores MVDS's own neutral dark palette (`--background` `#0a0a0a`, `--card` `#171717`, `--foreground` `#fafafa`). And the chart is hand-drawn SVG, not a chart library — every coordinate in it is computed in that file.

## Goals / Non-Goals

**Goals:**

- Make two sessions recorded on the same day visibly distinct, on the chart and in the table.
- Keep every stored session on the chart and in the figures.
- Give each row enough context — time, duration, trials — to judge a run without opening the database.

**Non-Goals:**

- Restyling the card, the stat block, or the theme.
- Changing the empty state, the "today" card, or the streak badge.
- Touching the n-back or check-in cards, which render through the same components but are not what changed.

## User flow / IA

Unchanged. The card is read top-down — title and session count, the three figures, the trend, then the session table behind its existing `<details>` disclosure. Nothing moves, nothing is added to the page, and the disclosure stays closed by default. The frames show it open because that is the state under discussion.

## Visual design / Figma

| Item | Value |
| ---- | ----- |
| Primary file URL | [exec-function-dashboard — show-every-run](https://www.figma.com/design/ZkKB5cBRPtQ7SEHjtMlHMz) (`ZkKB5cBRPtQ7SEHjtMlHMz`) |
| As-is frame(s) | Page `01 Current state`: [`Current · Desktop 1024`](https://www.figma.com/design/ZkKB5cBRPtQ7SEHjtMlHMz?node-id=2-2) (`2:2`), [`Current · Mobile 480`](https://www.figma.com/design/ZkKB5cBRPtQ7SEHjtMlHMz?node-id=6-2) (`6:2`). Reconstructed from code — chart geometry computed with the real constants (`VIEW_W` 480, `PAD`, 15% value padding) against the two stored 8/25 sessions, so the collapsed vertical line and the duplicated `8/25` axis labels are the actual output, not an illustration of it. |
| Proposed frame(s) | **Current iteration —** page `02.2 Proposed — matched columns at both breakpoints`: [`Proposed · Desktop 1024`](https://www.figma.com/design/ZkKB5cBRPtQ7SEHjtMlHMz?node-id=14-3) (`14:3`), [`Proposed · Mobile 480`](https://www.figma.com/design/ZkKB5cBRPtQ7SEHjtMlHMz?node-id=14-51) (`14:51`). Superseded, kept intact for comparison: `02.1` (`9:3`, `9:51`) and `02` (`5:86`, `7:2`). Each iteration is cloned from the one before it, so the card chrome stays byte-identical and only the changed regions differ. |
| Libraries / version | **None subscribed.** `get_libraries` on this file returns no organization libraries — MVDS Core is not a team-library dependency, the same condition [stop-the-leaks/design.md](../archive/2026-07-20-stop-the-leaks/design.md) recorded. Card, Badge and the table are therefore drawn locally as reference, not as MVDS instances. Colour comes from a local **`efa tokens`** variable collection (9 variables) ported from the `.efa-theme` block in `app/globals.css`, with the oklch values converted to sRGB; every fill and stroke in all four frames is bound to it. Inter Regular / Medium / Semi Bold. |
| Code Connect | No mappings to add or update — no new components, and the changed elements are page-local markup rather than design-system components. |
| Breakpoints | S · 480px mobile / L · 1024px desktop (BHD Content Types) — see [design-guidelines.mdc](../../../rules/design-guidelines.mdc) |
| Status | **Approved 2026-08-27** at iteration `02.2`; `02.1` and `02` are superseded and kept for comparison. Approval covered the design, the fifth spec requirement added mid-design, and Total Score remaining title case as a protocol term. |

**File convention:** numbered pages, and each proposal iteration is a **new** numbered page (`02.1 Proposed — <what changed>`, `02.2`, …) — never frames appended to or edited on an already-reviewed proposal page. `00 Components` holds the `efa tokens` collection.

## Decisions

**The x-axis becomes continuous time, not a calendar-day bucket.** `TrendChart` currently maps `dayKey → x`, so `dayMax === dayMin` sends every same-day point to `PAD.left + PLOT_W / 2` — one position, hence the vertical line. Mapping the recorded instant instead separates same-day sessions and spreads a single-day series across the plot, while keeping distance proportional to elapsed time so an empty week still reads as a gap. The chart's stated intent — plot against the calendar so gaps are visible — is preserved; only the resolution changes.

**One date label when the series is one day long.** Printing `8/25` at both ends says nothing and reads like a range that isn't there. When `firstDay === lastDay` the label is drawn once, centred under the plot.

**The same five columns at both breakpoints.** Date · Time · Duration · Trials · Total Score, with identical labels and alignment at 1024 and at 480. Only the widths differ: equal fill columns at 912px of content, fixed widths (96 / 74 / 68 / 52 / 94, 8px gaps) at 416px.

An earlier iteration assumed 480px could not hold five columns and collapsed them into a two-line row under a `Session` header. Measured, the five need roughly 312px of the 416px available — the header labels, not the values, set the minimums (`Total Score` at 65px is the widest cell in its column, not `20`). Dropping columns at a smaller breakpoint stays acceptable; renaming or re-grouping them does not, because a label that exists at one width and not the other makes the two views hard to read as the same table.

**The chart fills its container; its height stops tracking its width.** `TrendChart` renders at `max-w-xl` (576px) inside a 912px card, leaving a dead band with no reason for its size. That cap exists only to stop the chart deepening as it widens — the SVG scales as a unit, so at 912px the fixed 480×168 viewBox would render 319px tall. Sizing the viewBox to the measured container width at a fixed 200px height satisfies both: the plot spans the card, and the band never deepens.

The useful side effect is that 1 SVG unit becomes 1 CSS pixel. Today a 10px axis label renders at ~12px on desktop and ~8.7px at 480px; at 1:1 it is 10px at every width, and point radii stop drifting too.

**Numeric columns are right-aligned, headers included.** Duration, Trials and Total Score are magnitudes read by comparison, so their digits line up on the right along with their labels. Date and Time stay left — they are mixed strings, not quantities. Duration is the debatable one: it carries unit letters (`1m 5s`, `9s`) rather than being bare digits, but the job of the column is comparing lengths, and right-aligning makes `9s` sit under `1m 5s` where the difference is obvious.

**Chart text is sentence case.** The caption renders as `Latest point ringed. {direction}.`, which produces "Latest point ringed. higher is better." — a sentence opening in lowercase. The direction string stays lowercase as stored, because the SVG `<title>` uses it mid-sentence after a comma where lowercase is correct; the caption capitalizes at the render site instead.

One deliberate exception: **Total Score** stays title case. It is a named score from the Kessels protocol, alongside Block Span and Peak N, and it is spelled that way in the experiment README and in the scoring module. Treating it as a proper term rather than a UI label is the reason it is not "Total score".

**The figures are untouched.** Latest 20, Best 20, `+20 vs. previous (better)`, `2 sessions` — all correct once every run counts, so the stat block is identical in the as-is and proposed frames. It is drawn in both so the comparison shows what does *not* move.

## Risks / Trade-offs

**Two points always land at the plot edges.** The 8/25 sessions are 75 seconds apart, but with only two points in the series a linear time axis normalises them to the full width — the same as any two-point series. Widening the chart to 858px of plot makes that separation look larger still. The mitigation is already in the change: the row beneath now carries the actual times, so the axis is no longer the only source of that fact. This resolves itself as more sessions accumulate.

**Full-width means measuring the container.** A viewBox sized to the container needs the rendered width, which a server render does not have. The chart needs a sensible first-paint width and a re-measure on resize; getting that wrong shows up as a flash or a chart that never resizes. This is the one part of the change with real implementation risk, and it is the reason the tasks should cover a resize case explicitly.

**Known gap, not fixed here.** `SERIES_COLOR` is a hardcoded `#3987e5` in `TrendChart.tsx` — it is in neither the hub palette nor `.efa-theme`, and it is the only colour on this surface not coming from a token. The Figma file carries it as a `series` variable so the frames are honest about what is drawn, but tokenising it in code is outside these requirements. Worth its own small change.
