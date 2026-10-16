# mvds-landscape-tidy

## Human anchor

> "lets review what improvements to this landscape I can make today only -- either in updates, bringing experiments into the full hub, or improving mvds itself."

> "its ok to skip figma for this one -- but lets make sure these proposed capabilities are puerely on the hub side. I have another session for mvds improvements going."

(Katy, 2026-10-05, after the MVDS consumption audit run on `claude/mvds-consumption-audit-97dea1`. Two constraints bind scope: **today only**, and **hub-side only** — package work belongs to the concurrent MVDS session, not here.)

## Outcomes

- **Who:** Katy, and all six hub experiments that inherit MVDS through the Hub's single root dependency — they move as one or not at all.
- **Job:** Take the Hub's own side of the consumption audit's findings, leaving the package and the other consumer repo to their own sessions.
- **Done when:** the Hub runs MVDS `0.4.0` with no visual regression on the seven MVDS-bearing surfaces; the missing lite-schema experiments appear in the registry seed; and `PACKAGE_CONTRIBUTION_CANDIDATES.md` reflects what `0.4.0` actually shipped. (Originally this also required deleting the `.mvds-theme` / `.efa-theme` font override. Apply established that `0.4.0` still defaults `--font-heading` to the sans, so the override is load-bearing and stays — see the correction under Why.)
- **Not doing:** Anything inside `@beckharrisdesign/mvds` — including the `Slider` contribution, which is handed to the concurrent MVDS session (see Handoffs). Repairing `bhd-headless-notion` (another repo, not the Hub — also a handoff). Migrating `etsy-listing-kit` off its 15KB `elk.module.css` onto MVDS components (a full restyle, its own change). Pulling any of the eight standalone prototypes under `experiments/` into the Hub (each is a separate stack decision). Notion writes of any kind.

## Why

The audit established that MVDS reaches the Hub through exactly one dependency — `"@beckharrisdesign/mvds": "^0.3.0"` in the root `package.json` — and that `app/globals.css:4` imports its stylesheet into the root layout. Every hub experiment therefore wears the same pin, and none can move independently. That makes the version bump the single highest-leverage edit available on the Hub side: one line, six experiments.

It is also cheaper than it looks. `0.4.0` ships three pre-1.0 breaks, and the Hub's exposure to each was measured rather than assumed — and is zero in every case:

| `0.4.0` break | Hub exposure |
| --- | --- |
| `primary-50…950` / `secondary-50…950` utilities removed | **0 occurrences** across `app/`, `components/`, `lib/` |
| Ad-hoc brand alpha out of contract | **0 occurrences** — the one apparent hit was `text-text-primary/75`, the Hub's own `--color-text-primary` token, which the rule does not govern |
| `font-sans` / `font-heading` utilities gone | **0 at risk** — the Hub declares both itself, in its own `@theme` block and an `@layer utilities .font-heading` |

The third row is the interesting one. Because the Hub already owns those font tokens, `0.4.0` removing MVDS's versions costs nothing.

**Corrected at apply (2026-10-05):** this section originally argued the bump would also be *net-negative CSS*, on the premise that `0.4.0` turns `--font-heading` into a runtime token and so retires the override at `app/globals.css:160–170`. It does not. `0.4.0` still ships `--font-heading: var(--font-sans)` (`dist-lib/styles.css:228`), the exact default that override undoes, so the block stays. The bump is cost-free, not CSS-reducing.

The remaining two items are housekeeping that the bump makes timely rather than optional. The registry seed has drifted far enough that the Figma site-map tooling cannot see a live route. And the contribution-candidates doc is now actively misleading: two of its three MVDS candidates shipped in `0.4.0`, so anyone reading it would propose work that already exists.

## What changes

Three items, all inside this repo.

**1. Bump the Hub to MVDS `0.4.0`** (`package.json`, `pnpm-lock.yaml`, `app/globals.css`)
   Move the root dependency to `^0.4.0`. Verify headings still resolve correctly on `/svg-to-stitch` (the only route opting into `.mvds-theme`) and on the Executive Function routes. (This item originally proposed deleting the `.efa-theme` / `.mvds-theme` font override at `globals.css:160–170`; apply found the override still load-bearing, so `app/globals.css` is unchanged.) Re-check the Hub's own `@theme` block against `0.4.0`'s runtime-token model — the Hub's `--color-border` override and its literal-green pin are known friction and should be left alone here if they still hold.

   `0.4.0` also brings `Input`, `Dropzone` and scoped brands into reach. **Adopting them is not part of this change** — the bump only makes them available; using them is later work with its own design pass.

**2. Reconcile the experiments registry seed** (`data/experiments.json`)
   The file holds 19 rows while `experiments/` holds 22 folders. Two are lite-schema experiments with docs directories and no registry row — `etsy-listing-kit` (a live `app/` route) and `openspec-change-visualizer`. Docs-only experiments already belong in this file (`pomodoro-maker` and `snap-issue` are both there with no code surface), so the omission is an oversight, not a convention.

   `super-css-control` is **not** added, despite having an `experiments/` folder. It uses the `bhd-experiment` schema, for which `skills/openspec-propose/SKILL.md` states `data/experiments.json` must not be touched — its row belongs in the Notion BHD Labs Database, which needs explicit approval. It also has no `experiments/<slug>/docs/` directory, the other condition that schema's gate checks.

   **`keyword-explorer` is excluded deliberately, and must stay excluded.** Its own page header records the decision in Katy's words — *"lets surface it at root ... and it might end up an experiment but not today"* (2026-09-18) — and adding a row would contradict it.

   The file is not read at runtime: its only consumers are `scripts/seed-supabase.ts` and `scripts/site-map/routes.js`, so the live cost of a missing row is that the route never reaches the Figma site-map board. That also reconciles the apparent contradiction with `skills/openspec-propose/SKILL.md`, which calls the file "a legacy seed file … not read at runtime" — accurate as to runtime, but it is still the input to the sitemap tooling, so it is worth correcting rather than deleting. Notion remains the source of truth for experiment rows; no Notion writes here.

**3. Refresh `docs/PACKAGE_CONTRIBUTION_CANDIDATES.md`**
   Two of its three MVDS candidates shipped in `0.4.0` — Dropzone landed as `Dropzone`, and the terracotta accent set landed as `themes/terracotta.css`. Mark both delivered, with the version. Replace the stale "Do not modify or publish `@beckharrisdesign/mvds` from this experiment" line, which no longer describes how this repo works. Add `Slider` as the live candidate with its two-consumer evidence, pointing at the MVDS session rather than claiming it here — this doc is the Hub's record of what it wants from the package, which is exactly the hub-side half of that work.

## Capabilities

### Modified Capabilities

- **The Hub's MVDS integration layer** — the version pin, the single brand-alpha call site, and the font-override block in `app/globals.css`.
- **The experiments registry seed** — three added rows, feeding the sitemap tooling (`keyword-explorer` stays out by prior decision).
- **The Hub's package-contribution record** — corrected to `0.4.0` reality.

No new capabilities: every item modifies an existing hub surface. No application code, no new runtime behavior.

## Handoffs

Two audit findings are real but not hub-side. Recorded here so they survive this change rather than being dropped with it.

| Finding | Goes to | Detail |
| --- | --- | --- |
| **`Slider` missing from MVDS** | The concurrent MVDS session | Two consumers worked around the same gap independently — `app/generative-sandbox/Slider.tsx` (native range input) and `image-lab/src/components/ui/slider.tsx` in `beckharrisdesign/generative-art` (composed from Radix). The generative-sandbox file says so in its own header. MVDS has **zero open issues**, so the gap is tracked nowhere but that comment. Both consumers needed split `onValueChange` / `onValueCommit` semantics. |
| **`bhd-headless-notion` has no working install path** | Its own one-file PR | Its `.npmrc` pins the whole `@beckharrisdesign` scope to `npm.pkg.github.com`, but MVDS's `publishConfig` targets `registry.npmjs.org` only — nothing is published where that repo is told to look. It also commits no lockfile (and does not gitignore one) and sits on `^0.2.0`, two majors back. |

## Impact

- **Files:** `package.json`, `pnpm-lock.yaml`, `app/globals.css`, `data/experiments.json`, `docs/PACKAGE_CONTRIBUTION_CANDIDATES.md`
- **Review surface:** the bump's risk is visual, not logical, and concentrates on the six MVDS-bearing routes — `/exec-function-assessment` (11 files, the widest component surface: `Button, Callout, Card*, Field, Inline, Label, Layer, RadioGroup*, Section, Select*, Stack`), `/svg-to-stitch`, `/generative-sandbox`, `/pdf-metadata-viewer`, plus `/admin`, which reaches MVDS through the shared `components/EtsySyncPanel.tsx` and is the etsy-notion-sync experiment's in-hub surface. `/etsy-listing-kit` is the only inherit-only route among them, and therefore the single cheap canary: if it shifts, the stylesheet moved under every route.
- **Not covered by tests.** The Hub has no visual regression suite, so verification is reading the six routes against the current deploy.
- **No Figma round** — waived by founder decision for this change (anchor, 2026-10-05). Items 1–3 alter no composition: the bump is a token/version move verified against existing routes, and items 2 and 3 are data and documentation.
- **Ordering note:** this change pins `^0.4.0`. If the MVDS session publishes `Slider` in a later version, the Hub picks it up on a subsequent bump — these two sessions do not need to coordinate a release.

## Optional links

- Audit source: `claude/mvds-consumption-audit-97dea1` (this session) — 4 consuming repos, 6 hub experiments, 8 MVDS-less standalone prototypes
- MVDS `0.4.0` release notes: `CHANGELOG.md` in `beckharrisdesign/mvds`
- Related open issue: #285 (adopt MVDS's full breakpoint set hub-wide) — adjacent token/scale reconciliation, not resolved here
