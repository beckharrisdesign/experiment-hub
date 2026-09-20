# keyword-captured-demand — design

## Context

`/keyword-explorer` ships a merged row over five sources. This change adds two more — Shop (captured search terms and the listing they reached) and Etsy Ads (targeted keywords with views, clicks, spend and ROAS) — taking the table to 33 columns and roughly 3,000px.

Round 01 drew that table and answered the header question. Round 02.1 replaced round 01's frame B, which had drawn a scroll *position* rather than a pattern, with the controls a deliberately-wide table actually needs.

**This document was written under a standing approval.** Katy, 2026-09-20: *"auto approve all the steps for this round so that I have a single PR waiting for me to review in a preview deployment when I get back."* Every gate in this change was self-approved against that instruction. Where a gate could not be satisfied, it is recorded as unmet rather than waived quietly — see the Figma table below.

## Goals / Non-Goals

**Goals:**

- One keyword row carrying estimated demand and captured demand together.
- Every signal visible at once; nothing hidden to save width.
- The reader can narrow, order and remove the join from the browser entirely.

**Non-Goals:**

- No attribution model. A term's visits are Etsy's number, never divided across listings.
- No reconciling Ads against listing stats where they disagree.
- No normalising captured terms.
- No column picker, no hide-band toggle, no responsive collapse — explicitly ruled out by the Big Join rule.

## User flow / IA

Unchanged entry, one screen. What changes inside it:

1. **Toolbar row 1** — keyword search, compound filter chips (each removable), a multi-key sort control, and Export CSV.
2. **Toolbar row 2** — jump-to-band chips, and a Freeze keyword toggle (off by default).
3. **The table** — seven source bands over 33 hugging columns, resting at its leftmost position, with an always-rendered horizontal scrollbar beneath the rows.

## Visual design / Figma

| Item | Value |
| --- | --- |
| Primary file URL | [`keyword-captured-demand`](https://www.figma.com/design/5zM3iearA5XFhHdjA0lV4D/keyword-captured-demand) — design file (a surface question: whether a deliberately-wide join stays readable) |
| As-is frame(s) | **Reference, not a fresh capture.** This change's as-is is what `keyword-explorer-unified-view` shipped, drawn as that change's *proposed* frame: [`02.1 Proposed — MVDS` → `Proposed · Desktop 1024`](https://www.figma.com/design/xYzJT8BDwMyTKhtH2qfOh6/keyword-explorer-unified-view?node-id=7-12) (`7:12`). Redrawing it here would reproduce a frame that already exists and is already verified against production. |
| Proposed frame(s) | Round 01 — `02 Proposed` (`1:2`) → `Round 01 — Big Join` (`1:3`): seven bands, 33 columns, 3,072px, plus a pinned-keyword study. **Round 02.1 (current)** — `02.1 Proposed — scroll tools` (`3:2`) → `Round 02.1 — scroll tools` (`3:3`): one plain table at rest, jump-to-band, always-visible scrollbar, Freeze as a toggle. |
| Libraries / version | **None — gate unmet, recorded rather than waived.** `rules/figma.mdc` requires proposed frames built on `MVDS Core`, and a newly created change file subscribes nothing. Enabling a library is a Figma UI action only Katy can perform, and she was away for the whole of this round. `get_libraries` on `5zM3iearA5XFhHdjA0lV4D` returns an empty `libraries_added_to_file` at time of writing. Both rounds are therefore drawn on raw `app/globals.css` tokens (`--color-background-primary` `#194b31`, `--color-text-primary` `#cff7d3`, `--color-accent-primary` `#14ae5c`), Fraunces headings / Inter body — visually faithful, but not MVDS instances. **A round on MVDS is owed before this ships.** |
| Code Connect | No mappings to update. `KeywordTable` is a hub component; the MVDS components it consumes (`Select`, `Badge`) are unchanged. |
| Breakpoints | S · 480px / L · 1024px (BHD Content Types). Behaviour is identical at both: the table scrolls horizontally and nothing reflows. 480 shows roughly the keyword plus one column, which is the accepted cost of the Big Join rule. |
| Status | Rounds 01 and 02.1 built; 02.1 is current. Self-approved under the standing instruction, with the MVDS gate open. |

### Round series

| Round | Page | What it settled |
| --- | --- | --- |
| 01 | `02 Proposed` (`1:3`) | Seven bands read at 33 columns; Ads and Shop are visibly different signals on adjacent rows. Its frame B is superseded. |
| 02.1 | `02.1 Proposed — scroll tools` (`3:3`) | Controls over choreography: table at rest, jump-to-band, persistent scrollbar, Freeze demoted to an off-by-default toggle. |

## Decisions

**1 — Freeze is off by default.** Round 01 treated a pinned keyword as what made the width survivable, and designed around it. Katy: *"Having a frozen column could be helpful."* Helpful, not structural — it costs 210px when you are reading the left-hand bands anyway, so the reader turns it on when they need it.

**2 — The scrollbar is a rendered element, not the browser's.** macOS overlay scrollbars fade out, so a 3,000px table looks exactly like a 1,000px one at rest and gives no signal that 20 more columns exist. The thumb's width is the only honest indicator of how much join is off-screen, so it is always drawn.

**3 — Jump scrolls, it does not filter.** Choosing a band moves it into view and leaves every other column present. A jump control that hid other bands would be a column picker wearing a different name, which the Big Join rule rules out.

**4 — Ads and Shop are separate bands with separate window labels.** Ads keyword data covers the last 30 days; Shop covers the year. The window is written into each band label rather than a footnote, because a reader who misses it will compute ratios across periods that do not correspond.

**5 — Conflicts are shown, not resolved.** Listing 4466080258 reports 2 orders / $12 in Ads and 1 sold / $6.00 in listing stats on the same day. Both render. Picking one, averaging them, or hiding the disagreement would destroy the only signal that the two sources count differently.

## Risks / Trade-offs

**The MVDS gate is open and this is the main risk.** Both rounds are token-faithful but component-free. If MVDS's `Select`, `Badge` or `Input` differ in height, padding or focus treatment from what is drawn, the toolbar rows will shift when the real components go in. The implementation uses real MVDS components regardless, so the risk is that the *drawing* is wrong, not the build.

**33 columns is unproven at 480px.** The Big Join rule accepts horizontal scroll, but a reader on a phone sees roughly the keyword and one column. No round has tested whether the jump control makes that bearable or merely survivable.

**Export size is unbounded.** The corpus is 2,293 rows and grows with every capture. A CSV of every column is fine today and is not obviously fine at ten times the size; no limit or streaming is built.

**Freeze and hug interact.** A frozen keyword column is positioned independently of the scrolling region, so its width is fixed at render. If a keyword longer than the frozen width appears, it truncates where an unfrozen column would have grown — the one place in this change where a value is not shown in full.
