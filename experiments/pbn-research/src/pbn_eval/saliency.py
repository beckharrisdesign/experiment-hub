"""Cheap pseudo-saliency for merge protection (no HF models)."""

from __future__ import annotations

import numpy as np
from scipy import ndimage


def pseudo_saliency_rgb(rgb: np.ndarray) -> np.ndarray:
    """
    Return float32 map in [0,1]: edges + center bias (subjects often near center).
    rgb: HxWx3 float [0,1] or uint8
    """
    if rgb.dtype != np.float32:
        rgb = rgb.astype(np.float32) / 255.0
    gray = 0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]
    gx = ndimage.sobel(gray, axis=1)
    gy = ndimage.sobel(gray, axis=0)
    mag = np.sqrt(gx * gx + gy * gy)
    mag = mag / (np.percentile(mag, 99) + 1e-6)
    mag = np.clip(mag, 0, 1)

    h, w = gray.shape
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    cx, cy = (w - 1) / 2.0, (h - 1) / 2.0
    dist = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
    dist = dist / (dist.max() + 1e-6)
    center = 1.0 - dist

    sal = 0.65 * mag + 0.35 * center
    return np.clip(sal, 0, 1).astype(np.float32)


def region_mean_saliency(labels: np.ndarray, saliency: np.ndarray) -> dict[int, float]:
    """Mean saliency per region id (only labels that appear)."""
    flat = labels.ravel()
    w = saliency.ravel()
    nbin = int(flat.max()) + 1
    sums = np.bincount(flat, weights=w, minlength=nbin)
    counts = np.bincount(flat, minlength=nbin).astype(np.float64)
    counts = np.maximum(counts, 1.0)
    out: dict[int, float] = {}
    for rid in np.unique(flat):
        rid = int(rid)
        out[rid] = float(sums[rid] / counts[rid])
    return out


def touches_border_mask(labels: np.ndarray) -> np.ndarray:
    """Boolean per region id: True if any pixel of region touches image border."""
    edges = np.concatenate(
        [
            labels[0, :].ravel(),
            labels[-1, :].ravel(),
            labels[:, 0].ravel(),
            labels[:, -1].ravel(),
        ]
    )
    touch = np.zeros(int(labels.max()) + 1, dtype=bool)
    for e in np.unique(edges):
        touch[int(e)] = True
    return touch
