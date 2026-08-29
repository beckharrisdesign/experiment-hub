# change-history-manifest

## Human anchor

> "I want to build a lightweight structure or format that visualizes how any single change moved through openspec gates. … Mostly this is because I hear time and time again that despite all our tooling, most of us still ask the question 'what's going on?' 'what are we working on?' and thats surprisingly hard to answer still."

(Katy, 2026-08-28 — the anchor of [`openspec-change-visualizer`](../openspec-change-visualizer/proposal.md).)

**This change has no new founder request behind it.** It exists because that one
is not true in production yet: the pages shipped, and the half of them that
answers "how did it get here" is empty on the live site. Katy approved opening it
after seeing the evidence below — "yes". The honest anchor is the parent's, and
the job here is to make it hold where people actually read it.

## Outcomes

- **Who:** Anyone opening a change page on `labs.beckharrisdesign.com` — which today is everyone, since the pages are only reachable there.
- **Job:** See the same dates, pull requests, silences, loops and disagreements in production that the page shows on a developer's machine.
- **Done when:** A deployed change page renders its stage dates, its pull requests, its quiet stretches and its findings, and it does so without shelling out to git at request time.
- **Not doing:** Changing what the page says or how it looks — this is the same page with its sources restored. No new bands, no history for anything other than the changes already rendered, and nothing written back into `openspec/changes/`.

## Why

The change pages went live on 2026-08-29 and are half dead. Checked against production the same day:

- `/changes/tell-the-story` — every stage date reads `—`, and the footer of the history says **`0 pull requests`**. There are eleven.
- `/changes/pdf-metadata-viewer-cloud` — capabilities, outcomes and the workstream fallback all render correctly; the timeline is empty.

Everything read from the filesystem is right. Everything read from **git** is empty, because the deployed runtime has no `.git` directory. `commitsForPath` catches the failure and returns `[]`, which was the correct local decision — a change can be real before it is committed — but in production it means the page degrades **silently**: it looks finished while saying nothing.

The two bands that justified building this at all are exactly the two that are missing. A 31-day silence cannot be shown without commit dates, and a disagreement between a task and a merged pull request cannot be found without the merge.

This is the third time the same root cause has surfaced, each time one layer further out:

1. `git log` piped through `head` truncated before the pipe (`reference_rtk_truncates_before_pipes`).
2. CI checked out shallow, so four history-reading tests failed on assertions that never named the cause — fixed with `fetch-depth: 0`.
3. The deployed runtime has no history at all.

Each was found by something breaking rather than by asking what the environment guarantees. That is worth naming in the design.

## What changes

- A build step generates a manifest of everything currently derived from git — per-artifact commit dates, the commits touching each change folder, and the pull request numbers and merge dates behind them — for every change in the repo.
- It runs where full history already exists: CI, which has checked out with `fetch-depth: 0` since 2026-08-29.
- The readers prefer the manifest and fall back to live git, so a developer sees uncommitted work immediately and production sees the manifest.
- The page states which source it used, so "no history" is never mistaken for "no work".
- Drift findings are computed from the manifest's merge records rather than a `git log --grep` per pull request, which also removes roughly a dozen subprocess calls per render.

## Capabilities

### New Capabilities

- `change-history-source`: a change's commit history — artifact dates, pull requests, merges — available to the hub without a git checkout at request time, generated where history exists and read where it does not.

### Modified Capabilities

None. `change-page` renders exactly what it renders today; only where its history comes from changes.

## Impact

No visual change and no schema change. Adds one generated file and one build step; nothing is written back into `openspec/changes/`. The manifest is derived data and must be regenerable from the repository at any commit — if it is ever the only copy of something, that is a bug.

## Optional links

- Parent change: [`openspec/changes/openspec-change-visualizer/`](../openspec-change-visualizer/proposal.md)
- The readers this replaces: `lib/change-visualizer/git.ts`, `gates.ts`, `prs.ts`, `drift.ts`
