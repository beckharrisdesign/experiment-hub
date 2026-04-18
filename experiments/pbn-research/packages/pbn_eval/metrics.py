"""Automatic PBN quality proxies."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from skimage import color
from skimage.color import deltaE_ciede2000
from skimage.segmentation import find_boundaries

from pbn_eval.pipeline import PipelineResult


@dataclass
class MetricBundle:
    n_regions: int
    tiny_region_fraction: float
    mean_adjacent_delta_e: float
    boundary_pixel_ratio: float
    region_count_score: float


def _boundary_mask(labels: np.ndarray) -> np.ndarray:
    return find_boundaries(labels, mode="inner")


def compute_metrics(
    rgb_source_u8: np.ndarray,
    result: PipelineResult,
    tiny_area_frac: float = 0.001,
) -> MetricBundle:
    """rgb_source_u8: original HxWx3 for fidelity proxy."""
    labels = result.labels
    h, w = labels.shape
    total = h * w
    counts = np.bincount(labels.ravel())
    tiny = 0
    for c in counts:
        if c > 0 and c / total < tiny_area_frac:
            tiny += c
    tiny_fraction = float(tiny / total)

    # Adjacent Delta E (sample up to 200k boundary pixels)
    lab_q = color.rgb2lab(result.quantized_rgb)
    bd = _boundary_mask(labels)
    ys, xs = np.where(bd)
    idx = np.linspace(0, ys.size - 1, num=min(ys.size, 200_000), dtype=int)
    des = []
    for ii in idx:
        y, x = int(ys[ii]), int(xs[ii])
        for dx, dy in ((1, 0), (0, 1)):
            y2, x2 = y + dy, x + dx
            if y2 >= h or x2 >= w:
                continue
            if labels[y, x] == labels[y2, x2]:
                continue
            des.append(
                float(
                    deltaE_ciede2000(
                        lab_q[y, x][np.newaxis, :],
                        lab_q[y2, x2][np.newaxis, :],
                    )[0]
                )
            )
    mean_de = float(np.mean(des)) if des else 0.0

    boundary_ratio = float(np.count_nonzero(bd) / total)

    n = int(len(np.unique(labels)))
    # Soft target band for "moderate" complexity (tunable)
    target_lo, target_hi = 60, 140
    if target_lo <= n <= target_hi:
        rc_score = 1.0
    elif n < target_lo:
        rc_score = max(0.0, 1.0 - (target_lo - n) / target_lo)
    else:
        rc_score = max(0.0, 1.0 - (n - target_hi) / 300.0)

    return MetricBundle(
        n_regions=n,
        tiny_region_fraction=tiny_fraction,
        mean_adjacent_delta_e=mean_de,
        boundary_pixel_ratio=boundary_ratio,
        region_count_score=rc_score,
    )


def lab_mse_fidelity(rgb_source_u8: np.ndarray, result: PipelineResult) -> float:
    """Lower is better — used as inverse fidelity proxy."""
    a = rgb_source_u8.astype(np.float64) / 255.0
    b = result.quantized_rgb.astype(np.float64)
    if b.max() > 1.01:
        b = b / 255.0
    la = color.rgb2lab(a)
    lb = color.rgb2lab(b)
    return float(np.mean((la - lb) ** 2))
