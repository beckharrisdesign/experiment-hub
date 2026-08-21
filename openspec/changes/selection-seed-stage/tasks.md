## 1. User outcomes (from spec scenarios)

- [ ] 1.1 An idea is captured as a seed — a row exists at `Status = Ideation`
      with Hypothesis, Why this matters and Who it's for filled, and nothing else
      required
- [ ] 1.2 A seed records the moment rather than a category — its Why this matters
      names something that happened, in Katy's own first-person prose
- [ ] 1.3 A seed is promoted out of Ideation — the incident test passes, a score
      shape is named over `Score:PI`/`Score:SI`/`Score:BI`, and the shape is what
      gets recorded rather than the total
- [ ] 1.4 A seed that names no moment is held, not rejected — it stays at
      Ideation rather than being deleted or marked abandoned
- [ ] 1.5 A seed stays off the public catalog — with `Public` unchecked it is
      absent from the experiment list and its detail route 404s
- [ ] 1.6 A seed is visible to Katy in edit mode — listed carrying hub status
      `Active`, per the `STATUS_MAP` collapse
- [ ] 1.7 The seed stage is abandoned — deleting `docs/SELECTION.md` and this
      change directory restores the prior state with no property or migration to
      unwind

## 2. Prototype shell

- [x] 2.1 N/A — no prototype. This change ships a convention and its artifacts;
      there is no app to run, no port to assign, and nothing to register in
      `data/prototypes.json`.

## 3. Implementation

- [x] 3.1 Write `docs/SELECTION.md` — the seed stage, the two soft gates, what is
      deliberately not decided, and open questions with a revisit point
- [x] 3.2 Record the Ideation → `Active` mapping and the private-by-default gate
      in `design.md`, with file and line references, so the consequence is not
      rediscovered as a bug
- [x] 3.3 Add the private-by-default note to `docs/SELECTION.md` — the doc
      currently describes the seed fields but not the `Public` checkbox
      expectation
- [ ] 3.4 Write the first real seed into Notion at `Status = Ideation`, `Public`
      unchecked — this is what turns 1.1 from a claim into a fact

## 4. QA

- [ ] 4.1 Manual walkthrough — create a seed in Notion, confirm it is absent from
      the public catalog and that its slug 404s while signed out, then confirm it
      appears in admin edit mode as `Active`
- [ ] 4.2 Automated smoke — none added. There is no code path to test; the
      behaviour under test belongs to `lib/notion-experiments.ts`, which this
      change does not touch. The existing `Public` gate is already covered by the
      hub's own suite.
