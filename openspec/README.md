# OpenSpec in Experiment Hub

This directory holds **living capability specs** (`specs/`) and a **history of completed changes** (`changes/archive/`). It complements lean experiment PRDs under `experiments/*/docs/PRD.md`: use PRDs for experiment narrative; use OpenSpec for durable hub platform behavior and reviewable requirement deltas.

**CLI:** `npx @fission-ai/openspec@latest` (or install globally). Cursor: `/opsx:propose`, `/opsx:apply`, `/opsx:archive` after IDE restart (see `.cursor/commands/`).

**Project config:** [`config.yaml`](config.yaml) sets the default workflow schema (**`experiment-hub-lite`** — intent-first spikes: Human anchor, Outcomes, hub skill voices per artifact). Per-change override: `openspec/changes/<name>/.openspec.yaml` → `schema: …`.

| Schema                              | Use when                                                              |
| ----------------------------------- | --------------------------------------------------------------------- |
| **`experiment-hub-lite`** (default) | New experiment spikes, prototypes under `experiments/`                |
| **`experiment-hub`**                | Sponsor-backed ladder (Evidence / Proceed), platform cross-cutting    |
| **`quickstart`**                    | Vanilla / upstream comparison (`spec-driven` alias may still resolve) |

**Local schemas:** [`schemas/experiment-hub-lite/`](schemas/experiment-hub-lite/) (default) · [`schemas/experiment-hub/`](schemas/experiment-hub/) (full ladder — reference / sponsor) · [`schemas/quickstart/`](schemas/quickstart/)

**Workflow:** See [`agents/README.md`](../agents/README.md) and [`.cursor/rules/openspec-workflow.mdc`](../.cursor/rules/openspec-workflow.mdc).
