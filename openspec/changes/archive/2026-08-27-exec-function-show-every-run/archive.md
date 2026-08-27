# Archive — exec-function-show-every-run

**Archived:** 2026-08-27 · **Created:** 2026-08-27 · **Tasks:** 26/27
**Outcome:** SHIPPED

The exec-function dashboard could not tell two sessions apart: same-day points collapsed to one x on the trend and the table showed only dates, so two real Corsi runs read as a duplicated row. Points now position by recorded instant, the chart spans its card at a fixed height, and rows carry time, duration and trials.

**Evidence:** [#406](https://github.com/beckharrisdesign/experiment-hub/pull/406), merged 2026-08-27 (`519297358`), 7/7 checks green. Live on labs.beckharrisdesign.com. `tests/exec-function/trend-display.test.tsx` (13 cases) covers the behaviour, including a guard that fails if score-based filtering returns.
**Left open:** 4.1, the visual walkthrough, is unverified — waived at archive on Katy's instruction. Every §1 outcome carries a receipt (live session rows or component test) but no one has looked at the rendered page. Two judgment calls are unexamined in use: a two-point series spans the full plot width, overstating a 75-second gap; and `SERIES_COLOR` is still a hardcoded `#3987e5`, the one colour on that surface not from a token.
