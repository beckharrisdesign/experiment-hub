# BHD Experiment Framework — OpenSpec schema

OpenSpec packaging of the **BHD Experiment Framework (v0.4)** for Experiment Hub. Schema package version: `1` in `schema.yaml`. Experiments move from idea to archive via four phase artifacts; phases are states, not stage-gates. All artifacts stay editable; transitions are human decisions.

**Hub integration:** Default project schema remains `experiment-hub-lite` in [`openspec/config.yaml`](../../config.yaml). Use per-change override:

```yaml
# openspec/changes/<name>/.openspec.yaml
schema: bhd-experiment
```

**Dual track:** This schema owns product lifecycle (`explore.md` → `archive.md`). Code implementation uses a **child** change with `schema: experiment-hub-lite` and `/opsx:apply` on that child only.

## Layout

```
openspec/schemas/bhd-experiment/
├── schema.yaml
└── templates/
    ├── explore.md
    ├── propose.md
    ├── apply.md
    └── archive.md
```

## Artifact chain

```
explore → propose → apply → archive
```

`requires:` enforces generation order, not completion. Artifacts can be edited in any phase.

## Persistent stores (stub paths)

Stores are not in this folder yet. Agents should read when present:

| Store                       | Path                                                                   |
| --------------------------- | ---------------------------------------------------------------------- |
| Soul                        | `docs/founder/soul.md` (pending)                                       |
| Goals                       | `docs/founder/goals.md` (pending)                                      |
| Scoring                     | [`rules/scoring-criteria.mdc`](../../../rules/scoring-criteria.mdc)    |
| Business / Service patterns | `docs/founder/business-patterns.md`, `service-patterns.md` (pending)   |
| BHD Ecosystem               | `docs/founder/bhd-ecosystem.md` (pending)                              |
| Surfaces / design patterns  | `docs/founder/bhd-surfaces.md`, `product-design-patterns.md` (pending) |
| Pattern candidates          | `docs/founder/pattern-candidates.md` (pending)                         |

Per-phase rules: [`rules/bhd-experiment.mdc`](../../../rules/bhd-experiment.mdc).

## CLI

```bash
npx @fission-ai/openspec@latest schema validate bhd-experiment
openspec new change my-experiment --schema bhd-experiment
openspec status --change my-experiment --json
```

Slash commands: `/opsx:propose`, `/opsx:apply`, `/opsx:archive` — see [`skills/openspec-*.md`](../../../skills/) and [`rules/openspec-workflow.mdc`](../../../rules/openspec-workflow.mdc).

## What this schema does not do

- Enforce phase transitions (human decisions)
- Auto-merge pattern store write-backs (Archive proposes diffs; human accepts)
- Run validation campaigns (Validation Plan describes the test only)
- Auto-detect Build Unit live state (deferred integration)

## Versioning

OpenSpec `version` in `schema.yaml` is an integer (currently `1`). The human framework doc is **v0.4** — keep those in sync in description/README when `framework.md` (katy-skills repo) changes.

## Dual-track pilot (smoke checklist)

Run on one active experiment slug (e.g. `simple-seed-organizer`):

1. `openspec new change <slug>-bhd --schema bhd-experiment`
2. `/opsx:propose` — generate `explore.md` only; approve; repeat through `archive.md` stubs as needed
3. `openspec new change <slug>-build --schema experiment-hub-lite` — Human anchor quotes parent `explore.md` hypothesis
4. `/opsx:apply` on **child** only (tasks + commit/PR)
5. `/opsx:archive` each change when done

Validation (2026-05-20): `openspec schema validate bhd-experiment` ✓; `applyRequires: ["apply"]` (not `archive`).

Success criteria: no `proposal.md` on BHD parent; scores use `rules/scoring-criteria.mdc`; agent turns end with `## Artifacts`.
