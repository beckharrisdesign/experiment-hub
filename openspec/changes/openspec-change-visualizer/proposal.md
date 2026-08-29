# openspec-change-visualizer

## Human anchor

> "I want to build a lightweight structure or format that visualizes how any single change moved through openspec gates. so an openspec visualizer that looks at one change at a time. Mostly this is because I hear time and time again that despite all our tooling, most of us still ask the question 'what's going on?' 'what are we working on?' and thats surprisingly hard to answer still. I want to start with a change as the unit of currency."

> "apply is a long process, no matter what ai influencers say. You're unblocking, rethinking, hunting down api keys, etc."

(Katy, 2026-08-28. Discovery notes and the full iteration record: [`experiments/openspec-change-visualizer/docs/intent.md`](../../../experiments/openspec-change-visualizer/docs/intent.md).)

## Outcomes

- **Who:** Katy mid-flight, wanting to know where a change actually stands without reassembling it by hand — and anyone handed the link who has never heard of OpenSpec.
- **Job:** Answer "what's going on with this change?" from one page, in under a minute, without opening five sources that disagree.
- **Done when:** Any change in `openspec/changes/` or its archive renders at `/changes/[id]` with: an intent statement; a gate rail showing which stage it is in; every outcome with the kind of evidence behind it; a dated timeline carrying stages, silences, loops and design artifacts; and any disagreement between what the change claims and what the repo shows, surfaced rather than buried.
- **Not doing:** A list or portfolio view — one change at a time is the premise. Writing anything back into `tasks.md` or the change folder. Replacing `openspec status`, which this consumes. Experiment-grain narrative for outside readers, which is `tell-the-story`.

## Why

Answering "what's going on with `tell-the-story`?" today means reading five sources that never reference each other: the anchor in `proposal.md`, gate state from `openspec status --json`, per-artifact dates from `git log --diff-filter=A`, proof from `tasks.md` checkboxes, and shipped code from GitHub. A change is not one pull request — `tell-the-story` is eleven, spread over five weeks, none of whose titles connect them.

The sources also disagree, and nothing surfaces it. `tell-the-story` leaves task 3.11 unchecked while `formatDateSpan` and `endDate` are live in `lib/notion-history.ts` and [#399](https://github.com/beckharrisdesign/experiment-hub/pull/399) merged them on 2026-08-22. `pdf-metadata-viewer-cloud` has read "Remaining: deploy PR #389" since 2026-08-18, and #389 merged that same day. So the answer is not merely scattered; on both of these it is currently wrong.

Discovery ran eleven Figma iterations against real changes rather than a hypothetical, and four assumptions failed:

- **A count flatters.** "8 of 11 outcomes checked" says nothing about what holds each one up. Derived from the back-references `tasks.md` already records, `tell-the-story` splits 8 automated test / 2 human review / 1 deferred — every checked outcome is claimed by a test, and the three open ones are precisely the ones no test could settle. That is a different and more useful sentence than the count.
- **One capability is not the norm.** Twelve of forty-six changes carry two or more. Requirements are the durable per-capability unit; tasks are not, and are frequently not mapped to a capability at all.
- **Gates are not monotonic.** `pdf-metadata-viewer-cloud` went from apply back to design on 2026-08-18 when a spike failed against the live Drive grant; `tell-the-story` went design → proposal on 2026-07-21 to retract a false premise. A rail built from first-commit dates hides both.
- **Silence is the answer more often than not.** `tell-the-story` ran hard for five days, went quiet for 31, shipped four pull requests in one August day, and has been quiet 4 days since. A gate rail cannot show absence and neither can a task count.

## What changes

- A route at `/changes/[id]` renders one change: intent statement, gate rail, outcomes with evidence kinds, then a dated timeline of what happened.
- The gate rail carries states beyond passed/pending — reopened (`08-14 ↻ 08-18`), and **predates the gate**, because `tell-the-story`'s design merged 43 minutes before the rule that would have required it and 15 archived changes are older still.
- Outcomes render individually with their evidence kind (automated test, code path, human review, deferred), never averaged into one number.
- The timeline attributes a stage to every row, keeps silences at full weight with their real durations, and states plainly where the record cannot support a split — where two gates share one commit, or where `tasks.md` is organised by workstream rather than by spec scenario.
- Rows that produced a design artifact carry it: the committed PNG under `assets/` when one exists, otherwise fetched from the Figma file key, page and frame node id that `design.md` already records.
- Claims are compared against the repo and GitHub, and disagreements are shown as findings.

**Deferred to `design.md` by decision (2026-08-28):** the page's vocabulary. `gates`, `specs`, `capabilities`, `apply` and `archive` all assume OpenSpec literacy and are structural labels rather than prose, so they need a pass of their own rather than a rewritten sentence.

## Capabilities

### New Capabilities

- `change-page`: one OpenSpec change rendered as intent, standing state and dated history, assembled on read from the repo and GitHub — including stage attribution, loops, silences, per-outcome evidence kinds, and design artifacts resolved from a committed file or a recorded Figma node id.
- `change-claim-verification`: comparing what a change claims about itself against what the repo and GitHub show, and reporting the disagreements.

### Modified Capabilities

None.

## Impact

Read-only. No schema change, no migration, and nothing written back into `openspec/changes/`. Adds one route and its readers; consumes `openspec status --json` rather than replacing it. Artifact fetching by node id needs Figma access at render time, which is why a committed PNG is preferred where one exists.

## Optional links

- Discovery, iteration record and design rules: [`experiments/openspec-change-visualizer/docs/intent.md`](../../../experiments/openspec-change-visualizer/docs/intent.md)
- Figma: <https://www.figma.com/design/2FEqaAxp50skge0yJI5wAC/openspec-change-visualizer> — `01 Current state`, `02` … `02.11 Proposed`
