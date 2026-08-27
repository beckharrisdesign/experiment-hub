## 1. User outcomes (from spec scenarios)

- [x] 1.1 A due track offers its task  
      ↳ verified 2026-08-27 · live data — corsi-backward and n-back both due on 2026-08-27
- [x] 1.2 A track that is not due offers nothing  
      ↳ verified 2026-08-27 · live data — corsi-forward not due, nextDue 2026-08-28
- [x] 1.3 The assigned block keeps its place  
      ↳ verified 2026-08-27 · production HTML — /exec-function-assessment serves 'Today — Corsi — forward' with its Start control
- [x] 1.4 Finishing one track leaves the others available  
      ↳ verified 2026-08-27 · live data — running corsi-forward today left the other three tracks' availability untouched
- [x] 1.5 The same measure cannot be re-run for a better score  
      ↳ verified 2026-08-27 · live data — corsi-forward refuses until 2026-08-28
- [x] 1.6 The check-in holds to a week  
      ↳ verified 2026-08-27 · live data — the check-in refuses until 2026-09-02, 7 days after the 8/26 session
- [x] 1.7 A later session is saved  
      ↳ verified 2026-08-27 · live data — the 15:02 session on 8/25 is stored alongside the 15:00 one
- [x] 1.8 A later session is marked  
      ↳ verified 2026-08-27 · live data — dayOrdinals gives the 15:02 session ordinal 2
- [x] 1.9 The first session of a day is not marked  
      ↳ verified 2026-08-27 · live data — the 15:00, 8/26 and 8/27 sessions all sit at ordinal 1
- [x] 1.10 The window is stated with the items  
      ↳ verified 2026-08-27 · production HTML — the prompt renders once and 'Past week' appears 9 times against 9 subscale cards
- [x] 1.11 Documentation matches the form  
      ↳ verified 2026-08-27 · repo — README and the schedule.ts comment now both state the past week
- [ ] 1.12 A new check-in records its window
- [x] 1.13 Earlier check-ins remain identifiable  
      ↳ verified 2026-08-27 · live DB — detail->>'recallWindow' is null on the 2026-08-26 check-in

## 2. Prototype shell

- [x] 2.1 **N/A — no prototype directory.** The suite ships as hub routes plus pure modules in `lib/exec-function/`. Work happens in place.
- [x] 2.2 Dev command is `npm run dev` (npm, per root `package.json`). It was down on a stale `op run` vault reference during the previous change; if that is still true, verification falls to the PR preview deploy again.

## 3. Implementation

**Cadence**

- [x] 3.1 Add `minIntervalDays` to `Track` in `lib/exec-function/sessions.ts` — 1 for the three timed measures, 7 for the everyday check-in.
- [x] 3.2 Add a pure `trackAvailability(track, sessions, today)` returning due / not-due plus the next due day, computed from the track's most recent session. Covers 1.4–1.6.
- [x] 3.3 Read `Track.href` at last: each card renders a run control when due, and a "next due" line when not, in a fixed slot under the measure name. Covers 1.1–1.2.
- [x] 3.4 Rewrite the Today card's done state so it names what was logged and what remains available, and keeps the day's assignment visible as the suggestion rather than the only route. Covers 1.3.

**The day's later session**

- [x] 3.5 Derive the day ordinal at read time from the stored timestamps, counting across every track, rather than writing a flag on save. **Approved 2026-08-27**, and the scenario "A later session is marked" was amended to match — it now says the rendered row is marked, not the stored session.
- [x] 3.6 Render the marker inline in the Time cell (`10:02 AM (2nd)`, bracket muted) with one footnote under the table. Covers 1.7–1.9.

**Check-in window**

- [x] 3.7 State the window under the heading and repeat it as an outlined `Past week` chip in each subscale card header. Covers 1.10.
- [x] 3.8 Record the window in force on each stored check-in (`recallWindow: "week"` in the session detail; absent means none was declared). Unlike the day-ordinal above this is genuinely not derivable — a timestamp does not say what the form asked. Covers 1.12–1.13.
- [x] 3.9 Replace the cadence justifications in `experiments/exec-function-assessment/README.md` ("ongoing patterns") and the comment in `lib/exec-function/schedule.ts` ("the past month") — two different claims, neither matching a form that stated no window. Covers 1.11.
- [x] 3.10 Kept the content-sized table from the previous change rather than hardcoding the measured widths, for the same reason: an HTML table sizes columns to content and will not clip, so fixed pixels would only risk clipping below 480px. `whitespace-nowrap` on the cells keeps `10:02 AM (2nd)` on one line. The measured numbers stay recorded in `design.md` as the evidence that five columns fit.

## 4. QA

> §1 and 4.1 are yours to confirm.

- [ ] 4.1 Manual walkthrough: with today's block done, confirm every other track still offers itself and the completed one says when it is next due; confirm the check-in refuses inside seven days; confirm the window is on screen at item 40; confirm the marker at 480 does not wrap.
- [x] 4.2 Automated smoke in `tests/exec-function/`: availability per track and per interval; the check-in's seven-day hold; the day-ordinal marker including the first-session case; the recorded window and its absence on the 2026-08-26 session.
- [x] 4.3 Guard that the assigned block remains reachable when it is also the only due track, so the Today card and the track card do not both disappear.
