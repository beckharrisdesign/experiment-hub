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

**Root route: `labs.beckharrisdesign.com/keyword-explorer`**, in the hub's existing `Sidebar` + `main` layout. Top level, not nested under `/experiments/<slug>` — Katy, 2026-09-18: *"lets surface it at root … and it might end up an experiment but not today."*

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
| Proposed frame(s) | **`02.3 Proposed — MVDS text styles`** → **`Proposed · Desktop 1024`** (`27:14`) and **`Proposed · Mobile 480`** (`27:95`) — current. Earlier rounds intact for comparison: `02.2` (light mode, content-width columns), `02.1` (table rules, dark), `02 Proposed` (round 01). |
| Libraries / version | `MVDS Core` (`lk-d54f86bc…`), subscribed to the file · `@beckharrisdesign/mvds@0.3.0` in code. Every frame sets its Tokens mode **explicitly** rather than inheriting — `02.1` in **Dark**, `02.2` and `02.3` in **Light**. The mode is declared per frame; it is not one mode across the series. |
| Code Connect | No mappings to update — this change adds no new shared component. The table is route-local. |
| Breakpoints | S · 480px and L · 1024px, both drawn. Between them the table holds its behaviour; it does not reflow into cards. |
| Status | Rounds `02.1`, `02.2` and `02.3` built and token-bound; `02.3` is current and is the frame to review. `02 Proposed` (round 01) is empty and unrecoverable — recorded below, not rebuilt. Document approved 2026-09-18. |

**Round history.**

| Page | Change |
|---|---|
| `02 Proposed` | Round 01 — **empty**; see below |
| `02.1 Proposed — table rules` | nowrap, one body size, no colour coding, keyword absorbs width (dark) |
| `02.2 Proposed — light mode, content-width columns` | Light mode, small columns measured to content, token gutter |
| `02.3 Proposed — MVDS text styles` | published `Type/*` styles replace hand-set fonts — **current** |

Two rounds were edited in place before the page-per-iteration rule took hold, and the fix differed each time. Round 01's pre-table-rules state was **not recoverable**, so `02 Proposed` stands empty and is recorded rather than reconstructed. Round 02.2 **was** recoverable — its steps are deterministic — so it was rebuilt from 02.1 and the text styles moved to their own page. Verified afterwards that no style leaked backwards: the six styled nodes remaining on 02.2 are all MVDS instance internals, which own their own styles.

One change per page, from here.

**Token binding is audited, not asserted.** A pass reports every fill, stroke, spacing value, font size and radius not bound to an MVDS variable, and every text node not carrying a published MVDS text style. Both return empty. MVDS component internals are excluded — they own their own tokens and styles.

## Decisions

**MVDS, not shadcn — and MVDS ships no Table.** `@beckharrisdesign/mvds@0.3.0` is already load-bearing (`globals.css` imports its stylesheet; several routes use its components). It exports `Badge, Button, Card*, Checkbox, Container, Field, Grid, Inline, Label, Layer, MediaFrame, RadioGroup, Section, Select*, Spacer, Stack, Switch, Textarea` — no Table. So the table is semantic `<table>` markup on MVDS tokens, with MVDS components around it: `Select` for filters, `Badge` for status. This is the one primitive the system does not ship, not a licence for bespoke chrome.

**Type comes from MVDS published text styles, not from size variables.** Binding `fontSize` to `Typography/text-small-size` sets a number and leaves family, weight, line-height and tracking hand-set — which is what the earlier rounds did, and it is not the same as using the system. The frames now carry the published styles: `Type/Heading 3` (24/1.2/600/-0.01em), `Type/Caption` (12/1.4/500/0.01em) for labels, `Type/Small` (14/1.5/400) for every table cell. Audited: 45 desktop and 27 mobile text nodes, **zero unstyled**.

**The 12px floor is a layout constraint, not a styling detail.** The ramp is Caption 12 / Small 14 / Body 16 / Body Large 18 / H4 20 / H3 24. A dense table cannot be shrunk into the system — it is laid out at the system's smallest sizes, which widens columns and heightens rows. Every early sketch assumed 9–11px and had to be redrawn.

**MVDS has no 14px emphasis style, and the table wants one.** `Type/Small` is 400 only; the next weight up is `Type/Caption` at 500, but that is 12px and breaks the one-size rule. So the keyword column and the header row are now regular weight — visible in round 02.2, where the keyword lost the bold it had at 02.1. Three ways out: accept flat weight, use colour or a rule for hierarchy instead, or **add a `Type/Small Strong` to MVDS**. The third is the one that fixes it for every future table, and it is a change to the design system rather than to this surface. Flagged here rather than worked around with a local override, which would put us straight back to not using the system.

**A root route today, an experiment later if it earns it.** `/keyword-explorer` sits at the top level beside `/prototypes` and `/documentation`, not under `/experiments/<slug>`. It is a tool Katy uses while writing listings, not a thing being tested — and `rules/openspec-workflow.mdc` already routes it as hub platform work. Three consequences worth naming before `tasks`:

- **The sidebar's `navItems` is keyed by `ContentType`** (`"experiments" | "prototypes" | "documentation"`, `types/index.ts:114`). A linked nav entry means widening that union; the alternative is shipping the route unlinked and reachable by URL only. **Decided: widen it.** A surface nobody can find from the nav is a surface that gets rebuilt in six months by someone who forgot it exists.
- **`scripts/site-map/routes.js` holds `STATIC_ROUTES`** and the route needs an entry there, or the Figma site map silently omits it.
- **Promotion stays cheap.** If it later becomes an experiment, what moves is the route and a `data/experiments.json` entry — the corpus, the ingest step and the table component are untouched, because none of them know where they are mounted. Nothing here is built to make that migration easier; it is simply not made harder.

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
