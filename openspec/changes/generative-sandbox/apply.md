# Apply — Generative Sandbox

> Store note: BHD Surfaces, Product Design Patterns, and Pattern Candidates stores are
> named by `rules/bhd-experiment.mdc` but `openspec/config.yaml` defines no paths for
> them; surfaces and patterns are named directly below, following `etsy-notion-sync`.
>
> Code ships via the **child** change `openspec/changes/generative-sandbox-build/`
> (schema `experiment-hub-lite`) with `/opsx:apply` on the child. This file tracks Build
> Units, instrumentation, and learnings — not code tasks.
>
> The child's artifacts were rebuilt against the utility / module-stack framing on
> 2026-08-27 (proposal, two specs, design with the approved Figma pair, tasks).

## BHD Surfaces used

- **Experiment hub web app** — the sandbox is a prototype surface under
  `experiments/<slug>/prototype/`, reached from its hub detail page.
- **Supabase** (hub's existing project) — private buckets for source images and rendered
  outputs; a table for saved stacks.
- **Vercel** (hub's existing project) — hosting plus the sharp processing route. No new
  project, no new secrets; this is why the utility lives here.
- **GitHub Actions** — the hub's existing CI and `deploy-hub.yml`.

## Product Design Patterns applied

- Hub dark-theme conventions (`rules/design-guidelines.mdc`) and MVDS components for all
  chrome; Figma as-is + proposed pair lands in the child change's `design.md` per
  `rules/figma.mdc`.
- Private input/output buckets with signed URLs, following `lib/etsy-listing-kit/orders.ts`.
- **External Positioning variants are n/a across all units** — this is a utility (Propose,
  2026-08-27); no taglines or ad copy exist.

## Build Units

### Build Unit 1: Module stack spine

- **State:** in progress (prototype scaffolded, stack + render path implemented; awaiting manual walkthrough and deploy)
- **Purpose:** validation

The spine, and the riskiest part: transform modules as first-class objects rather than a
fixed pipeline. A module registry with declared parameters; stack state carrying order
and enabled-ness; a server route that applies the stack in order through sharp; upload
once to a private bucket so adjustments send parameters, not the file. Seed catalogue is
blur and colour simplify, ported from `image-lab` with its existing vitest suite.

Includes a downscaled preview proxy from the start — full resolution only on export.
That is cheap, obviously needed, and the difference between "seconds" holding and not.

#### Measurement instrumentation

- **Time from open to first visible result** — the Measurement Brief's leading indicator,
  and the whole positioning in one number.
- Reorder and toggle events, which the composition threshold in Propose depends on.

#### Learnings log

- **2026-08-28:** The module registry had to be split in two — `lib/modules.ts` for
  client-safe declarations, `lib/modules.server.ts` for the sharp implementations. The
  stack UI imports the registry for labels and parameter ranges, so a single file pulled
  a native Node module into the browser bundle and the build died on
  `UnhandledSchemeError: node:events`. The split turns out to *express* the design better
  than the original file did: adding a module touches both files, composing modules
  touches neither.
- **2026-08-28:** vitest cannot import a module guarded by `server-only` — no test run has
  a React Server Components condition. Aliased to a stub in `vitest.config.ts` rather than
  dropping the guard, since the guard is what prevents the bundle regression above.
- **2026-08-28:** Three defects (client-bundle violation, a stale type name, ESLint
  resolution) were invisible to the test suite and only surfaced in `next build`. Evidence
  for keeping the build as a required CI gate, not just tests.
- **2026-08-28:** A prototype under `experiments/` needs its own `eslint.config.mjs` and an
  explicit `outputFileTracingRoot`. Without them Next loads the hub root ESLint config
  (which cannot resolve `eslint-config-next` from there) and infers a workspace root from
  an unrelated lockfile outside the repo. `photo-filters-banner` already carries the
  ESLint half of that fix.

#### Pattern notes

- An ordered, toggleable stack of declared-parameter modules is a reusable shape well
  beyond this utility — `pbn-research` compares pipelines and would want the same
  structure. Candidate for Product Design Patterns.
- **Declaration/implementation split for anything a client renders controls for.** The
  shape — declarations client-safe, implementations `server-only`, ids joining them — is
  reusable wherever a browser needs to describe work that only a server can do.

---

### Build Unit 2: Photo module port

- **State:** planned
- **Purpose:** production

Ports `photo-filters-banner`'s work into modules: the three presets (slate, mono-pop,
high-contrast) and the header/footer banner overlays, plus its upload ingest and
validation. Retires that prototype's client-side `applyFilterToImageData` path — the
main-thread loop its own `ingest.ts` apologises for above 4096px.

Carries the incidental port fix: `data/prototypes.json` and the README say 3009 while
`package.json` runs `next dev -p 3003`, which is `proto-simple-seed-organizer`'s port.

#### Measurement instrumentation

- Parity check: each ported preset produces a visually equivalent result to the client
  implementation on a fixture image, so the port is not a silent regression.

#### Learnings log

- _(none yet — unit is planned)_

#### Pattern notes

- Client-side pixel loop → server-side sharp module is now the second such migration
  (after `image-lab` itself). If a third appears, the migration shape is worth writing
  down properly.

---

### Build Unit 3: Stack memory

- **State:** planned
- **Purpose:** validation

The "never lost" half of the positioning. An output is saved together with the whole
stack that produced it — module order, toggles, parameters, seed — and that stack can be
reopened and built on. Without this the sandbox is a filter panel; with it, a good
accident survives the session.

Deliberately a separate unit so its kill criterion can fire independently: if stacks are
never reopened, this is what gets cut, not the sandbox.

#### Measurement instrumentation

- Stacks saved, and stacks reopened-and-modified — the Propose threshold is at least 2
  reopened across the four-week window.

#### Learnings log

- _(none yet — unit is planned)_

#### Pattern notes

- "Save the recipe, not just the result" generalises to any generative or parameterised
  output. Candidate for Product Design Patterns.

---

### Build Unit 4: Retirement and registry

- **State:** planned
- **Purpose:** production

Closes out the surfaces this utility replaces. Retires `image-lab` in `generative-art`
as a live surface; settles what that repo becomes (archive, or working surface beside the
sandbox — open question, founder's call); updates `data/experiments.json` and
`data/prototypes.json`; closes the superseded
[generative-art PR #3](https://github.com/beckharrisdesign/generative-art/pull/3), which
stays open during the transfer per the founder.

#### Measurement instrumentation

- n/a — cleanup unit.

#### Learnings log

- _(none yet — unit is planned)_

#### Pattern notes

- Retiring a surface deserves the same explicitness as shipping one. Two prototypes in
  this utility's history stalled without ever being declared dead.

---

### Build Unit 5: Prefix caching — conditional

- **State:** planned (conditional)
- **Purpose:** production

**Only if measurement shows the need.** Re-running an entire stack on every slider nudge
threatens the "seconds" claim; caching intermediate results per stack prefix — so editing
the last module re-runs only the tail — is the obvious fix.

Held back deliberately: Unit 1's preview proxy may make the whole question moot, and
building a cache before there is a measured latency problem is optimising a number nobody
has looked at. The leading indicator from Unit 1 decides whether this unit ever starts.

#### Measurement instrumentation

- Same leading indicator as Unit 1, compared before and after.

#### Learnings log

- _(none yet — unit is planned)_

#### Pattern notes

- _(none yet)_

---

## Learnings log — utility-wide

Append-only, newest first. These predate Build Unit 1 and came out of deciding where this
utility should live.

- **2026-08-27:** Reversal worth recording. A complete standalone Vercel pipeline for
  `image-lab` was designed and built — `git.deploymentEnabled: false`, an Actions deploy
  workflow, the repo's first CI, a full OpenSpec change — and then superseded within the
  same session when the framing moved to a hub utility. Everything in it was individually
  sound. The lesson is ordering: settle *where a thing lives* before building its
  infrastructure, because deploy plumbing is the least portable work there is.
- **2026-08-27:** `generative-art`'s CLAUDE.md says, in bold, "Do not add tooling unless
  explicitly requested" — and the session added npm, a lockfile, two workflows, and a CI
  gate before anyone noticed the instruction. A repo's stated constraints are worth
  re-reading at the point you start adding to it, not only when you first open it.
- **2026-08-27:** `scripts/sync-secrets.sh` supports a `gh-repo:<owner/repo>` target, so
  the hub's vault discipline can extend to repos that stay outside the hub. It is the
  documented answer for MVDS's Chromatic token, and it means "I need the hub's secrets
  workflow" is not by itself a reason to absorb a codebase.
- **2026-08-27:** Hub task 0.3 blocks the linked-repos UI on `NODE_AUTH_TOKEN` for
  `@beckharrisdesign/mvds` "on GitHub Packages". Stale — MVDS 0.4.0 publishes to
  registry.npmjs.org and fetches anonymously (HTTP 200). Worth unblocking separately.
- **2026-08-27:** Three artifacts disagree on the scoring rubric — `rules/scoring-criteria.mdc`
  is v3, `openspec/config.yaml:23` still advertises retired v2, and the `bhd-experiment`
  explore template still ships the v1 five-dimension table. Scored on v3 throughout and
  flagged; the fixes belong in their own change.
- **2026-08-27:** macOS bash 3.2 mis-parses an apostrophe inside a heredoc nested in
  `$(...)`, so the hub's sticky-PR-comment script cannot be linted locally even though it
  runs correctly on GitHub's bash 5 runners. Rewording to drop the apostrophe makes it
  checkable in both places.

## Pattern notes — utility-wide

- **Private input/output buckets with signed URLs** — now the second consumer after
  `etsy-listing-kit` (`simple-seed-organizer` is a looser third, using a public URL). At
  three genuine consumers this is worth promoting to a Service Pattern with a shared
  helper rather than a copied file.
- **Utility classification** — `etsy-notion-sync` established it (2026-07-15), this is the
  second. A third would justify writing the rule down properly: what a utility is, that it
  has no monetization question, and that a low BI score on one is expected rather than a
  warning.
