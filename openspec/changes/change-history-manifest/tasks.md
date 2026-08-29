# Tasks — change-history-manifest

## 1. User outcomes (from spec scenarios)

- [ ] 1.1 Stage dates render without git
- [ ] 1.2 Pull requests render without git
- [ ] 1.3 Silences render without git
- [ ] 1.4 Findings render without git
- [ ] 1.5 A shallow clone refuses to generate
- [ ] 1.6 Every change is covered
- [ ] 1.7 A newer local commit appears
- [ ] 1.8 The manifest is used when git is absent
- [ ] 1.9 The source is named
- [ ] 1.10 Genuinely empty is distinct from unavailable
- [ ] 1.11 Regeneration is deterministic
- [ ] 1.12 Generation writes nothing back

## 2. The source seam

- [ ] 2.1 `lib/change-visualizer/history-source.ts` decides once per render where history comes from: a non-shallow git checkout, else the manifest, else nothing. Everything date- or commit-derived goes through it. (→ 1.7, 1.8, 1.9)
- [ ] 2.2 `commitsForPath` and the pull-request merge lookup read the resolved source rather than shelling out directly, so gates, the timeline, attribution and drift all follow without knowing which source answered. (→ 1.1, 1.2, 1.3, 1.4)
- [ ] 2.3 Detect a usable checkout with `git rev-parse --is-shallow-repository` and the presence of a repository — a shallow clone counts as *no* git, because partial history is worse than none: it produces a plausible answer that is wrong. (→ 1.7, 1.8)

## 3. Generation

- [ ] 3.1 `scripts/generate-change-history.ts` writes `data/change-history.json`, built **through the existing readers** rather than a second implementation — one parser, two sources (design.md risk 3). (→ 1.6)
- [ ] 3.2 Cover every path the readers ask for: each change directory, and `proposal.md`, `specs`, `design.md`, `tasks.md`, `archive.md` beneath it, for every change active and archived. (→ 1.6)
- [ ] 3.3 Record merge dates per pull request number, so the drift comparator stops running one `git log --grep` per pull request. (→ 1.4)
- [ ] 3.4 Refuse to run on a shallow clone or without git: exit non-zero, name the cause, write nothing. (→ 1.5)
- [ ] 3.5 Stamp the manifest with the **HEAD commit sha and its committer date**, not wall-clock time — so regenerating at the same commit produces a byte-identical file while still saying how current it is. (→ 1.9, 1.11)
- [ ] 3.6 Sort every key and array so a diff means the history changed. (→ 1.11)
- [ ] 3.7 Write only to `data/`; nothing under `openspec/changes/` is touched. (→ 1.12)
- [ ] 3.8 `pnpm run history:manifest`, and gitignore the output — it is derived data (design.md decision 2). (→ 1.6)

## 4. Wiring

- [ ] 4.1 `deploy-hub.yml`: `fetch-depth: 0` on the checkout, and generate before `vercel build`. A generation failure fails the deploy (design.md decision 5). (→ 1.1, 1.2)
- [ ] 4.2 `next.config.js`: force `data/change-history.json` into the `/changes/**` bundle via `outputFileTracingIncludes` — tracing cannot follow a path built at runtime. (→ 1.8)
- [ ] 4.3 The page names its source in one muted line: read from the repository, or from a manifest and how current it is. (→ 1.9)
- [ ] 4.4 A change with no commits reads differently from a change whose history could not be read. (→ 1.10)

## 5. QA

- [ ] 5.1 Automated: the readers against a fixture manifest with git forced off — dates, pull requests, gaps and findings all present. (→ 1.1, 1.2, 1.3, 1.4)
- [ ] 5.2 Automated: generation refuses on a shallow clone; the manifest covers every change id; regenerating is byte-identical; nothing under `openspec/changes/` changes. (→ 1.5, 1.6, 1.11, 1.12)
- [ ] 5.3 Automated: with a checkout present, live git answers and a commit newer than the manifest is visible. (→ 1.7)
- [ ] 5.4 Automated: the empty-history wording differs from the unavailable-source wording. (→ 1.10)
- [ ] 5.5 Manual, after deploy: `/changes/tell-the-story` shows its stage dates, its eleven pull requests, the 31-day silence and the 3.11 finding. This is the whole point and cannot be checked any other way.
- [ ] 5.6 `tsc --noEmit` clean for these files and eslint green.
