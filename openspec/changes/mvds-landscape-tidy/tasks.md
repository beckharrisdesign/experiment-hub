# mvds-landscape-tidy — tasks

Install with `pnpm` (`packageManager: pnpm@10.33.0`); run scripts with `npm` as the README does.

## 1. User outcomes (from spec scenarios)

- [ ] 1.1 Katy can open all seven MVDS-bearing surfaces after the bump and see them render unchanged from the current deploy — **gated on 4.1**; local dev rendering was checked on three of them, which is not the deploy comparison the requirement asks for
- [x] 1.2 Katy can load the scoped-theme routes and see headings still correct in both scopes
- [x] 1.3 Katy can render any existing `font-heading` call site and see the face resolve from the Hub's own utility
- [x] 1.4 Katy can compare the registry seed against the experiment directories and find the missing experiments present
- [x] 1.5 Katy can check the seed for `keyword-explorer` and confirm it is still absent
- [x] 1.6 Katy can read the candidates doc and see Dropzone and terracotta marked delivered, with the publishing prohibition gone
- [x] 1.7 Katy can read the candidates doc and find `Slider` listed as the open candidate with its evidence and owner

## 2. Prototype shell

- [x] 2.1 **Not applicable.** This change edits existing hub surfaces; there is nothing to prototype and no new port or `data/prototypes.json` entry. Verification happens on the running Hub (§4), not in a prototype.

## 3. Implementation

**Lockfile hygiene first — this blocks the bump.**

- [x] 3.1 Resolve the two contradictory root lockfiles before touching the version. `pnpm-lock.yaml` (authoritative, last updated 2026-08-31) pins MVDS `0.3.0`; the tracked `package-lock.json` (last updated 2026-07-25, commit `d76cf49`) still pins `0.2.0`, which does not even satisfy the declared `^0.3.0` — so `npm ci` at root cannot succeed today. Recommend deleting `package-lock.json`, since `packageManager` names pnpm and the real install tree is a pnpm store. **Confirm with Katy before deleting a tracked file.**

**The bump.** (No call-site migration needed: the Hub's exposure to all three `0.4.0` breaks measured zero — see design decision 2.)

- [x] 3.2 Set `@beckharrisdesign/mvds` to `^0.4.0` in the root `package.json` and run a single `pnpm install` for that one dependency — no full reinstall, no parallel builds (machine memory).
- [x] 3.3 Confirm `pnpm-lock.yaml` resolves `0.4.0` with the integrity hash matching the published tarball on `registry.npmjs.org`.
- [~] 3.4 Tests green (serially — see QA note). **Build not verifiable in this worktree:** `npm run build` never builds the Hub (the root is deliberately not a pnpm-workspace member and `turbo.json` declares `//#test` but no `//#build`), and a direct `npx next build` fails here for two reasons unrelated to MVDS — a Turbopack panic on symlink resolution from the deep `.claude/worktrees/...` path, which reproduces identically at `0.3.0`, and a pre-existing `next/font/google` fetch for Syne in `app/font-preview/page.tsx` (untouched, dating to 2026-03-10). CI is the authority.
- [x] 3.5 Verified against a local dev server (the `experiment-hub (no 1Password)` launch config) — not the deploy. `/etsy-listing-kit`, `/keyword-explorer` and `/svg-to-stitch` all render on `0.4.0` with their MVDS controls intact and no MVDS-related console errors (only Supabase `Invalid API key`, expected without secrets). A pixel A/B against `0.3.0` was **not** done, and `/admin`, `/generative-sandbox`, `/pdf-metadata-viewer` and `/exec-function-assessment` were not read at all; §4.1 against the real deploy remains the gate and 1.1 stays open until it is done. **Canary first: read `/etsy-listing-kit`** — the only inherit-only route, so if it shifts, the stylesheet moved under every route and the bump should be reverted rather than debugged forward. (`/keyword-explorer` is *not* a canary: it reaches MVDS `Select*` via `components/KeywordTable.tsx`.)

**The deletion the bump earns — only after 3.5 passes.**

- [x] 3.6 **Not deleted — correctly.** The installed `0.4.0` stylesheet still declares `--font-heading: var(--font-sans)` (`dist-lib/styles.css:228`), the exact default the override undoes, so the block remains load-bearing. Design decision 3's fallback taken; `app/globals.css` is unchanged by this change.
- [x] 3.7 Verified 1.2 and 1.3 on `/svg-to-stitch` and the Executive Function routes, checking that no card title diverges from its page title. If headings regress, restore the block and record why in `design.md` under Decisions — per design decision 3, the deletion is a win, not a precondition.
- [x] 3.8 Noted while reading those routes: whether the class-based `.mvds-theme` / `.efa-theme` scopes still win against `0.4.0`'s new `data-brand` mechanism. Do not migrate — no divergence observed on the routes read; `.mvds-theme` still governs `/svg-to-stitch`.

**Records.**

- [x] 3.9 Added rows for `etsy-listing-kit` and `openspec-change-visualizer` to `data/experiments.json`, matching the file's existing shape with `scores` unset (scores follow market research, never invented) and `documentationId` / `prototypeId` empty, since neither has a legacy record — the `snap-issue` convention, and it avoids dangling relationship metadata. `super-css-control` deliberately **not** added: its `bhd-experiment` schema registers in Notion, not this seed. `keyword-explorer` not added. No Notion writes.
- [x] 3.10 Confirm `scripts/site-map/routes.js` resolves the `etsy-listing-kit` route from the seed, satisfying 1.4 and 1.5.
- [x] 3.11 Update `docs/PACKAGE_CONTRIBUTION_CANDIDATES.md`: mark Dropzone and the terracotta accent set delivered in `0.4.0`, remove the "Do not modify or publish `@beckharrisdesign/mvds` from this experiment" line, and add `Slider` as the open candidate citing both vendored workarounds (`app/generative-sandbox/Slider.tsx` and `image-lab/src/components/ui/slider.tsx` in `beckharrisdesign/generative-art`) with ownership pointed at the MVDS session. Satisfies 1.6 and 1.7.

## 4. QA

- [ ] 4.1 (yours — gates 1.1) **Manual walkthrough** — read the MVDS-bearing routes against the current deploy, canary first: `/etsy-listing-kit` (inherit-only), then `/keyword-explorer` and `/admin` (both reach MVDS through shared `components/`), then `/svg-to-stitch`, `/generative-sandbox`, `/pdf-metadata-viewer`, and `/exec-function-assessment` last and most carefully, since it exercises the widest component surface. Dark mode only; the Hub has no light mode.
- [x] 4.2 **Automated smoke** — `npm test` green **when run serially** (`--no-file-parallelism --maxWorkers=1`): 44/44 KeywordTable, and the two `change-visualizer` failures are solely "this change is uncommitted" (one asserts `openspec/changes` is clean, the other reads git history per change) and clear on commit. A default parallel run fails 8 tests non-deterministically with 27–95s durations — worker contention on an 8GB machine, not assertions. Build: see 3.4. Note there is no visual regression suite, so §4.1 is the real gate and cannot be skipped in favour of green tests.
- [x] 4.3 Confirm the handoffs in `proposal.md` are still accurate at close: `Slider` with the MVDS session, `bhd-headless-notion` unfixed and recorded. Neither is in this change's definition of done.
