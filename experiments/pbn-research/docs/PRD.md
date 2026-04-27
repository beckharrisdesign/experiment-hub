# PBN Research Lab — PRD (research-first, human-friendly)

## Who this is for

You, doing qualitative + quantitative comparison of paint-by-number style pipelines—not maintaining packaging or hunting for output files as the primary interface.

## What “done” looks like

1. Open the **local Express prototype** (`npm run pbn:ui` → `experiments/pbn-research/prototype/`), pick or upload a photo, and see **input + three variants** side by side.
2. Read **auto metrics** in the same screen (table).
3. Set **human rubric** sliders (1–5) when you want subjective scores—not by editing Python dicts.
4. Click **once** to **log** that run (auto + human + combined score per variant) under `assets/output/`.
5. Optionally use **CLI** or **sweeps** for batch work; the UI remains the default loop for judging output.

## Where you score things

**In the web page**, after **Run comparison**:

- Sliders: **Subject clarity**, **Paintability**, **Background simplicity** (1 = poor, 5 = great). These map to `combined_score()` in `scoring.py` and blend with auto scores using `human_blend` in `config/scoring_weights.yaml`.
- **Log run with human scores** reads the **last successful Run comparison** from `assets/output/_web_last/summary.json`, blends your rubric with each variant’s auto score via `combined_score()`, and appends **three rows** (one per variant) to `assets/output/runs.jsonl` plus one JSON file per row under `assets/output/manifests/`. If you change the image or parameters, click **Run comparison** again before logging so `summary.json` matches what you are judging.

If you skip logging, you still get on-screen metrics and PNGs in `assets/output/` for the previews.

## Layout on disk

| Path                          | Role                                         |
| ----------------------------- | -------------------------------------------- |
| `assets/input/`               | Your reference photos (jpg/png/webp).        |
| `assets/output/`              | Generated previews, `runs.jsonl`, manifests. |
| `config/scoring_weights.yaml` | Auto metric weights + `human_blend`.         |
| `config/sweep_presets.yaml`   | Sweep budgets (for non-UI batch runs).       |

## Core capabilities

1. **UI (primary)** — `npm run pbn:ui` from repo root (Express + static assets); Python runs via `python -m pbn_eval.api_cli` subprocesses.
2. **CLI (secondary)** — `python -m pbn_eval.cli [image]` for scripts / CI; same pipelines and `assets/output/` defaults.
3. **Composite scoring** — auto metrics + optional human blend, aligned with YAML.
4. **Sweep helper** — `pbn_eval.sweep` for budgeted search (advanced; no dedicated UI yet).

## Technical requirements

- Python 3.9+
- Install once: from `experiments/pbn-research`, `pip install -e ".[dev]"` (or `npm run test:pbn` to create `.venv` and install).

## Success criteria

- You can go from “fresh clone” to **judging outputs in the browser** in one install + one command.
- A/B/C on a typical phone photo completes in a few minutes on a laptop (large images are still bounded by pipeline defaults).

## Validation / product landing

Not in scope—personal research tooling only.
