#!/usr/bin/env python3
"""Land downloaded data-pull exports into docs/pulls/ under the naming convention.

The convention (see docs/pulls/README.md):

    docs/pulls/YYYY-MM-DD-<source>-<surface>[-<variant>].<ext>

Exports arrive from eRank and Etsy with tool-generated filenames that already
encode source, surface and variant -- "eRank - Keyword Tool - halloween.csv"
is erank / keywords / halloween. This derives the canonical name from that
rather than asking anyone to remember the pattern, skips anything already
captured (compared by content hash, so eRank's "_1"/"_2" re-download suffixes
do not create duplicates), and refreshes the inventory table in the README.

Dry run by default. Nothing is copied without --apply.

    python3 scripts/ingest-pulls.py ~/Downloads
    python3 scripts/ingest-pulls.py ~/Downloads --apply

Capture date comes from each file's modification time, which for a download is
when it was exported. Override for a whole batch with --date YYYY-MM-DD.
"""

from __future__ import annotations

import argparse
import hashlib
import re
import shutil
import sys
from datetime import date, datetime
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
PULLS = REPO / "docs" / "pulls"

INDEX_START = "<!-- inventory:start -->"
INDEX_END = "<!-- inventory:end -->"


def slug(text: str) -> str:
    """'Keyword Tool' -> 'keyword-tool'; strips eRank's _1 re-download suffixes."""
    text = re.sub(r"[_\s]+", " ", text.strip())
    text = re.sub(r"\s+\d+$", "", text)
    text = re.sub(r"[^A-Za-z0-9]+", "-", text)
    return re.sub(r"-{2,}", "-", text).strip("-").lower()


def classify(name: str) -> tuple[str, str, str] | None:
    """(source, surface, variant) from an export's own filename, or None."""
    stem = Path(name).stem
    # Some download and upload paths prepend an opaque id: "2299917c-eRank - ...".
    stem = re.sub(r"^[0-9a-f]{6,}[-_](?=[A-Za-z])", "", stem)

    # "eRank - Keyword Tool - halloween", "eRank_-_Spotted_On_Etsy_1"
    m = re.match(r"(?i)^erank[\s_]*-[\s_]*(.+)$", stem)
    if m:
        rest = re.split(r"[\s_]*-[\s_]*", m.group(1), maxsplit=1)
        surface = slug(rest[0])
        variant = slug(rest[1]) if len(rest) > 1 else ""
        if surface in ("keyword-tool", "keywords"):
            surface = "keywords"
        return "erank", surface, variant

    # eRank's tag report exports as "Tag_Report_<shop>_<ids>"
    if re.match(r"(?i)^tag[_\s]*report", stem):
        return "erank", "tag-report", ""

    # "etsy_statement_2026_01", "EtsyStatement2026_1"
    m = re.match(r"(?i)^etsy[_\s]*statement[_\s]*(\d{4})[_\s]*(\d{1,2})", stem)
    if m:
        return "etsy", "statement", f"{m.group(1)}-{int(m.group(2)):02d}"

    m = re.match(r"(?i)^etsy[_\s]*(.+)$", stem)
    if m:
        return "etsy", slug(m.group(1)), ""

    return None


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def target_name(d: date, source: str, surface: str, variant: str, ext: str) -> str:
    parts = [d.isoformat(), source, surface] + ([variant] if variant else [])
    return "-".join(parts) + ext


def build_index() -> str:
    """Inventory table, grouped by capture date, newest first."""
    rows: dict[str, dict[str, list[str] | str]] = {}
    for f in sorted(PULLS.iterdir()):
        m = re.match(r"^(\d{4}-\d{2}-\d{2})-(.+)$", f.name)
        if not m or f.name == "README.md":
            continue
        day, rest = m.group(1), m.group(2)
        entry = rows.setdefault(day, {"notes": [], "files": []})
        if f.suffix == ".md":
            title = ""
            for line in f.read_text(encoding="utf-8").splitlines():
                if line.startswith("# "):
                    title = line[2:].strip()
                    break
            entry["notes"].append(f"[{title or f.stem}]({f.name})")
        else:
            entry["files"].append(Path(rest).stem)

    out = ["| Date | Note | Raw files |", "| --- | --- | --- |"]
    for day in sorted(rows, reverse=True):
        e = rows[day]
        notes = "<br>".join(e["notes"]) or "—"
        files = f"{len(e['files'])} × `.csv`" if e["files"] else "— *(Drive only)*"
        out.append(f"| {day} | {notes} | {files} |")
    return "\n".join(out)


def write_index() -> bool:
    readme = PULLS / "README.md"
    if not readme.exists():
        return False
    text = readme.read_text(encoding="utf-8")
    if INDEX_START not in text or INDEX_END not in text:
        return False
    head, rest = text.split(INDEX_START, 1)
    _, tail = rest.split(INDEX_END, 1)
    readme.write_text(
        f"{head}{INDEX_START}\n{build_index()}\n{INDEX_END}{tail}", encoding="utf-8"
    )
    return True


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("source", nargs="?", default=str(Path.home() / "Downloads"))
    ap.add_argument("--apply", action="store_true", help="actually copy (default: dry run)")
    ap.add_argument("--date", help="override capture date for every file (YYYY-MM-DD)")
    args = ap.parse_args()

    src = Path(args.source).expanduser()
    if not src.is_dir():
        print(f"not a directory: {src}", file=sys.stderr)
        return 1

    forced = date.fromisoformat(args.date) if args.date else None
    existing = {sha(f): f.name for f in PULLS.iterdir() if f.is_file() and f.name != "README.md"}

    landed, skipped, unknown = [], [], []
    for f in sorted(src.iterdir()):
        if not f.is_file() or f.suffix.lower() not in (".csv", ".tsv"):
            continue
        digest = sha(f)
        if digest in existing:
            skipped.append((f.name, existing[digest]))
            continue
        kind = classify(f.name)
        if not kind:
            unknown.append(f.name)
            continue
        source, surface, variant = kind
        when = forced or datetime.fromtimestamp(f.stat().st_mtime).date()
        name = target_name(when, source, surface, variant, f.suffix.lower())
        dest = PULLS / name
        n = 2
        while dest.exists() or any(name == v for v in existing.values()):
            name = target_name(when, source, surface, f"{variant}-{n}" if variant else str(n), f.suffix.lower())
            dest = PULLS / name
            n += 1
        landed.append((f, dest, name))
        existing[digest] = name

    for f, dest, name in landed:
        print(f"  NEW      {f.name}\n           -> docs/pulls/{name}")
        if args.apply:
            shutil.copy2(f, dest)
    for orig, have in skipped:
        print(f"  have     {orig}  (identical to {have})")
    for name in unknown:
        print(f"  UNKNOWN  {name}  -- name it by hand, or add a rule to classify()")

    print(f"\n{len(landed)} new, {len(skipped)} already captured, {len(unknown)} unrecognised")
    if not args.apply:
        print("dry run -- nothing copied. Re-run with --apply.")
        return 0

    print("index refreshed" if write_index() else "index markers missing in docs/pulls/README.md")
    if landed:
        print("\nNext: write or extend the dated note in docs/pulls/, then commit.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
