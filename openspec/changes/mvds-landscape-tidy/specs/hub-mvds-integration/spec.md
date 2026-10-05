# hub-mvds-integration

The Hub's MVDS-facing surfaces: the single root dependency every hub experiment
inherits, the CSS layer that adapts it, and the two in-repo records of what the
Hub consumes and what it still wants from the package.

## Outcomes

See [proposal.md](../../proposal.md) — hub-side only. A version move plus two
record corrections: no new application code, no new runtime behavior, and
nothing inside `@beckharrisdesign/mvds` (that is the concurrent MVDS session).

## ADDED Requirements

### Requirement: Every hub experiment renders unchanged on MVDS 0.4.0

All seven MVDS-bearing hub surfaces look the same after the bump as before it — Katy cannot tell the package version changed by looking.

**Fails until:** the root `package.json` resolves `@beckharrisdesign/mvds` at `0.4.0` in `pnpm-lock.yaml` (the only root lockfile), `npm run build` and the vitest suite are green, and all seven surfaces have been read against the current deploy with any delta either absent or explicitly approved.

The Hub SHALL consume `@beckharrisdesign/mvds` at `^0.4.0` from the public npm registry, with no unapproved visual delta on any route that imports its components or inherits its stylesheet.

#### Scenario: Six MVDS routes render unchanged after the bump

- **WHEN** the bumped Hub is built and all seven MVDS-bearing surfaces are compared against the current deploy — `/exec-function-assessment`, `/svg-to-stitch`, `/generative-sandbox`, `/pdf-metadata-viewer` (direct imports in `app/`), `/keyword-explorer` and `/admin` (direct imports via shared `components/`), and `/etsy-listing-kit` (inherit-only)
- **THEN** each renders identically, or with deltas Katy has explicitly approved


### Requirement: Heading faces survive MVDS's font-token break

Headings still resolve correctly in both scoped themes and across the Hub after `0.4.0` stops shipping the font utilities.

**Fails until:** heading faces are visually correct on `/svg-to-stitch` and every Executive Function route, and every existing `font-heading` call site still resolves.

The Hub SHALL retain its own `@theme` font tokens and `@layer utilities .font-heading`, which `0.4.0` does not supply, and SHALL retain the `.efa-theme` / `.mvds-theme` heading override for as long as MVDS defaults `--font-heading` to the sans.

**Finding (apply, 2026-10-05):** the premise that `0.4.0` would make the override redundant is **false**. `node_modules/@beckharrisdesign/mvds/dist-lib/styles.css:228` still declares `--font-heading: var(--font-sans)` — the exact default the override exists to undo. The block stays, per design decision 3's fallback. The other half of the premise held: `0.4.0` ships no `.font-heading` utility, so the Hub owning its own is what keeps that break costless.

#### Scenario: Scoped-theme headings remain correct

- **WHEN** `/svg-to-stitch` (the only route opting into `.mvds-theme`) plus the Executive Function routes are loaded on `0.4.0`
- **THEN** headings render in the intended face in both scopes, with no card title diverging from its page title

#### Scenario: The Hub's own font utility still resolves

- **WHEN** any of the 13 `font-heading` call sites across 10 files is rendered after the bump
- **THEN** the face resolves from the Hub's own `@layer utilities` declaration, unaffected by MVDS no longer shipping that utility

### Requirement: The registry seed lists every real experiment

The seed file names each experiment that exists in the repo, so the Figma site-map tooling can see every route — without inventing experiments that were deliberately kept out.

**Fails until:** `data/experiments.json` contains rows for `etsy-listing-kit` and `openspec-change-visualizer`, contains no row for `keyword-explorer`, and `scripts/site-map/routes.js` resolves the `etsy-listing-kit` route from it.

The seed SHALL carry one row per lite-schema experiment directory under `experiments/`, in the shape the file already uses, excluding surfaces a founder decision has placed outside the experiment model and experiments whose schema registers them in Notion instead.

**Scope note:** this file is **not** read at request time — `lib/data.ts:getExperiments()` resolves from Notion with a Supabase fallback. Its only consumers are `scripts/seed-supabase.ts` and `scripts/site-map/routes.js`, so correcting it changes tooling input, not hub UI. Notion remains the source of truth for experiment rows and is not written here.

#### Scenario: Missing experiments appear in the seed

- **WHEN** the seed's rows are compared against the directories under `experiments/`
- **THEN** `etsy-listing-kit` and `openspec-change-visualizer` each have a row, bringing the file to 21, and `scripts/site-map/routes.js` resolves both `/experiments/<slug>` routes

**Scope correction (apply, 2026-10-05):** `super-css-control` was dropped from this requirement. It is a `bhd-experiment`-schema change, and `skills/openspec-propose/SKILL.md` states that for that schema `data/experiments.json` must not be touched — registration belongs in the Notion BHD Labs Database, which needs explicit approval. It also has no `experiments/<slug>/docs/` directory, the other condition that schema's gate checks.

#### Scenario: keyword-explorer stays out by prior decision

- **WHEN** the seed is checked for a `keyword-explorer` row
- **THEN** none exists, matching the decision recorded in that page's own header — *"it might end up an experiment but not today"*

### Requirement: The contribution record matches what the package actually ships

A reader of the Hub's MVDS wish-list can tell what has already landed from what is still wanted, and is not told the Hub may not publish to MVDS.

**Fails until:** `docs/PACKAGE_CONTRIBUTION_CANDIDATES.md` marks Dropzone and the terracotta accent set as delivered in `0.4.0`, carries `Slider` as the live candidate, and no longer contains the "Do not modify or publish `@beckharrisdesign/mvds` from this experiment" line.

The record SHALL distinguish delivered candidates (with the version that shipped them) from open ones, and SHALL point open candidates at the session that owns them.

#### Scenario: Shipped candidates are marked delivered

- **WHEN** the candidates doc is read after the update
- **THEN** Dropzone and terracotta are shown as delivered in `0.4.0`, and the prohibition line on publishing to MVDS is gone

#### Scenario: Slider is recorded as the open candidate with its evidence

- **WHEN** a reader looks for what the Hub still wants from MVDS
- **THEN** `Slider` is listed with both vendored workarounds cited and ownership pointed at the MVDS session, not claimed by this change
