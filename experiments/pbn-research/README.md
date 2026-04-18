# PBN Research Lab

Notebook-first evaluation for paint-by-number pipelines (local CV, no API by default).

## Quick start

```bash
cd experiments/pbn-research
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export PYTHONPATH=packages
jupyter notebook notebooks/pbn_eval.ipynb
```

Artifacts and run logs go under `artifacts/` (gitignored). Configs: `config/scoring_weights.yaml`, `config/sweep_presets.yaml`.
