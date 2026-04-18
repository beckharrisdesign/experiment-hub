"""SLIC + Lab palette + region-graph merge (three policy variants)."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Any

import numpy as np
from skimage import color, segmentation
from skimage.color import deltaE_ciede2000

from pbn_eval.saliency import pseudo_saliency_rgb, region_mean_saliency, touches_border_mask


class PipelineVariant(str, Enum):
    A_BASELINE = "A_baseline"
    B_SALIENCY_PROTECT = "B_saliency_protect"
    C_BORDER_MERGE = "C_border_aggressive_merge"


@dataclass
class PipelineParams:
    n_segments: int = 380
    compactness: float = 10.0
    merge_delta_e: float = 9.0
    max_merges: int = 4_000
    saliency_delta: float = 0.18
    saliency_protect_high: float = 0.55
    border_merge_delta_e_bonus: float = 4.0


@dataclass
class PipelineResult:
    variant: str
    params: dict[str, Any]
    labels: np.ndarray
    quantized_rgb: np.ndarray
    palette_lab: np.ndarray
    region_ids: np.ndarray
    meta: dict[str, Any]


def _build_adjacency(labels: np.ndarray) -> set[tuple[int, int]]:
    h, w = labels.shape
    edges: set[tuple[int, int]] = set()
    a = labels
    for dy, dx in ((0, 1), (1, 0)):
        b = np.roll(a, -dy, axis=0) if dy else a
        b = np.roll(b, -dx, axis=1) if dx else b
        if dy:
            b[-dy:, :] = a[-dy:, :]
        if dx:
            b[:, -dx:] = a[:, -dx:]
        m = a != b
        ys, xs = np.where(m)
        for y, x in zip(ys, xs):
            u, v = int(a[y, x]), int(b[y, x])
            if u == v:
                continue
            if u > v:
                u, v = v, u
            edges.add((u, v))
    return edges


def _region_mean_lab(labels: np.ndarray, lab_full: np.ndarray) -> dict[int, np.ndarray]:
    out: dict[int, np.ndarray] = {}
    for rid in np.unique(labels):
        mask = labels == rid
        out[int(rid)] = lab_full[mask].mean(axis=0)
    return out


def _merge_regions_iterative(
    labels: np.ndarray,
    lab_full: np.ndarray,
    variant: PipelineVariant,
    params: PipelineParams,
    saliency_map: np.ndarray,
) -> np.ndarray:
    cur = labels.astype(np.int32).copy()
    sal_mean = region_mean_saliency(cur, saliency_map)
    merges = 0

    while merges < params.max_merges:
        mean_lab = _region_mean_lab(cur, lab_full)
        edges = _build_adjacency(cur)
        border_touch_ids = (
            touches_border_mask(cur) if variant == PipelineVariant.C_BORDER_MERGE else None
        )
        best: tuple[float, int, int] | None = None

        for u0, v0 in edges:
            u, v = int(u0), int(v0)
            if u == v:
                continue
            de = float(
                deltaE_ciede2000(
                    mean_lab[u][np.newaxis, :],
                    mean_lab[v][np.newaxis, :],
                )[0]
            )
            thresh = params.merge_delta_e
            if variant == PipelineVariant.C_BORDER_MERGE and border_touch_ids is not None:
                if border_touch_ids[u] and border_touch_ids[v]:
                    thresh += params.border_merge_delta_e_bonus
            if de > thresh:
                continue
            if variant == PipelineVariant.B_SALIENCY_PROTECT:
                su, sv = sal_mean.get(u, 0.0), sal_mean.get(v, 0.0)
                if su > params.saliency_protect_high and sv > params.saliency_protect_high:
                    if abs(su - sv) > params.saliency_delta:
                        continue
                if su > params.saliency_protect_high or sv > params.saliency_protect_high:
                    if de > params.merge_delta_e * 0.85:
                        continue
            cand = (de, min(u, v), max(u, v))
            if best is None or cand[0] < best[0]:
                best = cand

        if best is None:
            break
        _, keep, remove = best
        if keep == remove:
            break
        cur[cur == remove] = keep
        sal_mean = region_mean_saliency(cur, saliency_map)
        merges += 1

    return cur


def _quantize(
    rgb: np.ndarray,
    labels: np.ndarray,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    h, w, _ = rgb.shape
    rgb_f = rgb.astype(np.float64) / 255.0 if rgb.dtype == np.uint8 else np.clip(rgb, 0, 1)
    rgb_flat = rgb_f.reshape(-1, 3)
    lab_flat = color.rgb2lab(rgb_f.reshape(h, w, 3)).reshape(-1, 3)
    rgb_out = np.zeros_like(rgb_f)
    lab_list = []
    ids = sorted(np.unique(labels).tolist())
    id_map: dict[int, int] = {}
    for new_id, rid in enumerate(ids):
        id_map[int(rid)] = new_id
        mask = labels.ravel() == rid
        mean_rgb = rgb_flat[mask].mean(axis=0)
        mean_lab = lab_flat[mask].mean(axis=0)
        lab_list.append(mean_lab)
        rgb_out.reshape(-1, 3)[mask] = mean_rgb
    lab_palette_arr = np.stack(lab_list, axis=0)
    remapped = np.vectorize(id_map.get)(labels)
    return np.clip(rgb_out, 0, 1), lab_palette_arr, remapped.astype(np.int32)


def run_pipeline(
    rgb: np.ndarray,
    variant: PipelineVariant,
    params: PipelineParams | None = None,
) -> PipelineResult:
    if params is None:
        params = PipelineParams()
    if rgb.dtype != np.uint8:
        rgb_u8 = (np.clip(rgb, 0, 1) * 255).astype(np.uint8)
    else:
        rgb_u8 = rgb

    raw_labels = segmentation.slic(
        rgb_u8,
        n_segments=params.n_segments,
        compactness=params.compactness,
        sigma=1,
        start_label=0,
    ).astype(np.int32)

    rgb_f = rgb_u8.astype(np.float64) / 255.0
    lab_full = color.rgb2lab(rgb_f)
    sal_map = pseudo_saliency_rgb(rgb_u8)

    merged = _merge_regions_iterative(
        raw_labels,
        lab_full,
        variant,
        params,
        sal_map,
    )

    quantized, palette_lab, remapped = _quantize(rgb_u8, merged)

    meta = {
        "n_regions_raw": int(len(np.unique(raw_labels))),
        "n_regions_merged": int(len(np.unique(merged))),
    }
    return PipelineResult(
        variant=variant.value,
        params={
            "n_segments": params.n_segments,
            "compactness": params.compactness,
            "merge_delta_e": params.merge_delta_e,
            "variant": variant.value,
        },
        labels=remapped,
        quantized_rgb=quantized,
        palette_lab=palette_lab,
        region_ids=np.unique(remapped),
        meta=meta,
    )
