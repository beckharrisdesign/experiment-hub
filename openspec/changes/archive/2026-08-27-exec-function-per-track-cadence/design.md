## Context

Two surfaces change. The **dashboard** (`/exec-function-assessment`) gains a run affordance on each track card and a marker in the session table; the **everyday check-in** gains a stated recall window. Both render under `.efa-theme`, the neutral dark palette restored in `app/exec-function-assessment/layout.tsx` — not the hub's greens.

The dashboard's shape is the thing being changed rather than its styling. Today it has exactly one entry point, the Today card, and that card becomes a tick as soon as anything is logged. `Track.href` is defined for all four tracks in `lib/exec-function/sessions.ts` and read nowhere, so each card already knows where its task lives and simply never offers it.

## Goals / Non-Goals

**Goals:**

- Make each track's availability readable in one vertical scan of the page.
- Keep the guard against re-running the same measure for a better score, narrowed to that measure.
- Make a later-in-the-day session visible in the data without discouraging it.
- Put the check-in's recall window where it is still on screen at item 40.

**Non-Goals:**

- Restyling the cards, the trend chart, or the theme.
- Changing the daily email, the assignment rotation, or scoring.
- Redesigning the check-in's item layout or its response scale.

## User flow / IA

This is the one real IA change: the page moves from a single entry point to one per track. The Today card keeps its position and its job — it names the day's suggested block — but stops being the only door. Once that block is done it says so and stops implying the day is over.

Each track card then carries its own state in a fixed slot directly under the measure name: a run control when the track is due, a line saying when it is next due when it is not. Reading down the page answers "what can I do now" without opening anything.

## Visual design / Figma

| Item | Value |
| ---- | ----- |
| Primary file URL | [exec-function-dashboard — per-track-cadence](https://www.figma.com/design/0dDY8WM89XSKAHVxPJHVfD) (`0dDY8WM89XSKAHVxPJHVfD`) |
| As-is frame(s) | Page `01 Current state`: [`Current · Dashboard 1024`](https://www.figma.com/design/0dDY8WM89XSKAHVxPJHVfD?node-id=1-14) (`1:14`), [`Current · Dashboard 480`](https://www.figma.com/design/0dDY8WM89XSKAHVxPJHVfD?node-id=5-43) (`5:43`), [`Current · Check-in 1024`](https://www.figma.com/design/0dDY8WM89XSKAHVxPJHVfD?node-id=4-2) (`4:2`) |
| Proposed frame(s) | Page `02 Proposed`: [`Proposed · Dashboard 1024`](https://www.figma.com/design/0dDY8WM89XSKAHVxPJHVfD?node-id=3-53) (`3:53`), [`Proposed · Dashboard 480`](https://www.figma.com/design/0dDY8WM89XSKAHVxPJHVfD?node-id=5-89) (`5:89`), [`Proposed · Check-in 1024`](https://www.figma.com/design/0dDY8WM89XSKAHVxPJHVfD?node-id=5-2) (`5:2`). Cloned from the as-is frames, so only the changed regions differ. |
| Libraries / version | **None subscribed** — `get_libraries` returns no organization libraries, so MVDS Core is not a team-library dependency here either. Card, Badge and Button are drawn locally as reference. Colour comes from a local **`efa tokens`** collection (9 variables) ported from the `.efa-theme` block in `app/globals.css`, oklch converted to sRGB; every fill and stroke is bound to it. Inter Regular / Medium / Semi Bold. |
| Code Connect | No mappings to add or update — no new components; the run control is an existing MVDS `Button` placed in a new slot. |
| Breakpoints | S · 480px mobile / L · 1024px desktop (BHD Content Types) — see [design-guidelines.mdc](../../../rules/design-guidelines.mdc). The check-in is drawn at 1024 only: its change is one line of copy and a header chip, neither of which has a breakpoint-specific layout. |
| Status | **Not approved.** Open for review. `tasks` stays blocked until approval is given. |

**File convention:** numbered pages; each proposal iteration is a **new** numbered page (`02.1 Proposed — <what changed>`, …), never frames edited on an already-reviewed page. The as-is frames carry a plainly-labelled "Annotation — not UI copy" block; nothing inside a card is commentary.

## Decisions

**Availability occupies the same slot on every card.** Directly under the measure name, above the trend. A run control when due, a "next due" line when not. The first draft put the button at the bottom of one card and the due-line at the bottom of another, which meant the answer to "what can I run" sat at a different height on every card and had to be hunted for.

**The Today card stops closing the day.** "That's today done" becomes "That's today's block done", and "Your next block arrives by email tomorrow" becomes a count of what else is available. The card was not merely hiding the other tasks, it was asserting there were none.

**The day's later session is marked inline, not given a column.** `10:02 AM (2nd)`, with the bracketed part muted, and one footnote under the table explaining it. A dedicated column would cost width at 480 for a value that is empty on most rows.

**The check-in states its window twice.** Once under the heading, where it is read before the first answer, and again as a quiet outlined `Past week` chip in every card header. Forty-five items across nine cards scrolls the heading away long before the end, and the whole reason for shortening the window is that recall over a long period is unreliable — a window you have to remember would reintroduce the problem it is there to solve.

**Mobile column widths were measured, not estimated.** Natural widths at 14px Inter: Date 82, Time 102, Duration 50, Trials 31, Total Score 65 — 330 of the 384 available, with the slack shared evenly. Note that Time is now the widest column, because `10:02 AM (2nd)` is longer than a date. **This supersedes the widths recorded in `exec-function-show-every-run` (96 / 74 / 68 / 52 / 94)**, which were estimated and put Date widest; the marker did not exist when they were chosen, and at those values it wrapped.

## Risks / Trade-offs

**The marker is binary where the confound is continuous.** `(2nd)` reads the same whether the previous task finished eight minutes or eight hours earlier, and only the first of those implies fatigue. The stored timestamps make the actual gap derivable, so this is a display simplification rather than a data loss — but do not read the flag as "this session was compromised". If the gap turns out to matter, the honest fix is to show it, not to reinterpret the flag.

**More doors mean more decisions.** The page currently answers "what now" with one button. Four cards each carrying state is more to read, and the day's suggested block has to stay distinguishable from the three other things you *could* do, or the rotation quietly stops meaning anything.

**The repeated window chip may read as noise.** Nine identical `Past week` chips is redundancy chosen deliberately against tidiness. If it grates in use, the fallback is stating it once and making that line sticky — which is more code for the same outcome, so it is not the starting point.
