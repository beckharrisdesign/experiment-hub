"""Command-line entry: run A/B/C on an image, print metrics, save previews."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image

from pbn_eval.compare import compare_three, project_root, save_bundle_previews
from pbn_eval.runs import append_jsonl, eval_output_dir, new_run_id, write_manifest


def _load_rgb(path: Path) -> np.ndarray:
    return np.array(Image.open(path).convert("RGB"))


def main() -> None:
    root = project_root()
    ap = argparse.ArgumentParser(description="Run PBN variants A/B/C on one image.")
    ap.add_argument(
        "image",
        nargs="?",
        type=Path,
        help="RGB image path (jpg/png). Default: a tiny built-in gradient.",
    )
    ap.add_argument(
        "-o",
        "--out",
        type=Path,
        default=root / "assets" / "output",
        help="Directory for quantized PNG previews (default: assets/output/).",
    )
    ap.add_argument(
        "--log-jsonl",
        action="store_true",
        help="Append one JSON line per variant to assets/output/runs.jsonl (+ manifests/).",
    )
    args = ap.parse_args()

    if args.image is None:
        rgb = np.zeros((128, 128, 3), dtype=np.uint8)
        rgb[:, :64] = [220, 120, 80]
        rgb[:, 64:] = [40, 90, 180]
        label = "<synthetic demo>"
    else:
        p = args.image.expanduser().resolve()
        if not p.is_file():
            raise SystemExit(f"Not a file: {p}")
        rgb = _load_rgb(p)
        label = str(p)

    bundle, _cfg, _root = compare_three(rgb, root=root)
    args.out.mkdir(parents=True, exist_ok=True)
    save_bundle_previews(bundle, args.out)

    print(f"input: {label}  shape={rgb.shape}")
    for v, r, m, fid, auto in bundle:
        stem = v.value.replace(" ", "_")
        out_png = args.out / f"{stem}.png"
        print(
            f"  {v.value:22}  n_regions={m.n_regions:5}  "
            f"tiny_frac={m.tiny_region_fraction:.3f}  auto_total={auto['auto_total']:.3f}  -> {out_png}"
        )
        if args.log_jsonl:
            rid = new_run_id()
            rec = {
                "run_id": rid,
                "preset": "cli",
                "variant": v.value,
                "params": r.params,
                "metrics": m.__dict__,
                "fidelity_mse": fid,
                "auto_scores": auto,
                "combined": auto["auto_total"],
                "human": None,
                "source_image": label,
            }
            append_jsonl(root, rec)
            write_manifest(root, rid, rec)

    if args.log_jsonl:
        print("logged to", eval_output_dir(root) / "runs.jsonl")

    summary = [
        {
            "variant": v.value,
            "n_regions": m.n_regions,
            "tiny_frac": m.tiny_region_fraction,
            "mean_adjacent_delta_e": m.mean_adjacent_delta_e,
            "auto_total": auto["auto_total"],
        }
        for v, _r, m, _fid, auto in bundle
    ]
    print("summary:", json.dumps(summary))


if __name__ == "__main__":
    main()
