"""Random parameter search with time and run budgets."""

from __future__ import annotations

import random
import time
from dataclasses import asdict
from typing import Any, Callable

from pbn_eval.pipeline import PipelineParams, PipelineVariant, run_pipeline
from pbn_eval.metrics import compute_metrics, lab_mse_fidelity
from pbn_eval.scoring import composite_auto_score, load_scoring_config, combined_score
from pbn_eval.runs import append_jsonl, new_run_id, write_manifest


def random_params(rng: random.Random) -> PipelineParams:
    return PipelineParams(
        n_segments=rng.randint(200, 520),
        compactness=rng.uniform(8.0, 18.0),
        merge_delta_e=rng.uniform(6.0, 14.0),
        saliency_delta=rng.uniform(0.12, 0.28),
        saliency_protect_high=rng.uniform(0.45, 0.65),
        border_merge_delta_e_bonus=rng.uniform(2.0, 7.0),
    )


def run_sweep(
    rgb_u8: Any,
    *,
    project_root: Any,
    preset_name: str,
    preset: dict[str, Any],
    scoring_config_path: Any,
    variants: list[PipelineVariant] | None = None,
    seed: int = 0,
    human_scores: dict[str, float] | None = None,
) -> list[dict[str, Any]]:
    """
    preset: dict with max_runs, max_minutes, max_budget_usd, max_api_calls
    """
    variants = variants or [
        PipelineVariant.A_BASELINE,
        PipelineVariant.B_SALIENCY_PROTECT,
        PipelineVariant.C_BORDER_MERGE,
    ]
    cfg = load_scoring_config(scoring_config_path)
    weights = cfg["weights"]
    blend = float(cfg.get("human_blend", 0.35))

    rng = random.Random(seed)
    t0 = time.time()
    max_runs = int(preset["max_runs"])
    max_minutes = float(preset["max_minutes"])
    results: list[dict[str, Any]] = []

    for i in range(max_runs):
        if (time.time() - t0) / 60.0 >= max_minutes:
            break
        params = random_params(rng)
        run_batch: list[dict[str, Any]] = []
        for v in variants:
            rid = new_run_id()
            pr = run_pipeline(rgb_u8, v, params)
            m = compute_metrics(rgb_u8, pr)
            fid = lab_mse_fidelity(rgb_u8, pr)
            auto = composite_auto_score(m, fid, weights)
            total = combined_score(auto, human_scores, blend)
            record = {
                "run_id": rid,
                "preset_name": preset_name,
                "sweep_index": i,
                "variant": v.value,
                "params": asdict(params),
                "metrics": asdict(m),
                "fidelity_mse": fid,
                "scores": auto,
                "combined": total,
                "elapsed_minutes": (time.time() - t0) / 60.0,
            }
            append_jsonl(project_root, record)
            write_manifest(project_root, rid, record)
            run_batch.append(record)
        best = max(run_batch, key=lambda x: x["combined"])
        results.append(best)

    return results
