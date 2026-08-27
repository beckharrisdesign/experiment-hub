## Human anchor

> no, lets go back on that earlier decision - a zero run is still a run. I don't want the ui gaslighting me.

> the exec function dashboard is showing multiple entries for yesterday but none for today, and also doesn't have any history. lets investigate.

## Outcomes

- **Who:** Katy, taking one assessment block a day and reading her own trend on `/exec-function-assessment`.
- **Job:** See every session she actually took, told apart from each other, and judge for herself which ones mean anything.
- **Done when:** Two runs on the same day appear as two marks on the chart rather than one vertical line; every row in the session table carries the time it was taken and how long it ran; no session is filtered out of the trend or the summary figures.
- **Not doing:** Suppressing, discounting or relabelling any stored session; deleting rows; adding a discard button; changing scoring; touching the n-back or the check-in.

## Pivot

This began as a change that would have classified a zero-scoring Corsi run as a false start and dropped it from the trend and the headline figures. That was reversed at the specs gate — a zero run is still a run, and a dashboard that decides which of your sessions counted is doing the one thing a measurement tool must not. The superseded capability (`exec-function-false-starts`) and its three requirements are gone rather than parked, because they asserted the opposite of what this change now builds.

## Design iterations

Each review round is a new numbered Figma page, and the notes that produced it are recorded here in the founder's words.

**Iteration 1 — page `02 Proposed`.** The first pass: points positioned by recorded instant, one date label for a single-day series, and the session table widened to Date / Time / Duration / Trials / Total Score. Superseded, kept intact for comparison.

**Iteration 2 — page `02.1 Proposed — full-width chart + right-aligned numerics`.** Three notes at review:

> the chart itself should fill its parent container -- it looks broken when it doesn't have a clear reason for being this size

> Pure numeric data columns are almost always right aligned including their header labels. Mixed data like dates or time can stay left.

> This isn't a good content standard - text should be sentence case especially if its a label or piece of context on the chart itself.

What each produced: the chart drops its `max-w-xl` cap and spans the card at a fixed height; Duration, Trials and Total Score right-align with their headers while Date and Time stay left; the chart caption reads as sentence case.

**Iteration 3 — page `02.2 Proposed — matched columns at both breakpoints`.** One note at review:

> the columns shown between larger breakpoints and mobile breakpoints don't match - lets resolve that. Its ok to not show some of the columns in the smaller breakpoint, but they can't change names or labels like that.

Iteration 2 had collapsed the 480px table into a two-line row under an invented `Session` header, merging Date with Time and pushing Duration and Trials into a muted sub-line. Measuring first would have avoided it: the five columns need about 312px of the 416px available, so none of them had to go. The 480px table now carries the same five columns, the same labels and the same alignment as 1024, on narrower fixed widths.

**One of the four notes so far changes what the component does at any width, so it is a requirement, not a styling choice.** It was added to `specs/exec-function-trend-display/spec.md` as a fifth requirement — which amends an artifact that was already approved. That amendment has not been re-approved, and the specs artifact should be re-read alongside the design rather than treated as settled. The other two notes are design decisions and live only in `design.md`.

## Why

The dashboard is not losing data. All three stored sessions are present and correct: two Corsi backward runs on 8/25 and the everyday check-in on 8/26. Today's block was logged. The thin history is not a defect either — the suite shipped the evening of 8/24, so Corsi forward and the n-back have no sessions yet and correctly say so.

What is broken is that the display cannot tell two sessions apart.

The chart is indexed by calendar day, so both 8/25 runs land on the identical x position. That is the vertical spike on screen, and it is why both ends of the axis print 8/25. The session table shows only the date, so the two runs render as `2026-08-25` twice with no way to distinguish them — which is what read as a duplicate entry. Neither row is wrong; the page just refuses to say which is which.

The two runs are genuinely different events, and the stored detail already says so. The first ran 9.5 seconds over 2 trials and scored 0 — both span-2 sequences were reproduced in the order they were shown, which is the forward response given on the backward condition. The second ran 65 seconds over 8 trials, reached span 4 and scored 20. Everything needed to see that at a glance is already in the table; none of it reaches the screen.

So the fix is to surface more, not less. Put every session on the chart at the moment it happened, and give each row enough context — time, duration, trials administered — that the difference between a nine-second bail and a full administration is visible without opening the database. Then the judgment about what a run is worth stays where it belongs.

## What changes

- The trend chart positions points by the instant a session was recorded rather than by its calendar day, so same-day runs separate, a series confined to one day spreads across the plot, and real gaps between days stay proportional.
- The date axis prints one label when the first and last session share a day, instead of the same date at both ends.
- Every session stays in the trend, the session count, and the Latest / Best / Change figures. Nothing is filtered.
- Session table rows gain the local time, the duration, and the number of trials administered.

## Capabilities

### New Capabilities

- `exec-function-trend-display`: how a track's sessions are plotted and tabulated over time, including more than one session in a day.

### Modified Capabilities

None.

## Impact

- `app/exec-function-assessment/components/TrendChart.tsx` — x-axis basis and axis labels.
- `app/exec-function-assessment/HistoryDashboard.tsx` — session table columns.
- `lib/exec-function/sessions.ts` — carry duration and trial count onto the series points the table reads.
- `tests/exec-function/` — sessions coverage.

No database migration. No change to what is written on save. No change to scoring.

## Optional links

- Experiment directory: [experiments/exec-function-assessment/](../../../experiments/exec-function-assessment/)
