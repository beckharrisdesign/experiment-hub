"""Smoke tests for pbn_eval (run: cd experiments/pbn-research && pytest test_smoke.py)."""

import numpy as np

from pbn_eval.pipeline import PipelineParams, PipelineVariant, run_pipeline
from pbn_eval.metrics import compute_metrics, lab_mse_fidelity
from pbn_eval.scoring import composite_auto_score


def test_pipeline_three_variants():
    rgb = np.zeros((48, 48, 3), dtype=np.uint8)
    rgb[:, :24] = [200, 100, 50]
    rgb[:, 24:] = [30, 140, 200]
    p = PipelineParams(n_segments=40, max_merges=100)
    for v in (
        PipelineVariant.A_BASELINE,
        PipelineVariant.B_SALIENCY_PROTECT,
        PipelineVariant.C_BORDER_MERGE,
    ):
        r = run_pipeline(rgb, v, p)
        assert r.quantized_rgb.shape == (48, 48, 3)
        m = compute_metrics(rgb, r)
        assert m.n_regions >= 1
        fid = lab_mse_fidelity(rgb, r)
        auto = composite_auto_score(
            m,
            fid,
            {
                "tiny_region_penalty": 0.3,
                "subject_clarity_proxy": 0.25,
                "paintability_proxy": 0.2,
                "fidelity_proxy": 0.15,
                "background_simplicity_proxy": 0.1,
            },
        )
        assert "auto_total" in auto
