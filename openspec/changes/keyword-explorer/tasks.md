# Tasks: keyword-explorer

## 1. User outcomes (from spec scenarios)

Twelve scenarios across the two capabilities, in spec order. Each is checked by doing it, not by reading the diff.

**`keyword-corpus`**

- [x] 1.1 Katy runs one command and every archived keyword CSV is in the table — the ten 2026-09-17 exports' **83 data rows, represented as 71 keyword rows carrying 83 query hits** (12 of the 83 are the same keyword seen under a second query, which is the row grain working, not loss).
- [ ] 1.2 *(generator verified against a synthetic second capture in 4.2; awaiting a real drop)* Katy drops a new export into `docs/pulls/`, re-runs the same command, and its rows appear with no file edited by hand.
- [x] 1.3 Katy reads `embroidery font` and sees its four per-query tag-occurrence counts — 80, 81, 12 and 6 — not one merged number.
- [x] 1.4 Katy sees searches, competition and KD once on the row, not repeated once per query that surfaced it.
- [x] 1.5 Katy re-exports a query months later and can read both captures: the new one current, the previous marked superseded.
- [x] 1.6 Katy finds a keyword missing from a later pull and the table says *seen in N of M captures* — never that demand fell.

**`keyword-explorer`**

- [ ] 1.7 *(implemented; awaiting her interactive check)* Katy sorts or filters on any column, computed columns included, and the table reorders or narrows on that field.
- [x] 1.8 Katy scrolls one surface past a screenful of rows and finds no page controls.
- [ ] 1.9 *(implemented; column sits beyond the fold at 1024 — verify by scrolling)* Katy tells current rows from superseded ones at a glance, with each row's capture date legible.
- [x] 1.10 Katy sees no cell wrapped to a second line, and one type size across the whole table, header row included.
- [x] 1.11 Katy widens the window and the surplus goes to the keyword column while the others hold their width.
- [x] 1.12 Katy sees no colour band on any value — the schema is recorded in the proposal, not applied.

## 2. Prototype shell

**No `experiments/<slug>/prototype/`.** This is hub platform work at a root route, per `rules/openspec-workflow.mdc` § Shared hub behavior and the route decision in `design.md`. The prototype-builder path does not apply; the shell is the real route from the first commit.

- [x] 2.1 Add `app/keyword-explorer/page.tsx` rendering `Header` + `Sidebar` + `main` + `Footer`, matching `app/changes/page.tsx` as the nearest structural precedent.
- [x] 2.2 Commit a hand-written `data/keyword-corpus.json` holding three rows, so the page renders before the generator exists and §3 has something to diff against.
- [x] 2.3 Confirm the page loads: `pnpm dev`, then `/keyword-explorer`. **Runs only from Katy's own terminal** — `dev` wraps `next dev` in `op run --env-file=.env.local`, and agent shells fail 1Password closed (`CLAUDE.md` § Secrets).

## 3. Implementation

**Corpus generation** — extends `scripts/ingest-pulls.py`, which already lands files and writes `index.json`. One command stays the whole ritual.

- [x] 3.1 Parse each keyword CSV in `docs/pulls/` into rows at the keyword × capture grain, carrying searches, competition and KD once per row. *(1.1, 1.4)*
- [x] 3.2 Attach the queries that surfaced each keyword as a list, each with its own tag-occurrence count — never averaged, summed or picked. *(1.3)*
- [x] 3.3 Build the capture series: newest observation per keyword is `current`, earlier ones carry `superseded_by`. Reuse the series logic already in `build_manifest()` rather than writing a second one. *(1.5)*
- [x] 3.4 Compute coverage as *seen in N of M captures*. **No field may express decline, removal or zero from absence** — this is the constraint the whole capability exists to hold. *(1.6)*
- [x] 3.5 Write `data/keyword-corpus.json` inside the existing `--apply` path, beside `index.json`, and regenerate it there. *(1.2)*

**The surface** — semantic `<table>` on MVDS tokens, MVDS components around it (`Select` for filters, `Badge` for status). MVDS ships no Table; that is the one primitive missing, not a licence for bespoke chrome.

- [x] 3.6 Render the corpus as a static import — no runtime filesystem read, so nothing to fail on Vercel.
- [x] 3.7 Headless sort and filter over every field, computed columns included. Decide hand-rolled vs. a headless library against the row count at build time; either way it adds no styling. *(1.7)*
- [x] 3.8 One scrolling surface, no pagination, no "load more", no virtualisation yet. *(1.8)*
- [x] 3.9 Per-row capture date and a status `Badge`; superseded rows marked. *(1.9)*
- [x] 3.10 Apply the table rules: `white-space: nowrap` on every cell, `Type/Small` throughout including the header row, `width: 1%` on the measured columns so the keyword cell takes the remainder, and no colour banding. *(1.10, 1.11, 1.12)*
- [ ] 3.11 **BLOCKED — not this change's to fix.** At 480px the hub's `Sidebar` is a fixed 256px element and `main` carries `ml-64`, so over half the viewport is nav and the content is pushed off-screen before the table is reached. `/prototypes` and `/documentation` use the identical pattern, so this is hub-wide and pre-existing. The table's own mobile behaviour (horizontal scroll, no card reflow) is implemented and cannot be verified until the shell is responsive. Katy's call: fix `Sidebar` hub-wide as its own change, or accept desktop-only.

**Registration** — the two places a root route has to be declared, both named in `design.md`.

- [x] 3.12 Widen `ContentType` (`types/index.ts:114`) and add the `Sidebar` nav entry. A route reachable only by typing the URL is one that gets rebuilt in six months by someone who forgot it existed.
- [x] 3.13 Add the `STATIC_ROUTES` entry in `scripts/site-map/routes.js`, or the Figma site map silently omits the page.

## 4. QA

- [ ] 4.1 **Manual walkthrough, in Katy's terminal:** `python3 scripts/ingest-pulls.py --apply` → `pnpm dev` → `/keyword-explorer`. Walk §1.1–1.12 in order against the real page. Then drop a fresh CSV into `docs/pulls/`, re-run ingest, and confirm 1.2 and 1.5 on data that did not exist when the code was written.
- [x] 4.2 **Automated smoke** (`vitest run`): the generator produces **71 rows and 83 query hits** from the ten archived CSVs, and the hit count equals the raw CSV data-row count; `embroidery font` carries four query entries with counts 80/81/12/6; a keyword-scoped field appears once per row; a synthetic second capture marks the earlier rows superseded and leaves both readable; and **no output field ever reads zero or negative for a keyword merely absent from a later capture**.
- [x] 4.3 **Screenshot the built page at 1024 and 480** and compare against Figma `02.3` — every earlier round's real defects (black-on-black text, collided headers, a clipped caveat, placeholder instance text) were caught by looking, not by reading.
- [x] 4.4 `pnpm lint` and `pnpm test` clean before the PR.
