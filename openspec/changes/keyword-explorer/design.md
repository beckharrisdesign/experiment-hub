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
| Proposed frame(s) | `02.1 Proposed — table rules` → **`Proposed · Desktop 1024 — table rules`** (`11:20`) and **`Proposed · Mobile 480`** (`23:52`). Round 01 lived on `02 Proposed`; see *Round history* below. |
| Libraries / version | `MVDS Core` (`lk-d54f86bc…`), subscribed to the file · `@beckharrisdesign/mvds@0.3.0` in code. Tokens collection set to the **Dark** mode explicitly on every frame. |
| Code Connect | No mappings to update — this change adds no new shared component. The table is route-local. |
| Breakpoints | S · 480px and L · 1024px, both drawn. Between them the table holds its behaviour; it does not reflow into cards. |
| Status | Rounds 01 and 02.1 built and token-bound. Awaiting approval of this document. |

**Round history.** Round 01 was built on `02 Proposed`, then edited in place across several passes before the page-per-iteration rule was applied — so `02 Proposed` is now empty and round 01's pre-table-rules state was not preserved. Recorded rather than reconstructed: rebuilding a history to satisfy a rule applied late is the churn that rule exists to prevent. From 02.1 onward each iteration takes its own page.

**Token binding is audited, not asserted.** A pass over the desktop frame reports every fill, stroke, spacing value, font size and radius that is not bound to an MVDS variable. It returns empty across 99 nodes. MVDS component internals are excluded — they own their own tokens.

## Decisions

**MVDS, not shadcn — and MVDS ships no Table.** `@beckharrisdesign/mvds@0.3.0` is already load-bearing (`globals.css` imports its stylesheet; several routes use its components). It exports `Badge, Button, Card*, Checkbox, Container, Field, Grid, Inline, Label, Layer, MediaFrame, RadioGroup, Section, Select*, Spacer, Stack, Switch, Textarea` — no Table. So the table is semantic `<table>` markup on MVDS tokens, with MVDS components around it: `Select` for filters, `Badge` for status. This is the one primitive the system does not ship, not a licence for bespoke chrome.

**The 12px floor is a layout constraint, not a styling detail.** The MVDS type ramp is 12 / 14 / 16 / 18 / 20 / 24. A dense table cannot be shrunk into the system — it has to be laid out at the system's smallest sizes, which widens columns and heightens rows. Every early sketch assumed 9–11px and had to be redrawn.

**Table rules, standing.** Cells nowrap. One type size throughout the body. The keyword column absorbs remaining width; every other column is fixed. No colour coding until asked.

**Nowrap survives mobile by scrolling, not reflowing.** At 480 the table scrolls horizontally with the keyword column pinned. Reflowing into stacked cards would break the nowrap rule and make scanning worse, which is the thing a table is for.

**Sort and filter logic.** Headless only — no styled table dependency, since that would reintroduce the chrome MVDS already owns. Hand-rolled is viable at this size; a headless library is acceptable because it adds no styling. Decided at `tasks` time against the row count.

**The corpus is generated, not queried live.** `scripts/ingest-pulls.py --apply` writes `data/keyword-corpus.json` alongside `index.json`. One command stays the whole ritual, the route ships a static import, and there is no runtime filesystem read to fail on Vercel.

## Risks / Trade-offs

**The filtered-subset rule is invisible on the surface, by request.** Katy cut the caveat banner — *"no the rule stays, I just don't need all the verbose slop."* The rule stays in `keyword-corpus`, where it forbids deriving disappearance from absence. The risk is a future reader treating a gap as a finding with nothing on screen to stop them. Accepted: the constraint is enforced in the data, which is stronger than a banner, and the pull notes carry the reasoning.

**No pagination means the row count is the ceiling.** 83 rows today. Virtualised scrolling holds to a few thousand; past that, the constraint gets revisited rather than quietly becoming pages.

**Generated data can go stale against the archive.** If a CSV lands without the ingest run, the table silently lags. Mitigated by the corpus being written by the same command that lands files — divergence requires bypassing the documented path.

**Dark mode is set explicitly per frame.** MVDS's default mode is Light, so a frame that forgets the override renders light tokens. This bit once already: paint fallbacks stored black under bound variables, and text rendered black-on-black wherever a binding did not resolve. Fallbacks are now each variable's own Dark value.
