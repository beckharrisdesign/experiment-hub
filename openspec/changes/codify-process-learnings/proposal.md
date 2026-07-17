# codify-process-learnings

## Human anchor

> "Look at my existing agents and call upon the ones that can review my process today and either propose improvements or document some of the learnings into my working hub scaffold."

(Katy, 2026-07-17, end of the session that produced the five labs-review changes in PR #297. This change captures that session's reusable process learnings, surfaced by retrospective passes from @design-advisor and a @prd-writer/@experiment-creator workflow review.)

## Outcomes

- **Who:** Katy and every future agent session running the OpenSpec workflow — the learnings should apply automatically, not depend on remembering them.
- **Job:** Fold today's proven process patterns into the governing `rules/` and `skills/` so the next change inherits them.
- **Done when:** the seven edits under "What changes" are applied to their named files and read cleanly in context.
- **Not doing:** Applying the edits in this proposal turn (lite gate — proposal only, Katy approves before specs/tasks); the labs-site changes themselves (PR #297); the `ExperimentTypeBadge` code bug (flagged separately as its own task — it's a code fix, not a scaffold doc).

## Why

Today's session ran an outside-investor critique into five OpenSpec proposals and took the first (`stop-the-leaks`) through a full artifact chain, a three-agent parallel review, and a Figma design loop. Several patterns earned their keep by catching real defects or friction — but they currently live only in this session's memory. Codifying them where the workflow is governed means the next change benefits without anyone re-deriving them.

The two retrospective agents both recommended shipping these as a scaffold change (not a standalone retro doc that decays unread), since the edits touch the exact files the process governs and route through the normal approval gate.

## What changes

Seven edits, grouped by target file. Each is drafted as ready-to-place text in the reviewers' reports; apply-time work is inserting them in the right section.

**`skills/openspec-propose.md`** (lite gate, step 4):
1. **Multi-agent proposal review (recommended for lite):** after drafting `proposal.md` and before specs, run strategist/@experiment-creator + @design-advisor + @prd-writer in parallel; hold the gate until *all* return; fold their edits into one revised proposal. This is where scope-splits and untestable criteria surface cheapest. Add a guardrail cross-reference to the backfill rule below.

**`rules/principles.mdc`** (solo-founder practices):
2. **Backfill-then-flip.** Any change that tightens a default — private-by-default, a new required field, a new gate — MUST carry a gating pre-deploy task that backfills existing rows to the intended state *before* the enforcing deploy. Enforcement without backfill silently blanks live data. (Caught today: private-by-default would have hidden the entire live portfolio.)

**`rules/openspec-workflow.mdc`:**
3. **Durable citations** (new short section): cite code by symbol, stable anchor comment, or quoted snippet — never by line number. Line numbers rot on the next edit and misled a Copilot review today.
4. **Split test** (under "When to use what"): if a candidate requirement introduces its own new capability, its own data-model change, or could ship and be valued independently, it's its own change. (Today "synthetic history" split out of `stop-the-leaks` into `tell-the-story` on this test.)

**`rules/figma.mdc`:**
5. **Redesign workflow (current-state-first):** reconstruct the current screen from code first, on a `01 Current state` page, as before-evidence, before any proposed frames. **Iterations = numbered pages** (`02 Proposed`, `02.1`, …), never frames appended to an approved page; park reusable/deferred components on `00 Components`.
6. **MVDS Core by key:** MVDS Core is reachable via `importComponentByKeyAsync`/`importVariableByKeyAsync` even when it isn't an enabled team-library dependency (so it won't appear in `get_libraries`). File key `C20nU0mROzk3Zr0I9BELJF`. Check MVDS by key before recreating any primitive locally.

**`rules/design-guidelines.mdc`:**
7. **Hub tokens are authoritative over MVDS on cross-surface deltas.** Where an MVDS token and the hub `app/globals.css` value diverge (e.g. `success`: MVDS `#0A7E3A` vs hub `#3ecf8e`), the hub value wins and target-surface legibility decides; don't use MVDS components on light surfaces until a shared token is agreed (tracked in #285).

## Capabilities

### Modified Capabilities

- Process/scaffold documentation only — no new runtime capability, no application code. Governing rules and the propose skill gain the conventions above.

## Impact

- `skills/openspec-propose.md`, `rules/principles.mdc`, `rules/openspec-workflow.mdc`, `rules/figma.mdc`, `rules/design-guidelines.mdc`
- No code, no tests, no runtime behavior change. Review = reading the edits in context.
- Operational note (no scaffold fix, but recorded): background review agents can fail mid-run on API-credit exhaustion, silently dropping a reviewer — a "confirm all N reviewers returned" check belongs in the multi-agent review step so a partial review can't masquerade as complete.

## Optional links

- Source retros: @design-advisor (design/Figma loop) and @prd-writer/@experiment-creator (workflow) passes, 2026-07-17
- Sibling set this session produced: PR #297 (`stop-the-leaks` + four proposals)
- Related open issue: #285 (MVDS/hub `success` token reconciliation)
