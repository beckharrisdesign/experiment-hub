"""Append-only run log + per-run manifest (checkpoint-friendly)."""

from __future__ import annotations

import json
import time
import uuid
from pathlib import Path
from typing import Any


def ensure_artifacts(root: Path) -> Path:
    d = root / "artifacts"
    d.mkdir(parents=True, exist_ok=True)
    return d


def append_jsonl(root: Path, record: dict[str, Any]) -> None:
    ensure_artifacts(root)
    path = root / "artifacts" / "runs.jsonl"
    line = json.dumps(record, default=str) + "\n"
    with open(path, "a", encoding="utf-8") as f:
        f.write(line)


def write_manifest(root: Path, run_id: str, payload: dict[str, Any]) -> Path:
    ensure_artifacts(root)
    p = root / "artifacts" / "manifests" / f"{run_id}.json"
    p.parent.mkdir(parents=True, exist_ok=True)
    with open(p, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, default=str)
    return p


def new_run_id() -> str:
    return f"{time.strftime('%Y%m%dT%H%M%S')}-{uuid.uuid4().hex[:8]}"

