"""Rough wall-time and artifact-size estimate before a sweep."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np
import yaml


def load_presets(path: Path | str) -> dict[str, Any]:
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f)


def estimate_sweep(
    preset_name: str,
    presets_path: Path | str,
    image_shape: tuple[int, int, int],
    seconds_per_run_empirical: float | None = None,
) -> dict[str, Any]:
    """
    If seconds_per_run_empirical is None, use a heuristic from pixel count.
    """
    presets = load_presets(presets_path)["presets"]
    if preset_name not in presets:
        raise KeyError(f"Unknown preset {preset_name}")
    p = presets[preset_name]
    max_runs = int(p["max_runs"])
    h, w, _ = image_shape
    pixels = h * w
    if seconds_per_run_empirical is None:
        # heuristic: SLIC + merges scale with pixels
        sec = 0.002 + pixels / 2_500_000.0
    else:
        sec = seconds_per_run_empirical
    total_sec = sec * max_runs
    # three variants in notebook ~ 3x single
    total_sec *= 3.0
    bytes_per_png = int(pixels * 3 * 0.35)
    storage = bytes_per_png * max_runs * 3
    return {
        "preset": preset_name,
        "max_runs": max_runs,
        "max_minutes": p.get("max_minutes"),
        "estimated_seconds": float(total_sec),
        "estimated_artifact_bytes": storage,
        "max_budget_usd": p.get("max_budget_usd"),
        "max_api_calls": p.get("max_api_calls"),
    }
