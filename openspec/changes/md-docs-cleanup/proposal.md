## Human anchor

> a cleanup pass of md files and documentation in my codebase

> mostly I feel like documentation lives in a ton of places, including a ton of md files that are orphaned. I am less worried about top level structure and more interested in suggestions of files that are no longer relevant to my current experiments.

## Outcomes

- **Who:** You, deciding what doc debt to keep vs cut; agents should not guess deletions without your sign-off per bucket.
- **Job:** Get a **prioritized inventory** of markdown that no longer serves **Active** experiments (per `data/experiments.json`) or shipped hub tools you still use—grouped by recommendation (archive / delete / keep / register), not a rewrite of index files.
- **Done when:** (1) A committed inventory artifact lists every candidate path with rationale tied to experiment status or superseded work. (2) You have approved at least one bucket (e.g. all Abandoned `experiments/*/docs/` trees, or stale OpenSpec pilot folders) for apply to execute. (3) `data/documentation.json` and prototype rows no longer point at dead experiment IDs (e.g. `etsy-embroidery-pattern-manager`).
- **Not doing:** Polishing prose in live PRDs; restructuring `rules/` vs `skills/`; bulk-deleting `openspec/changes/archive/**` history; vendored Figma skills; auto-removing Abandoned experiment **code** trees without explicit approval.

## Why

Docs accumulated across `experiments/*/docs/`, OpenSpec change folders, `data/*.json` hub metadata, prototype READMEs, and skills—often for experiments now **Abandoned** or **Archived**, or for pilots already merged. That creates orphan surfaces: agents grep stale PRDs, you reopen wrong folders, and registry JSON drifts from disk (`documentation.json` still references `etsy-embroidery-pattern-manager`). A relevance-first pass reduces noise before any “single entrypoint” doc architecture work.

**Current Active experiments** (source of truth: `data/experiments.json`): `etsy-listing-manager`, `simple-seed-organizer`, `best-day-ever`, `web-to-figma-grabber`, `pbn-research`, `pomodoro-maker`.

**Still used but not in `experiments.json`:** `snap-issue` (Chrome extension; README callout + `data/prototypes.json`) — treat as **keep + register**, not orphan.

## What changes

### Deliverable: documentation inventory

Produce `openspec/changes/md-docs-cleanup/DOC_INVENTORY.md` (or equivalent) during apply, seeded from the audit below. Each row: path, category, recommendation, notes.

### Apply buckets (after your approval)

1. **Abandoned experiment doc trees** — archive or delete `experiments/<slug>/docs/*.md` where `status` is Abandoned/Archived (optional: move to `experiments/<slug>/docs/archive/` instead of delete).
2. **Unregistered tool folders** — resolve `photo-filters-banner`, `snap-issue` (register in JSON vs remove prototype row).
3. **Stale active OpenSpec changes** — archive pilot/disposable folders; do not touch `openspec/changes/archive/**` contents.
4. **JSON/registry orphans** — fix `data/documentation.json` broken `experimentId` values; trim doc rows for abandoned experiments if hub UI should not surface them.
5. **Within Active experiments** — flag **superseded one-off specs** (e.g. SSO build specs) for archive only when shipped or duplicated in `openspec/changes/archive/`.

### Deprioritized (per your steer)

- Fixing `agents/README.md` / `AGENT_ARCHITECTURE.md` path drift — only touch if a kept doc links to a removed file.

## Initial audit — draft recommendations

Ratings: **DELETE** (safe to remove after approval) · **ARCHIVE** (move to archive folder or OpenSpec archive) · **KEEP** · **REGISTER** (add/fix `experiments.json`)

### A — Abandoned experiment `docs/` — founder decisions (2026-05-21)

One Y/N per experiment folder (`Y` = remove all `docs/*.md` in that folder).

| #   | Experiment                         | Decision     | Files |
| --- | ---------------------------------- | ------------ | ----- |
| 1   | `seed-finder`                      | **N** keep   | 15    |
| 2   | `experience-principles-repository` | **Y** remove | 3     |
| 3   | `garden-guide-generator`           | **Y** remove | 3     |
| 4   | `photo-memories`                   | **N** keep   | 2     |
| 5   | `the-illuminator`                  | **N** keep   | 2     |
| 6   | `ai-event-landing-zone`            | **N** keep   | 2     |

**Apply (when approved):** Delete only rows 2 and 3 (6 files under `experience-principles-repository/docs/` and `garden-guide-generator/docs/`).

### B — Experiment dirs not in `experiments.json`

| Path                                | Recommendation            | Note                                                                                                              |
| ----------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `experiments/snap-issue/`           | **REGISTER**              | Shipped extension; in README + `proto-snap-issue`; no `docs/`                                                     |
| `experiments/photo-filters-banner/` | **ARCHIVE** or **DELETE** | Prototype only; OpenSpec change already in `archive/2026-05-16-photo-filters-banner-download/`; no experiment row |

### C — Active OpenSpec changes (8 folders) — stale vs live

| Change                            | Recommendation            | Note                                                                                                     |
| --------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------- |
| `hub-schema-pilot-20260508`       | **ARCHIVE**               | Disposable schema smoke test (`tasks` 0/1)                                                               |
| `hub-quickstart-ab-20260508`      | **ARCHIVE**               | Dated pilot; no `tasks.md`                                                                               |
| `seed-packet-crud-fields`         | **ARCHIVE** after confirm | 35/36 tasks; overlaps archived `seed-packet-crud-and-custom-fields` — verify merge shipped before remove |
| `sso-seed-fields-and-annotations` | **KEEP**                  | 0/36 — in-flight SSO work                                                                                |
| `fix-landing-column-alignment`    | **KEEP**                  | Active landing bug (#120)                                                                                |
| `dynamic-hub-experiment-list`     | **KEEP**                  | In progress                                                                                              |
| `pomodoro-maker`                  | **KEEP**                  | BHD parent; `explore.md` only                                                                            |
| `md-docs-cleanup`                 | **KEEP**                  | This change                                                                                              |

### D — `data/documentation.json` orphans

| Row                                                                  | Issue                                                              | Recommendation                                     |
| -------------------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------- |
| `doc-etsy-embroidery`                                                | `experimentId`: `etsy-embroidery-pattern-manager` (does not exist) | **Fix** → `etsy-listing-manager` or **DELETE** row |
| `doc-seed-finder`                                                    | Abandoned experiment                                               | **DELETE** row or mark abandoned in hub            |
| `doc-pbn-research`, `doc-web-to-figma-grabber`, `doc-pomodoro-maker` | Active                                                             | **KEEP**                                           |

Missing doc rows for Active experiments with rich `docs/`: `best-day-ever`, `simple-seed-organizer`, `etsy-listing-manager` — **REGISTER** optional follow-up, not delete.

### E — Active experiment docs worth scrutinizing (not auto-delete)

One-off or spike markdown that may be **done** but live under Active slugs—review before delete:

| Path                                                                                                  | Suggestion                                   |
| ----------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `experiments/simple-seed-organizer/docs/BULK_CAMERA_BUILD_SPEC.md`                                    | **ARCHIVE** if bulk camera shipped           |
| `experiments/simple-seed-organizer/docs/landing-figma-inventory.md`                                   | **ARCHIVE** after Figma parity shipped       |
| `experiments/simple-seed-organizer/docs/ad-campaign-content.md`                                       | **KEEP** or archive if campaign ended        |
| `experiments/etsy-listing-manager/docs/PRD-REVIEW.md`, `DESIGN_REVIEW.md`, `TESTING_LISTING_AGENT.md` | **ARCHIVE** when superseded by PRD/learnings |
| `experiments/best-day-ever/docs/ad-campaign-content.md`, `landing-page-content.md`                    | **KEEP** if landing live                     |
| `experiments/pbn-research/docs/HF_MODEL_SHORTLIST.md`, `ENV_PHILOSOPHY.md`                            | **KEEP** (active R&D)                        |
| `experiments/pomodoro-maker/docs/intent.md`                                                           | **KEEP** (only doc; BHD source)              |

Prototype-internal `.md` under `experiments/simple-seed-organizer/prototype/app/` (AUTH_SETUP, STRIPE, etc.) — **KEEP**; operational, not marketing orphans.

### F — Hub / meta markdown (low priority unless linked)

| Path                                            | Suggestion                                                               |
| ----------------------------------------------- | ------------------------------------------------------------------------ |
| `AGENT_ARCHITECTURE.md`                         | **KEEP**; describes legacy `/agents/` layout — optional trim, not delete |
| `.cursor/MCP_APPROACH_COMPARISON.md`            | **DELETE** or move to `docs/internal/` if unused                         |
| Root `README.md` `agents/` in project structure | **Fix** one line when touching README for registry work                  |

### G — Already archived (do not delete in this pass)

`openspec/changes/archive/*` (14 dated folders) — historical record; inventory may **reference** duplicates (e.g. photo-filters, snap-issue) but apply does not bulk-remove.

## Capabilities

### New Capabilities

- `docs-relevance-inventory`: Machine- and human-readable inventory of markdown paths with experiment status, recommendation tier, and approval gates before delete/archive.

- `docs-registry-alignment`: `data/documentation.json`, `data/prototypes.json`, and `data/experiments.json` agree with on-disk experiment dirs (including `snap-issue` / `photo-filters-banner` resolution).

### Modified Capabilities

- _(none — audit and cleanup only)_

## Impact

- **Primary:** `DOC_INVENTORY.md`, selective deletes/archives under `experiments/`, OpenSpec folder archives, `data/documentation.json`.
- **Active experiment code:** untouched unless you approve per-path deletes in section E.
- **No UI** unless hub Documentation page should hide abandoned rows — call out in specs if needed.
- **Risk:** Medium for mistaken deletes — mitigated by bucket approval and git history.

## Optional links

- Active experiments: [`data/experiments.json`](../../../data/experiments.json)
- Hub documentation data: [`data/documentation.json`](../../../data/documentation.json)
- Snap Issue install: [`experiments/snap-issue/extension/README.md`](../../../experiments/snap-issue/extension/README.md)
