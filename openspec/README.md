# OpenSpec in Experiment Hub

This directory holds **living capability specs** (`specs/`) and a **history of completed changes** (`changes/archive/`). It complements lean experiment PRDs under `experiments/*/docs/PRD.md`: use PRDs for experiment narrative; use OpenSpec for durable hub platform behavior and reviewable requirement deltas.

**CLI:** `npx @fission-ai/openspec@latest` (or install globally). Cursor: `/opsx:propose`, `/opsx:apply`, `/opsx:archive` after IDE restart (see `.cursor/commands/`).

**Project config:** [`config.yaml`](config.yaml) sets the default workflow schema (`experiment-hub` — hub ladder templates with Evidence / Proceed / Visual board). Forked vanilla schema: `quickstart` (historic spec-driven shape). Per-change override: `openspec/changes/<name>/.openspec.yaml` → `schema: …`. Upstream package default name `spec-driven` still resolves if pinned.

**Local schemas:** [`schemas/experiment-hub/`](schemas/experiment-hub/) · [`schemas/quickstart/`](schemas/quickstart/)

**Workflow:** See [`agents/README.md`](../agents/README.md) and [`.cursor/rules/openspec-workflow.mdc`](../.cursor/rules/openspec-workflow.mdc).
