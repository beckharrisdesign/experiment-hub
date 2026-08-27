# Archive — exec-function-per-track-cadence

**Archived:** 2026-08-27 · **Created:** 2026-08-27 · **Tasks:** 26/28
**Outcome:** SHIPPED

Finishing any one measure removed every task from the dashboard for the rest of the day, holding collection to two sessions per track per week. Availability is now decided per track on its own interval — one day for the timed measures, seven for the check-in — a day's later session is marked rather than blocked, and the check-in states the week it asks about.

**Evidence:** [#407](https://github.com/beckharrisdesign/experiment-hub/pull/407), merged 2026-08-27, 7/7 checks green. Production serves the recall prompt and nine `Past week` chips. Against the four live session rows on 2026-08-27, `trackAvailability` returns corsi-backward and n-back due, corsi-forward held to 8/28, and the check-in held to 9/2. `Track.href`, dead since the suite shipped, is finally read.
**Left open:** 1.12 — a new check-in recording its window — cannot be observed until **2026-09-02**, because the seven-day hold this change introduced correctly refuses one until then; the code path is covered by tests but not the round trip through the database. 4.1, the visual walkthrough, is waived at archive on Katy's instruction. Two deliberate choices want use before judgement: nine repeated `Past week` chips, and whether the day's suggested block stays distinguishable now that four cards carry state.
