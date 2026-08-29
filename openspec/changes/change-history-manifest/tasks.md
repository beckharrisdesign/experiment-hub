# Tasks — change-history-manifest

## 1. User outcomes (from spec scenarios)

- [x] 1.1 Stage dates render without git
      ↳ verified 2026-08-29 · test 'still shows stage dates' against a copy with no .git
- [x] 1.2 Pull requests render without git
      ↳ verified 2026-08-29 · test 'still shows pull requests, not zero' — 10+ where production shows 0
- [x] 1.3 Silences render without git
      ↳ verified 2026-08-29 · test 'still shows the long silence' — the 31-day gap survives
- [x] 1.4 Findings render without git
      ↳ verified 2026-08-29 · test 'still finds a task waiting on a pull request that merged' — 2.1b / #389
- [x] 1.5 A shallow clone refuses to generate
      ↳ verified 2026-08-29 · test 'refuses to run on a shallow clone'
- [x] 1.6 Every change is covered
      ↳ verified 2026-08-29 · 228 paths across 50 changes, 172 pull requests
- [x] 1.7 A newer local commit appears
      ↳ verified 2026-08-29 · test 'reads the repository, not the manifest'
- [x] 1.8 The manifest is used when git is absent
      ↳ verified 2026-08-29 · every no-git test resolves source.kind === 'manifest'
- [x] 1.9 The source is named
      ↳ verified 2026-08-29 · test 'names the manifest as its source'
- [x] 1.10 Genuinely empty is distinct from unavailable
      ↳ verified 2026-08-29 · test 'words them differently'
- [x] 1.11 Regeneration is deterministic
      ↳ verified 2026-08-29 · test 'regenerates byte-identically at the same commit'
- [x] 1.12 Generation writes nothing back
      ↳ verified 2026-08-29 · git status on openspec/changes is clean after generation, and the generator's only write target is asserted structurally

## 2. The source seam

- [x] 2.1 `lib/change-visualizer/history-source.ts` decides once per render where history comes from: a non-shallow git checkout, else the manifest, else nothing. Everything date- or commit-derived goes through it. (→ 1.7, 1.8, 1.9)
      ↳ lib/change-visualizer/history-source.ts — resolved once per cwd and memoized
- [x] 2.2 `commitsForPath` and the pull-request merge lookup read the resolved source rather than shelling out directly, so gates, the timeline, attribution and drift all follow without knowing which source answered. (→ 1.1, 1.2, 1.3, 1.4)
      ↳ commitsForPath and prMerged route through it; gates, timeline, attribution and drift follow unchanged
- [x] 2.3 Detect a usable checkout with `git rev-parse --is-shallow-repository` and the presence of a repository — a shallow clone counts as *no* git, because partial history is worse than none: it produces a plausible answer that is wrong. (→ 1.7, 1.8)
      ↳ git rev-parse --is-shallow-repository; shallow counts as no git

## 3. Generation

- [x] 3.1 `scripts/generate-change-history.ts` writes `data/change-history.json`, built **through the existing readers** rather than a second implementation — one parser, two sources (design.md risk 3). (→ 1.6)
      ↳ lib/change-visualizer/generate.ts, built through commitsFromGit — one parser, two sources
- [x] 3.2 Cover every path the readers ask for: each change directory, and `proposal.md`, `specs`, `design.md`, `tasks.md`, `archive.md` beneath it, for every change active and archived. (→ 1.6)
      ↳ the change dir plus proposal.md, specs, design.md, tasks.md, archive.md, for every change active and archived
- [x] 3.3 Record merge dates per pull request number, so the drift comparator stops running one `git log --grep` per pull request. (→ 1.4)
      ↳ merges map from one git log over all history, so drift stops running a grep per pull request
- [x] 3.4 Refuse to run on a shallow clone or without git: exit non-zero, name the cause, write nothing. (→ 1.5)
      ↳ ShallowCheckoutError, named in the message; nothing written
- [x] 3.5 Stamp the manifest with the **HEAD commit sha and its committer date**, not wall-clock time — so regenerating at the same commit produces a byte-identical file while still saying how current it is. (→ 1.9, 1.11)
      ↳ HEAD sha + committer date, not wall-clock
- [x] 3.6 Sort every key and array so a diff means the history changed. (→ 1.11)
      ↳ paths sorted by name, merges by number
- [x] 3.7 Write only to `data/`; nothing under `openspec/changes/` is touched. (→ 1.12)
      ↳ one fs.writeFile, to MANIFEST_PATH; asserted structurally
- [x] 3.8 `pnpm run history:manifest`, and gitignore the output — it is derived data (design.md decision 2). (→ 1.6)
      ↳ pnpm run history:manifest; data/change-history.json gitignored

## 4. Wiring

- [x] 4.1 `deploy-hub.yml`: `fetch-depth: 0` on the checkout, and generate before `vercel build`. A generation failure fails the deploy (design.md decision 5). (→ 1.1, 1.2)
      ↳ deploy-hub.yml — fetch-depth: 0, install, then generate before vercel build
- [x] 4.2 `next.config.js`: force `data/change-history.json` into the `/changes/**` bundle via `outputFileTracingIncludes` — tracing cannot follow a path built at runtime. (→ 1.8)
      ↳ next.config.js outputFileTracingIncludes for /changes/**
- [x] 4.3 The page names its source in one muted line: read from the repository, or from a manifest and how current it is. (→ 1.9)
      ↳ ChangePageView renders historySourceLabel
- [x] 4.4 A change with no commits reads differently from a change whose history could not be read. (→ 1.10)
      ↳ a change with no commits reads 'Nothing has been committed yet'; an unreadable source says so instead

## 5. QA

- [x] 5.1 Automated: the readers against a fixture manifest with git forced off — dates, pull requests, gaps and findings all present. (→ 1.1, 1.2, 1.3, 1.4)
      ↳ verified 2026-08-29 · tests/lib/change-visualizer/manifest.test.ts, 11 tests
- [x] 5.2 Automated: generation refuses on a shallow clone; the manifest covers every change id; regenerating is byte-identical; nothing under `openspec/changes/` changes. (→ 1.5, 1.6, 1.11, 1.12)
      ↳ verified 2026-08-29 · same file
- [x] 5.3 Automated: with a checkout present, live git answers and a commit newer than the manifest is visible. (→ 1.7)
      ↳ verified 2026-08-29 · same file
- [x] 5.4 Automated: the empty-history wording differs from the unavailable-source wording. (→ 1.10)
      ↳ verified 2026-08-29 · same file
- [ ] 5.5 Manual, after deploy: `/changes/tell-the-story` shows its stage dates, its eleven pull requests, the 31-day silence and the 3.11 finding. This is the whole point and cannot be checked any other way.
      ↳ not done — cannot run until this deploys — it is the only check that proves the fix on the live site
- [x] 5.6 `tsc --noEmit` clean for these files and eslint green.
      ↳ verified 2026-08-29 · full suite 955/955 across 298 suites; tsc clean for these files; eslint clean

## 6. What building it cost

Writing the shallow-clone test the obvious way — `git clone --depth 1` from this
repository — left a `.git/shallow` marker behind in the **source**. The working
checkout became shallow, and because every reader here degrades quietly rather
than erroring, nothing announced it: the generator started refusing, the page
silently fell back to the manifest, and two tests failed with assertions that
pointed nowhere near the cause.

Which is the fourth appearance of the same defect, and the first one this change
caused itself. Restored with `git fetch --unshallow`; the test now builds a small
repository from scratch instead of cloning this one, so it cannot reach the thing
it is testing against.
