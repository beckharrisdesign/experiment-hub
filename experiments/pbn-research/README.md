# PBN Research Lab

Compare three pipeline variants (A/B/C), see metrics, **score in the browser**, and log runs to `assets/output/`.

The UI matches the rest of the hub: **Node + Express** under `prototype/`; Python stays responsible for CV (the server shells out to `pbn_eval`).

## Fastest path (repo root)

```bash
npm run test:pbn    # once: Python venv + editable install
npm run pbn:ui      # Express + static UI (installs prototype deps on first run)
```

Default URL: **http://127.0.0.1:3010** (override with `PORT=7860 npm run pbn:ui`).

Use **Run comparison** then **Log run with human scores**. Override the Python binary if needed: `PBN_PYTHON=/path/to/python npm run pbn:ui`.

## Install (once)

**Python (pipelines + `api_cli` subprocess):**

```bash
npm run test:pbn
```

**Or manually:**

```bash
cd experiments/pbn-research
python3 -m pip install --upgrade pip
pip install -e ".[dev]"
```

## CLI (no browser)

```bash
cd experiments/pbn-research
python -m pbn_eval.cli assets/input/your.jpg
python -m pbn_eval.cli --log-jsonl assets/input/your.jpg
```

Defaults: previews and logs under `assets/output/`. Tuning: `config/scoring_weights.yaml`, `config/sweep_presets.yaml`.

See `docs/PRD.md` for intent and **where human scoring happens**. See `docs/ENV_PHILOSOPHY.md` for layout choices.
