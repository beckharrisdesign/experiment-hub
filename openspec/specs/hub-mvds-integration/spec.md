# hub-mvds-integration Specification

## Purpose
The Hub's MVDS-facing surfaces: the single root dependency every hub experiment inherits, the CSS layer that adapts it, and the two in-repo records of what the Hub consumes and what it still wants from the package. From `mvds-landscape-tidy` (archived 2026-11-11), written for the version the Hub is on, not the 0.4.0 bump that change made, and widened to `/estate-sale-planner`, which arrived after it; the Hub is on `^0.5.0` as of 2026-11-11.

## Requirements

### Requirement: An MVDS version move doesn't change how the Hub looks

All eight MVDS-bearing hub surfaces look the same after a version move as before it: Katy cannot tell the package version changed by looking.

The Hub SHALL consume `@beckharrisdesign/mvds` from the public npm registry through the root `package.json` (resolved in `pnpm-lock.yaml`, the only root lockfile), and a version move SHALL NOT ship a visual change she hasn't approved on any route that imports its components or inherits its stylesheet. There is no visual regression suite, so the walkthrough below is the gate. The dev-only `/dev/mvds` parity page isn't part of it: it 404s in production.

#### Scenario: The MVDS routes look the same after a version move

- **WHEN** the Hub moves to a new MVDS version and the eight MVDS-bearing surfaces are read against the deploy before it, canary first: `/etsy-listing-kit` (inherit-only), `/keyword-explorer` and `/admin` (through shared `components/`), `/svg-to-stitch`, `/generative-sandbox`, `/pdf-metadata-viewer`, `/estate-sale-planner` (scoped `.mvds-theme`, the most component imports), and `/exec-function-assessment` (the widest component surface)
- **THEN** each looks the same, or the differences are ones Katy has explicitly approved

### Requirement: Heading faces don't depend on MVDS's font tokens

Headings resolve to the Hub's heading face in both scoped themes and across the Hub, whatever MVDS defaults `--font-heading` to.

The Hub SHALL keep its own `@theme` font tokens and its own `.font-heading` utility, because MVDS ships no font utilities, and SHALL keep the `.efa-theme` / `.mvds-theme` heading override for as long as MVDS defaults `--font-heading` to the sans (it still does in 0.5.0, `dist-lib/styles.css`).

#### Scenario: Scoped-theme headings stay correct

- **WHEN** the routes opting into `.mvds-theme` (`/svg-to-stitch` and `/estate-sale-planner`) and the Executive Function routes are loaded
- **THEN** headings render in the intended face in both scopes, with no card title diverging from its page title

#### Scenario: The Hub's own font utility resolves

- **WHEN** any `font-heading` call site is rendered
- **THEN** the face resolves from the Hub's own utility declaration, not from MVDS

### Requirement: The registry seed lists every real experiment

The seed file names each experiment that exists in the repo, so the Figma site-map tooling can see every route, without inventing experiments that were deliberately kept out.

The seed `data/experiments.json` SHALL carry one row per lite-schema experiment directory under `experiments/`, in the shape the file already uses. It SHALL leave out surfaces that a founder decision placed outside the experiment model, and `bhd-experiment`-schema experiments, which register in the Notion BHD Labs Database instead. The file is not read at request time (`lib/data.ts:getExperiments()` resolves from Notion with a Supabase fallback); its consumers are `scripts/seed-supabase.ts` and `scripts/site-map/routes.js`, so it is tooling input, and Notion stays the source of truth for experiment rows.

#### Scenario: Every experiment directory has a row

- **WHEN** the seed's rows are compared against the lite-schema directories under `experiments/`
- **THEN** each has a row, `etsy-listing-kit` and `openspec-change-visualizer` included, and `scripts/site-map/routes.js` resolves their `/experiments/<slug>` routes

#### Scenario: keyword-explorer stays out by prior decision

- **WHEN** the seed is checked for a `keyword-explorer` row
- **THEN** none exists, matching the decision recorded in that page's own header: *"it might end up an experiment but not today"*

### Requirement: The contribution record matches what the package actually ships

A reader of the Hub's MVDS wish-list can tell what has already landed from what is still wanted, and is not told the Hub may not publish to MVDS.

`docs/PACKAGE_CONTRIBUTION_CANDIDATES.md` SHALL separate delivered candidates, each with the version that shipped it, from open ones, and SHALL point open candidates at the session that owns them.

#### Scenario: Shipped candidates are marked delivered

- **WHEN** the candidates doc is read
- **THEN** Dropzone and the terracotta accent set are shown as delivered in `0.4.0`, and there is no line forbidding the Hub to publish to MVDS

#### Scenario: Open candidates carry their evidence and owner

- **WHEN** a reader looks for what the Hub still wants from MVDS
- **THEN** each open candidate (`Slider` today) is listed with the workarounds that justify it and ownership pointed at the MVDS session
