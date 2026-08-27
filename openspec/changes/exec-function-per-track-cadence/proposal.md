## Human anchor

> so did we fall back to only doing one of the available tests per day? Once I finish one all the others are not available. this seems like we're engineering super sparse data collection

> I don't remember this morning, much less this month. Is it rigorous enough to do it weekly?

> And yes I agree with flag vs forbid.

## Outcomes

- **Who:** Katy, building a baseline across four measures and wanting enough points on each to see a trend inside a month rather than a quarter.
- **Job:** Run any measure that is due today, without the suite deciding that finishing one thing means the day is over.
- **Done when:** Each track offers its own task when that track is due; running a second task in a day is possible and recorded as such; the check-in stays weekly and finally tells you what period it is asking about.
- **Not doing:** Removing the guard against re-running the same measure for a better score; making the check-in daily; changing scoring, the daily email, or the assignment rotation.

## Why

The dashboard currently offers exactly one task per day and, once anything is logged, offers nothing at all. `doneToday` is `todaysSessions.length > 0`, and any session replaces the whole card with a tick. The four `Track.href` values that would let each card offer its own task exist in `lib/exec-function/sessions.ts` and are read nowhere — the field is dead.

The result is two sessions per track per week (one for the check-in). Ten points on a Corsi condition takes five weeks. Gating per track instead lets the three timed measures run daily where the schedule allows, which is roughly three and a half times the data on the tracks that carry the trend.

The guard being removed is broader than its own reason. The comment defending it says a replay affordance "would let a bad run be re-rolled until it looked better" — an argument about re-running *the same* measure, which this change keeps. Running the n-back after Corsi cannot re-roll a Corsi score.

Fatigue carryover is the real cost: a second task ten minutes after the first is measured on a tireder brain. That is a reason to record the condition, not to prevent it — the same call the suite already makes with `timingReliable`, which flags a backgrounded run rather than refusing to save it.

### The check-in's recall window

Reviewing the cadence turned up a justification that is not true of the shipped product. The comment in `schedule.ts` defends the weekly cadence by saying the questionnaire "asks about the past month"; the README defends it differently, saying the items "ask about ongoing patterns". Neither describes the form, which states no recall window at all. `SelfReportForm.tsx` and its page render a title, forty-five items and a Never / Sometimes / Often scale, and nothing else. Every administration so far has been answered against whatever period came to mind.

Weekly is the right cadence, and a stated week window makes it more rigorous rather than less:

- Ratings gathered over long retrospective windows are reconstructed from a few salient incidents and current mood rather than averaged from experience. Here that reconstruction is performed by the executive function being measured, so a longer window measures recall as much as it measures function.
- A month window administered weekly would be the worst arrangement available: consecutive scores would share about three quarters of their referent period and flatten the trend by construction.
- These are original items on an instrument already labelled as not clinically validated, so no norm table is keyed to a particular window. The choice can be made on measurement grounds.

The cost of a shorter window is noise — one bad night moves it. That is paid off by averaging several weekly points, not by asking memory to do the smoothing. Changing now costs the comparability of exactly one stored session (2026-08-26, composite 86); changing in three months would cost a great deal more.

Daily is rejected: forty-five items every day is a compliance problem next to three other tasks in the rotation.

## What changes

- Each track card offers its own task when that track is due, using the `href` already defined for it. The assigned block keeps its place at the top as the day's suggestion.
- Availability is per track with a per-track minimum interval — one day for the timed measures, seven for the check-in, so weekly stays weekly without a special case in the UI.
- A session that is not the first of its day is recorded as such and shown as such, rather than being prevented.
- The check-in states its recall window above the items and repeats it per subscale, and the README and the `schedule.ts` comment are corrected to match what the form actually asks.

## Capabilities

### New Capabilities

- `exec-function-session-cadence`: when a track can be run again, how a day's second session is recorded, and what the dashboard offers once something is done.
- `exec-function-check-in-window`: the period the everyday check-in asks about, and where that is stated.

### Modified Capabilities

None.

## Impact

- `lib/exec-function/sessions.ts` — per-track minimum interval; `Track.href` finally read.
- `app/exec-function-assessment/HistoryDashboard.tsx` — per-track availability, the day's-second-session marker, and the run affordance on each card.
- `app/exec-function-assessment/components/useRecorder.ts` — mark a session that is not its day's first.
- `app/exec-function-assessment/self-report/SelfReportForm.tsx` — the recall window, stated.
- `lib/exec-function/schedule.ts` and `experiments/exec-function-assessment/README.md` — replace the two different, both-wrong cadence justifications with the window the form now states.
- `tests/exec-function/` — cadence and window coverage.

No database migration. The `detail` payload carries the new marker, so nothing in the table shape changes.

## Optional links

- Experiment directory: [experiments/exec-function-assessment/](../../../experiments/exec-function-assessment/)
- Preceding change: [exec-function-show-every-run](../exec-function-show-every-run/proposal.md) — shipped in [#406](https://github.com/beckharrisdesign/experiment-hub/pull/406)
