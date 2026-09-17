# design — keyword-explorer

## Context

The pull archive is classified per pull ([#498](https://github.com/beckharrisdesign/experiment-hub/pull/498)) but not per row. Today the only way to compare a keyword across queries is to open each CSV. This adds a corpus built by the existing ingest run and one table over it.

Round 01 was drawn at proposal time per the schema; round 02.1 carries the table rules. Numbering continues here rather than restarting.

## Goals / Non-Goals

**Goals:**

- One table over every keyword observation, sortable and filterable on each field.
- Re-pulls readable as a series — current versus superseded, with the delta visible.
- A surface that cannot imply the source data says more than it does.

**Non-Goals:**

- Charts, scoring, recommendations, or anything writing back to Etsy.
- Ingesting the non-keyword pulls (rankings, statements, ads) — different grains, their own surfaces.
- Pagination, in any form.
- Colour coding, until asked for. The schema is recorded; it is not applied.

## User flow / IA

New route at `/keyword-explorer`, in the hub's existing `Sidebar` + `main` layout.

1. Land on the full corpus, sorted by searches descending, latest capture current.
2. Reduce with the filter row — query, capture, status — or free-text on keyword.
3. Sort any column, including computed ones.
4. Read a row: what it scored, which queries surfaced it, when, and whether that observation still stands.

Reduction is sort and filter only. There is no second screen and no row detail view in this change.

## Visual design / Figma

| Item | Value |
| --- | --- |
| Primary file URL | <https://www.figma.com/design/pezlHOEjgdF1MUtYj7Jzbt> |
| As-is frame(s) | `01 Current state` → **`As-is · No hub surface`** (`23:17`) — the access path today: ten CSVs in `docs/pulls/`, and one file's raw contents showing the same keyword split across four of them. Reconstructed from the repo, not from a running page, because no page exists. |
| Proposed frame(s) | **`02.2 Proposed — light mode, content-width columns`** → **`Proposed · Desktop 1024`** (`27:14`) and **`Proposed · Mobile 480`** (`27:95`) — current. Superseded: `02.1` (table rules, dark), `02 Proposed` (round 01); see *Round history*. |
| Libraries / version | `MVDS Core` (`lk-d54f86bc…`), subscribed to the file · `@beckharrisdesign/mvds@0.3.0` in code. Tokens collection set to the **Light** mode explicitly on every frame. |
| Code Connect | No mappings to update — this change adds no new shared component. The table is route-local. |
| Breakpoints | S · 480px and L · 1024px, both drawn. Between them the table holds its behaviour; it does not reflow into cards. |
| Status | Rounds 01 and 02.1 built and token-bound. Awaiting approval of this document. |

**Round history.** Round 01 was built on `02 Proposed`, then edited in place across several passes before the page-per-iteration rule was applied — so `02 Proposed` is now empty and round 01's pre-table-rules state was not preserved. Recorded rather than reconstructed: rebuilding a history to satisfy a rule applied late is the churn that rule exists to prevent. From 02.1 onward each iteration takes its own page.

**Token binding is audited, not asserted.** A pass over the desktop frame reports every fill, stroke, spacing value, font size and radius that is not bound to an MVDS variable. It returns empty across 99 nodes. MVDS component internals are excluded — they own their own tokens.

## Decisions

**MVDS, not shadcn — and MVDS ships no Table.** `@beckharrisdesign/mvds@0.3.0` is already load-bearing (`globals.css` imports its stylesheet; several routes use its components). It exports `Badge, Button, Card*, Checkbox, Container, Field, Grid, Inline, Label, Layer, MediaFrame, RadioGroup, Section, Select*, Spacer, Stack, Switch, Textarea` — no Table. So the table is semantic `<table>` markup on MVDS tokens, with MVDS components around it: `Select` for filters, `Badge` for status. This is the one primitive the system does not ship, not a licence for bespoke chrome.

**The 12px floor is a layout constraint, not a styling detail.** The MVDS type ramp is 12 / 14 / 16 / 18 / 20 / 24. A dense table cannot be shrunk into the system — it has to be laid out at the system's smallest sizes, which widens columns and heightens rows. Every early sketch assumed 9–11px and had to be redrawn.

**Table rules, standing.** Cells nowrap. **One type size throughout the table, header row included** — not one size for the body and another for headers. Small columns take only the width their widest value needs; the keyword column absorbs everything left over. No colour coding until asked.

**Light mode.** The surface is Light, set explicitly on every frame — MVDS defaults to Light but an unset frame inherits rather than declares, and the mode has to be stated for the same reason the Dark version did.

**Column widths are measured, not guessed.** Each small column is sized to its own widest value; the gutter is a spacing token. In code this is `width: 1%` plus `white-space: nowrap` on the small columns, with the keyword cell taking the remainder — the browser does the measuring the same way.

**Nowrap survives mobile by scrolling, not reflowing.** At 480 the table scrolls horizontally with the keyword column pinned. Reflowing into stacked cards would break the nowrap rule and make scanning worse, which is the thing a table is for.

**Sort and filter logic.** Headless only — no styled table dependency, since that would reintroduce the chrome MVDS already owns. Hand-rolled is viable at this size; a headless library is acceptable because it adds no styling. Decided at `tasks` time against the row count.

**The corpus is generated, not queried live.** `scripts/ingest-pulls.py --apply` writes `data/keyword-corpus.json` alongside `index.json`. One command stays the whole ritual, the route ships a static import, and there is no runtime filesystem read to fail on Vercel.

## Risks / Trade-offs

**The filtered-subset rule is invisible on the surface, by request.** Katy cut the caveat banner — *"no the rule stays, I just don't need all the verbose slop."* The rule stays in `keyword-corpus`, where it forbids deriving disappearance from absence. The risk is a future reader treating a gap as a finding with nothing on screen to stop them. Accepted: the constraint is enforced in the data, which is stronger than a banner, and the pull notes carry the reasoning.

**No pagination means the row count is the ceiling.** 83 rows today. Virtualised scrolling holds to a few thousand; past that, the constraint gets revisited rather than quietly becoming pages.

**Generated data can go stale against the archive.** If a CSV lands without the ingest run, the table silently lags. Mitigated by the corpus being written by the same command that lands files — divergence requires bypassing the documented path.

**Mode is set explicitly per frame, and fallbacks must match it.** Paint fallbacks are stored under each bound variable, so a frame built for one mode and switched to another renders the wrong fallback wherever a binding does not resolve. This has now bitten in both directions — black-on-black in Dark, and it would be white-on-white in Light. Every mode switch rebuilds all fills; 112 were repainted moving 02.1 to 02.2.

**One type size means the header row too.** Round 02.1 claimed a single size and shipped 12px headers over 14px cells. Audited now rather than asserted: 43 desktop cells and 21 mobile cells all resolve to 14, with no unbound sizes.
