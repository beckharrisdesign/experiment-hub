"""Run A/B/C comparison on one RGB image (shared by CLI and UI)."""

from __future__ import annotations

from pathlib import Path
import numpy as np
from PIL import Image

from pbn_eval.metrics import MetricBundle, compute_metrics, lab_mse_fidelity
from pbn_eval.pipeline import PipelineParams, PipelineVariant, PipelineResult, run_pipeline
from pbn_eval.scoring import composite_auto_score, load_scoring_config

BundleRow = tuple[PipelineVariant, PipelineResult, MetricBundle, float, dict[str, float]]


def project_root() -> Path:
    return Path(__file__).resolve().parents[2]


def rgb_u8(arr: np.ndarray) -> np.ndarray:
    """uint8 passthrough; float images from pipeline are in [0, 1] (see _quantize), not [0, 255]."""
    if arr.dtype == np.uint8:
        return arr
    a = np.asarray(arr, dtype=np.float64)
    if float(a.max()) <= 1.0 + 1e-3:
        return np.clip(np.round(a * 255.0), 0.0, 255.0).astype(np.uint8)
    return np.clip(a, 0.0, 255.0).astype(np.uint8)


def load_rgb_path(path: Path) -> np.ndarray:
    return np.array(Image.open(path).convert("RGB"))


def compare_three(
    rgb_u8: np.ndarray,
    *,
    root: Path | None = None,
    params: PipelineParams | None = None,
) -> tuple[list[BundleRow], dict[str, object], Path]:
    """
    Run baseline / saliency / border-merge on the same image.
    Returns (bundle, scoring_config_yaml_dict, project_root).
    """
    root = root or project_root()
    cfg = load_scoring_config(root / "config" / "scoring_weights.yaml")
    weights = cfg["weights"]
    params = params or PipelineParams()
    variants = (
        PipelineVariant.A_BASELINE,
        PipelineVariant.B_SALIENCY_PROTECT,
        PipelineVariant.C_BORDER_MERGE,
    )
    bundle: list[BundleRow] = []
    for v in variants:
        r = run_pipeline(rgb_u8, v, params)
        m = compute_metrics(rgb_u8, r)
        fid = lab_mse_fidelity(rgb_u8, r)
        auto = composite_auto_score(m, fid, weights)
        bundle.append((v, r, m, fid, auto))
    return bundle, cfg, root


def save_bundle_previews(bundle: list[BundleRow], out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    for v, r, _m, _fid, _auto in bundle:
        stem = v.value.replace(" ", "_")
        Image.fromarray(rgb_u8(r.quantized_rgb)).save(out_dir / f"{stem}.png")
