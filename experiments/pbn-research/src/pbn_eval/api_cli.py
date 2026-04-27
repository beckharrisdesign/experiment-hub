"""JSON CLI invoked by the Node/Express prototype: run A/B/C or log human scores (one JSON object per stdout line)."""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from pathlib import Path

from PIL import Image

from pbn_eval.compare import compare_three, load_rgb_path, project_root, rgb_u8, save_bundle_previews
from pbn_eval.runs import append_jsonl, eval_output_dir, new_run_id, write_manifest
from pbn_eval.scoring import combined_score, load_scoring_config

_STASH = "_web_last"


def _stash_dir(root: Path) -> Path:
    return eval_output_dir(root) / _STASH


def _safe_sample(name: str | None) -> str | None:
    if not name or name.strip() == "" or name == "—":
        return None
    if re.search(r"[/\\]", name) or name.startswith("."):
        return None
    return name


def _emit(obj: dict) -> None:
    sys.stdout.write(json.dumps(obj, default=str) + "\n")
    sys.stdout.flush()


def cmd_run(sample: str | None, image_path: str | None) -> int:
    root = project_root()
    try:
        rgb = None
        label = ""
        if image_path:
            p = Path(image_path).resolve()
            if not p.is_file():
                _emit({"ok": False, "error": f"Image not found: {p}"})
                return 1
            rgb = load_rgb_path(p)
            label = p.name
        elif sample:
            sn = _safe_sample(sample)
            if not sn:
                _emit({"ok": False, "error": "Invalid sample name"})
                return 1
            p = root / "assets" / "input" / sn
            if not p.is_file():
                _emit({"ok": False, "error": f"Sample not found: {sn}"})
                return 1
            rgb = load_rgb_path(p)
            label = sn
        else:
            _emit({"ok": False, "error": "Provide --sample or --image"})
            return 1

        bundle, _cfg, _r = compare_three(rgb, root=root)
        out_dir = eval_output_dir(root)
        save_bundle_previews(bundle, out_dir)

        stash = _stash_dir(root)
        stash.mkdir(parents=True, exist_ok=True)
        Image.fromarray(rgb).save(stash / "input.png")
        for fn, (_v, r, _m, _fid, _auto) in zip(["A.png", "B.png", "C.png"], bundle):
            Image.fromarray(rgb_u8(r.quantized_rgb)).save(stash / fn)

        variants_payload = []
        rows = []
        for v, r, m, fid, auto in bundle:
            variants_payload.append(
                {
                    "variant": v.value,
                    "params": r.params,
                    "metrics": m.__dict__,
                    "fidelity_mse": fid,
                    "auto_scores": auto,
                }
            )
            rows.append(
                {
                    "variant": v.value,
                    "n_regions": m.n_regions,
                    "tiny_frac": m.tiny_region_fraction,
                    "mean_adjacent_delta_e": m.mean_adjacent_delta_e,
                    "auto_total": auto["auto_total"],
                }
            )
        (stash / "summary.json").write_text(
            json.dumps(
                {"source_label": label, "variants": variants_payload},
                indent=2,
                default=str,
            ),
            encoding="utf-8",
        )

        _emit(
            {
                "ok": True,
                "source_label": label,
                "rows": rows,
                "cache_bust": int(time.time()),
            }
        )
        return 0
    except Exception as e:  # noqa: BLE001
        _emit({"ok": False, "error": str(e)})
        return 1


def cmd_log(subject: int, paint: int, bg: int) -> int:
    root = project_root()
    try:
        stash = _stash_dir(root)
        summary_path = stash / "summary.json"
        if not summary_path.is_file():
            _emit({"ok": False, "error": "Nothing to log — run a comparison first."})
            return 1
        data = json.loads(summary_path.read_text(encoding="utf-8"))
        cfg = load_scoring_config(root / "config" / "scoring_weights.yaml")
        blend = float(cfg.get("human_blend", 0.35))
        human = {
            "subject_clarity": int(subject),
            "paintability": int(paint),
            "background_simplicity": int(bg),
        }
        for row in data["variants"]:
            auto = row["auto_scores"]
            total = combined_score(auto, human, blend)
            rid = new_run_id()
            rec = {
                "run_id": rid,
                "preset": "prototype",
                "variant": row["variant"],
                "params": row["params"],
                "metrics": row["metrics"],
                "fidelity_mse": row["fidelity_mse"],
                "auto_scores": auto,
                "combined": total,
                "human": human,
                "source_image": data.get("source_label", ""),
            }
            append_jsonl(root, rec)
            write_manifest(root, rid, rec)
        _emit(
            {
                "ok": True,
                "logged": len(data["variants"]),
                "runs_path": str(eval_output_dir(root) / "runs.jsonl"),
            }
        )
        return 0
    except Exception as e:  # noqa: BLE001
        _emit({"ok": False, "error": str(e)})
        return 1


def main() -> None:
    ap = argparse.ArgumentParser(description="PBN JSON API for Node subprocess.")
    sub = ap.add_subparsers(dest="cmd", required=True)

    pr = sub.add_parser("run", help="Run A/B/C; write previews + summary.json")
    pr.add_argument("--sample", default=None, help="Filename under assets/input/")
    pr.add_argument("--image", default=None, help="Absolute path to an image file")
    pr.set_defaults(_fn=lambda a: cmd_run(a.sample, a.image))

    pl = sub.add_parser("log", help="Append runs.jsonl from last summary + human rubric")
    pl.add_argument("--subject-clarity", dest="subject_clarity", type=int, default=3)
    pl.add_argument("--paintability", type=int, default=3)
    pl.add_argument(
        "--background-simplicity", dest="background_simplicity", type=int, default=3
    )
    pl.set_defaults(
        _fn=lambda a: cmd_log(a.subject_clarity, a.paintability, a.background_simplicity)
    )

    args = ap.parse_args()
    code = args._fn(args)
    raise SystemExit(code)


if __name__ == "__main__":
    main()
