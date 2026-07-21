# tell-the-story

## Human anchor

> "Then I want to write a synthetic history using commit messages, chat histories where available, release notes, etc to tell the story. Something like 'date x - Wrote first description of the project, pushed 5 prs focused on foundations.' and 'date y - launched ad campaign on meta with xyz results.'"

> "I want to work towards reconstructing a high level history of where my brain was at over time. so that when I get to a place and abandon the project, or get to a place and build out the whole thing, there's a way to hang context there either from existing data sources or from my own writing. We're building a case study of the experiment in real time."

(Katy, 2026-07-17 review session. Scope decisions from the same session: own change, separate from `stop-the-leaks`; v1 sources = commits + PRs, generate-then-approve; timeline content lives in Notion.)

## Outcomes

- **Who:** Outside readers who want the journey, not just the verdict — a hiring manager reading a case study that wrote itself in real time — and Katy, hanging context on each experiment while (or after) living it.
- **Job:** Each experiment detail page carries a dated, evidence-linked History: a short list of milestone entries reconstructing where the project (and Katy's thinking) was at over time, from first description to launch — or to a well-explained death.
- **Done when:**
  1. Each experiment's Notion row can hold approved timeline entries (date + one-sentence milestone + optional receipt link/number), and the hub renders them read-only as a **History** section on the detail page, below the guiding statements curated by `stop-the-leaks`. Month-level dates, chronological, roughly 5–10 entries per experiment.
  2. A draft generator assembles candidate entries from real sources at rollup grain — "pushed 5 PRs focused on foundations", never raw commit-log dumps. **Source model (corrected again 2026-07-21 after a live check):** the hub is a monorepo, so v1 sources are (a) path-scoped history `git log -- experiments/{slug}/`, (b) the GitHub PR archive of `experiment-hub` filtered per experiment by title/paths, (c) **the experiment's Figma file** — named versions, numbered iteration pages, and comment threads, and (d) external repos only where one genuinely exists (e.g. `mvds`; the Notion `repo` field — lowercase — is unreliable and must not be trusted blindly: Best Day Ever's points to a nonexistent repo).

**On Figma (added 2026-07-21):** design iteration is first-class evidence, not decoration. Katy is a product designer; Figma is an anchor tool, and for design-led experiments the iteration trail shows the *thinking* change while commits only record which version won. The repo already treats it this way — `rules/figma.mdc` is always-applied and `rules/openspec-workflow.mdc` requires design context for UI-impacting changes. Practical limit: named versions and numbered iteration pages are legible to a generator; unlabeled autosave points are noise and are ignored. Katy's existing file-naming convention (`02 Proposed`, `02.1 Proposed — History preview`) is what makes the trail machine-readable.

~~The hub's git history is truncated at 2026-06-21.~~ **Not true.** Verified 2026-07-21: the repo's root commit is `8609b56` (2025-11-12, "initial experiment hub implementation"), it is a direct ancestor of `main`, the clone is not shallow, and `main` carries 665 commits. Path-scoped `git log` is therefore the *primary* source, not a fallback — Best Day Ever alone yields 22 commits spanning 2026-03-09 → 2026-07-20. The truncation claim likely came from reading RTK-filtered `git log` output piped to `head`/`tail`, which truncates before the pipe sees it.
  3. **Nothing generated publishes without Katy.** Every entry is approved and editable in Notion before it renders. Generated drafts are assembly of real evidence — counts that are countable, dates that are real. Synthetic describes assembly, never invention.
  4. Entries that assert results carry the receipt **in the sentence** — the number itself ("500 visits, 38 signups") — or they don't ship. Linked-artifact chips are explicitly deferred past v1 (founder call, 2026-07-17: don't overbuild the first pass). Launch/campaign entries (e.g., Meta results) are hand-written by Katy; publishing spend/CPA figures is her call per entry.
  5. Failures and dead ends appear as first-class entries. For dead experiments, the terminal entry aligns with the kill reason in `Outcome` (from `publish-the-graveyard`); for live ones, any numbered entry must agree with the `Outcome` line's source — one honesty rule, no drift between surfaces.
  6. An experiment with no approved entries shows no History section at all (silent omission, matching the detail page's empty-state rule).
- **Not doing:** Chat/session transcripts as a pipeline input — high privacy risk (secrets, personal context); they may inform Katy's own writing but are never quoted or mined automatically. No auto-publish, no per-day granularity, no timeline on the homepage table, no backfill requirement for every experiment before shipping (start with one or two exemplars). ~~No scheduled regeneration~~ → **narrowed 2026-07-21:** no scheduled *overwriting*. Drafts accumulate on a monthly schedule (append-only, always unapproved); the job never modifies or deletes an existing entry, so approved wording never churns.

## Why

The 2026-07-17 review's core finding was that the site shows process but not evidence, and its strongest recommendation was an end-to-end case study. This change makes the case study a *mechanism* instead of a document: history accretes on each experiment as it happens (or is reconstructed once from real sources), so by the time an experiment ships or dies, its story already exists — with receipts. A dead-end entry is the strongest rigor signal the site can show; a timeline that stops without explanation is worse than none, which is why kill-reason alignment (Done-when 5) and silent omission (Done-when 6) are part of the definition rather than polish.

Generate-then-approve keeps the authenticity bar the rest of the site is being held to (`clickable-artifacts`: a claim that can't be shown isn't made): generation saves Katy the archaeology; approval means every published sentence is hers.

## What changes

- Notion "BHD Labs Projects": a structure for timeline entries per experiment (property vs child blocks — decide in design; must support date + text + optional URL receipt and stay hand-editable).
- `lib/notion-experiments.ts` (or a sibling adapter): read approved entries.
- `app/experiments/[slug]/page.tsx`: History section below guiding statements — mono date, one sentence, chronological.
- A draft generator (repo-local tool, **not** a hub route): reads commits, PRs, and Figma versions, proposes rollup milestones. Runs on a **monthly schedule** (GitHub Action) and appends drafts to Notion with `Approved` unchecked — insert-only, never updating or deleting. Nothing it writes is publicly visible until Katy ticks the box.
- Exemplar content: one built-out history (suggest Best Day Ever or Etsy → Notion Sync) before generalizing.

## Capabilities

### New Capabilities

- `experiment-history`: Dated, receipt-carrying milestone entries per experiment, drafted from real repo evidence, approved and editable in Notion, rendered read-only on the public detail page.

### Modified Capabilities

(none)

## Impact

- Notion database structure (timeline storage), `lib/notion-experiments.ts` or new adapter, `app/experiments/[slug]/page.tsx`
- New generation script under `scripts/`, plus a monthly GitHub Action to run it (needs a Notion token scoped to the History database only — the hub's own read path stays write-free)
- Tests: rendering order/empty-state; adapter parsing; generator unit tests on rollup logic (fixture repos)
- Ordering: after `stop-the-leaks` (it curates the page this section joins); pairs with `publish-the-graveyard` (kill-reason terminal entries) and `outcomes-column` (shared honesty rule); no hard blocks

## Optional links

- Related changes: `openspec/changes/stop-the-leaks/`, `openspec/changes/publish-the-graveyard/`, `openspec/changes/outcomes-column/`
- ~~Source constraint: hub git history truncated at 2026-06-21; per-experiment repos are the real archive~~ — **retracted 2026-07-21**, see "Source model" above. Hub history is intact to 2025-11-12; the hub *is* the archive. The Notion `repo` field stays unreliable regardless.
