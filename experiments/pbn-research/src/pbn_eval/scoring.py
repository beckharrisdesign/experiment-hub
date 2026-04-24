"""Weighted composite scores from metrics + optional human rubric."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

from pbn_eval.metrics import MetricBundle, lab_mse_fidelity
from pbn_eval.pipeline import PipelineResult


def load_scoring_config(path: Path | str) -> dict[str, Any]:
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f)


def composite_auto_score(
    metrics: MetricBundle,
    fidelity_mse: float,
    weights: dict[str, float],
) -> dict[str, float]:
    """
    Higher is better. Maps metrics to [0,1] proxies then weighted sum.
    """
    # tiny_region_fraction: lower is better
    tiny_penalty = 1.0 - min(1.0, metrics.tiny_region_fraction * 80.0)
    # mean adjacent delta E: want distinguishable colors (not too low)
    de = metrics.mean_adjacent_delta_e
    separability = min(1.0, de / 25.0) if de > 0 else 0.0
    # boundary ratio: lower complexity is often easier to paint
    bg_simple = 1.0 - min(1.0, metrics.boundary_pixel_ratio * 3.0)
    # fidelity: inverse MSE
    fid = 1.0 / (1.0 + fidelity_mse * 0.02)

    subject_clarity_proxy = 0.5 * tiny_penalty + 0.5 * metrics.region_count_score
    paintability_proxy = 0.45 * tiny_penalty + 0.35 * bg_simple + 0.2 * separability

    w = weights
    auto_total = (
        w.get("tiny_region_penalty", 0.3) * tiny_penalty
        + w.get("subject_clarity_proxy", 0.25) * subject_clarity_proxy
        + w.get("paintability_proxy", 0.2) * paintability_proxy
        + w.get("fidelity_proxy", 0.15) * fid
        + w.get("background_simplicity_proxy", 0.1) * bg_simple
    )
    return {
        "auto_total": float(auto_total),
        "tiny_penalty": tiny_penalty,
        "subject_clarity_proxy": subject_clarity_proxy,
        "paintability_proxy": paintability_proxy,
        "fidelity_proxy": fid,
        "background_simplicity_proxy": bg_simple,
        "separability_proxy": separability,
    }


def combined_score(
    auto: dict[str, float],
    human: dict[str, float] | None,
    human_blend: float,
) -> float:
    """human keys: subject_clarity, paintability, background_simplicity (1-5)."""
    base = auto["auto_total"]
    if not human:
        return base
    h_avg = (
        human.get("subject_clarity", 3)
        + human.get("paintability", 3)
        + human.get("background_simplicity", 3)
    ) / 3.0
    h_norm = (h_avg - 1.0) / 4.0
    return (1.0 - human_blend) * base + human_blend * h_norm
