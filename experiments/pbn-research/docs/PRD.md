# PBN Research Lab — PRD

## Overview

Personal research workspace to compare paint-by-number generation pipelines side by side, score outcomes automatically (and optionally with a human rubric), and run budgeted parameter sweeps with checkpointed manifests—without building product UI first.

## Problem Statement

Paint-by-number quality depends on region layout, palette reduction, and where merges are allowed. Ad-hoc tweaking does not scale; we need reproducible runs, metrics, and versioned artifacts.

## Goals & Objectives

- Run at least three pipeline variants on the same image in one notebook session.
- Persist every run to `artifacts/runs.jsonl` and per-run JSON manifests.
- Support sweep presets (`fast_tight`, `deep_dive`, `overnight`) with preflight time estimates.
- Stay local-first: no paid APIs in default configs.

## Target User

Solo researcher (you) iterating on algorithms before any commercial packaging.

## Core Features

1. **Eval notebook** — upload image, render A/B/C outputs and metric table.
2. **Composite scoring** — weighted auto-metrics aligned with `config/scoring_weights.yaml`.
3. **Sweep helper** — random search with `max_runs` / `max_minutes` / `$0` budget defaults.
4. **Run registry** — append-only JSONL plus manifests for resume-friendly batches.

## Technical Requirements

- Python 3.9+ with `packages/pbn_eval` on `PYTHONPATH`.
- Optional: Jupyter / VS Code notebook kernel.

## Success Metrics

- Three variants run on one uploaded image in under a few minutes on a laptop for typical resolutions.
- Re-running with the same seed and params yields identical manifests (deterministic given fixed deps).

## Validation Plan (Landing Page)

Not applicable (personal / research).
