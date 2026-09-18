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
import json
import re
import shutil
import sys
from datetime import date, datetime, timedelta
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

    # Other sources in the ecosystem map's intelligence tiers (§11), plus the
    # shapes their exports actually arrive in. Extend here as sources are added
    # -- an unrecognised file is reported, never guessed at.
    for pattern, source in (
        (r"(?i)^(google[_\s]*ads|adwords)", "google-ads"),
        (r"(?i)^(google[_\s]*analytics|ga4)", "google-analytics"),
        (r"(?i)^marmalead", "marmalead"),
        (r"(?i)^pinterest", "pinterest"),
        (r"(?i)^(search[_\s]*analytics|searchterms)", "etsy"),
        (r"(?i)^shop[_\s]*manager", "etsy"),
        (r"(?i)^notion", "notion"),
        (r"(?i)^supabase", "supabase"),
    ):
        m = re.match(pattern + r"[_\s-]*(.*)$", stem)
        if m:
            rest = slug(m.group(m.lastindex or 1)) if m.lastindex else ""
            tail = slug(stem[m.end(1):]) if m.lastindex else ""
            return source, (tail or "export"), ""

    return None


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def target_name(d: date, source: str, surface: str, variant: str, ext: str) -> str:
    parts = [d.isoformat(), source, surface] + ([variant] if variant else [])
    return "-".join(parts) + ext


HALF_LIFE_DAYS = {"14d": 14, "30d": 30, "90d": 90, "180d": 180, "365d": 365}


def read_front_matter(path: Path) -> dict:
    """Minimal front-matter reader: scalars, [a, b] lists, and `>-` blocks.

    Deliberately not a YAML parser -- the schema in docs/pulls/README.md is
    fixed and small, and a dependency here would have to be installed on every
    machine that lands a pull.
    """
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---\n"):
        return {}
    body = text.split("---\n", 2)[1]
    out: dict[str, object] = {}
    key = None
    for line in body.splitlines():
        if key and line.startswith("  "):
            out[key] = f"{out[key]} {line.strip()}".strip()
            continue
        key = None
        m = re.match(r"^([a-z_]+):\s*(.*)$", line)
        if not m:
            continue
        k, v = m.group(1), m.group(2).strip()
        if v in (">-", ">", "|"):
            out[k], key = "", k
        elif v.startswith("["):
            out[k] = [x.strip() for x in v.strip("[]").split(",") if x.strip()]
        else:
            out[k] = v
    return out


def staleness(captured: str, half_life: str, today: date) -> str:
    """'fresh' / 'aging' / 'stale' / 'permanent' -- how far past its half-life."""
    if half_life == "permanent":
        return "permanent"
    days = HALF_LIFE_DAYS.get(half_life)
    if not days:
        return "unknown"
    try:
        age = (today - date.fromisoformat(captured)).days
    except ValueError:
        return "unknown"
    if age <= days:
        return "fresh"
    return "aging" if age <= days * 2 else "stale"


def build_manifest(today: date | None = None) -> list[dict]:
    today = today or date.today()
    out = []
    for f in sorted(PULLS.glob("*.md")):
        if f.name == "README.md":
            continue
        fm = read_front_matter(f)
        if not fm:
            continue
        captured = str(fm.get("captured", ""))
        half_life = str(fm.get("half_life", ""))
        raw = sorted(
            g.name for g in PULLS.iterdir()
            if g.suffix.lower() in (".csv", ".tsv") and g.name.startswith(captured)
            and f"-{fm.get('source','')}-{fm.get('surface','')}" in g.name
        )
        out.append({
            "note": f.name,
            "captured": captured,
            "source": fm.get("source", ""),
            "surface": fm.get("surface", ""),
            "tier": fm.get("tier", ""),
            "scope": fm.get("scope", ""),
            "measures": fm.get("measures", []),
            "subjects": fm.get("subjects", []),
            "half_life": half_life,
            "status": staleness(captured, half_life, today),
            "answers": fm.get("answers", ""),
            "raw_files": raw,
        })
    out.sort(key=lambda r: r["captured"], reverse=True)

    # Repeat pulls of the same surface form a series: the newest is current and
    # the rest are superseded. Without this, a stale pull and the fresh one that
    # replaced it look alike to anything reading the index, and the whole point
    # of keeping both is being able to diff them.
    seen: dict[tuple[str, str], int] = {}
    for r in out:
        key = (r["source"], r["surface"])
        n = seen.get(key, 0) + 1
        seen[key] = n
        r["current"] = n == 1
        r["series_index"] = n
    for r in out:
        key = (r["source"], r["surface"])
        r["series_length"] = seen[key]
        if not r["current"]:
            newer = [x["note"] for x in out
                     if (x["source"], x["surface"]) == key and x["current"]]
            r["superseded_by"] = newer[0] if newer else ""
            r["status"] = "superseded"
    return out


def write_manifest() -> int:
    rows = build_manifest()
    (PULLS / "index.json").write_text(
        json.dumps({"generated": date.today().isoformat(), "pulls": rows}, indent=2) + "\n",
        encoding="utf-8",
    )
    return len(rows)


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

    by_note = {r["note"]: r for r in build_manifest()}
    out = [
        "| Captured | Pull | Measures | Scope | Raw | Status |",
        "| --- | --- | --- | --- | --- | --- |",
    ]
    for r in sorted(by_note.values(), key=lambda r: (r["captured"], r["note"]), reverse=True):
        title = ""
        for line in (PULLS / r["note"]).read_text(encoding="utf-8").splitlines():
            if line.startswith("# "):
                title = line[2:].strip().replace("Data pull — ", "")
                break
        measures = ", ".join(f"`{m}`" for m in r["measures"]) or "—"
        # Label by the suffixes actually present: the ingest loop accepts .tsv
        # as well as .csv, so a hardcoded "csv" would misreport a TSV landing.
        exts = sorted({Path(f).suffix.lstrip(".") for f in r["raw_files"]})
        raw = (f"{len(r['raw_files'])} × {'/'.join(exts)}" if r["raw_files"]
               else "— *(Drive)*")
        badge = {"fresh": "🟢 fresh", "aging": "🟡 aging", "stale": "🔴 stale",
                 "permanent": "⚪ permanent",
                 "superseded": "⏹ superseded"}.get(r["status"], r["status"])
        if r.get("series_length", 1) > 1:
            badge += f" · {r['series_index']}/{r['series_length']}"
        out.append(
            f"| {r['captured']} | [{title or r['note']}]({r['note']}) | {measures} "
            f"| `{r['scope']}` | {raw} | {badge} |"
        )
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


# --- keyword corpus -------------------------------------------------------
#
# The index classifies each PULL. This classifies each ROW inside the keyword
# pulls, so a keyword can be compared across queries and across captures
# without opening ten CSVs by hand.

KEYWORD_RE = re.compile(r"^(\d{4}-\d{2}-\d{2})-erank-keywords-(.+)\.csv$")


def keyword_csvs(pulls: Path | None = None) -> list[tuple[str, str, Path]]:
    """(capture_date, query, path) for every archived eRank keyword export.

    The query is recovered from the filename, where slug() turned spaces into
    dashes at landing time. A genuinely hyphenated query would come back
    de-hyphenated; no export so far has one, and the alternative is a second
    source of truth for something the filename already carries.
    """
    pulls = pulls or PULLS
    out = []
    for f in sorted(pulls.glob("*.csv")):
        m = KEYWORD_RE.match(f.name)
        if m:
            out.append((m.group(1), m.group(2).replace("-", " "), f))
    return out


def read_keyword_csv(path: Path) -> list[dict]:
    """Rows from one export. Tolerates the BOM eRank writes."""
    import csv

    with path.open(encoding="utf-8-sig", newline="") as fh:
        rows = []
        for r in csv.DictReader(fh):
            kw = (r.get("Keywords") or "").strip()
            if not kw:
                continue
            try:
                rows.append({
                    "keyword": kw,
                    "searches": int(str(r.get("Average Searches", "0")).replace(",", "") or 0),
                    "competition": int(str(r.get("Competition", "0")).replace(",", "") or 0),
                    "kd": int(str(r.get("KD", "0")).replace(",", "") or 0),
                    "tag_occurrences": int(str(r.get("Tag Occurrences", "0")).replace(",", "") or 0),
                })
            except ValueError:
                # A malformed row is dropped rather than coerced to zero: a
                # fabricated 0 would read as "no demand", which is exactly the
                # inference this corpus exists to prevent.
                continue
    return rows


def build_corpus(pulls: Path | None = None) -> dict:
    files = keyword_csvs(pulls)
    captures: dict[str, set[str]] = {}
    # (capture, keyword) -> row under construction
    acc: dict[tuple[str, str], dict] = {}

    for capture, query, path in files:
        captures.setdefault(capture, set()).add(query)
        for r in read_keyword_csv(path):
            key = (capture, r["keyword"])
            row = acc.get(key)
            if row is None:
                # Searches, competition and KD are keyword-scoped: they agree
                # across every query in a capture, so they are carried once.
                row = {
                    "keyword": r["keyword"],
                    "capture": capture,
                    "searches": r["searches"],
                    "competition": r["competition"],
                    "kd": r["kd"],
                    "found_via": [],
                }
                acc[key] = row
            # Tag occurrences are query-scoped and do NOT agree: `embroidery
            # font` read 6, 81, 80 and 12 under four queries on 2026-09-17.
            # Each count stays beside the query that produced it; merging them
            # would invent a number the export never gave.
            row["found_via"].append(
                {"query": query, "tag_occurrences": r["tag_occurrences"]}
            )

    ordered_captures = sorted(captures)
    total_captures = len(ordered_captures)

    # Coverage counts the captures a keyword WAS observed in. No row is
    # emitted for a capture where a keyword is absent, and nothing here derives
    # a decline, a removal or a zero from that absence: the exports are
    # hand-filtered, so a gap is unexplained, not evidence.
    seen_in: dict[str, int] = {}
    for (_capture, keyword) in acc:
        seen_in[keyword] = seen_in.get(keyword, 0) + 1

    # A repeat capture of the same keyword extends the series: the newest
    # observation is current, earlier ones are superseded but stay readable.
    newest: dict[str, str] = {}
    for (capture, keyword) in acc:
        if keyword not in newest or capture > newest[keyword]:
            newest[keyword] = capture

    rows = []
    for (capture, keyword), row in acc.items():
        row["found_via"].sort(key=lambda h: h["query"])
        current = capture == newest[keyword]
        row["current"] = current
        row["superseded_by"] = None if current else newest[keyword]
        row["coverage"] = {"seen": seen_in[keyword], "of": total_captures}
        rows.append(row)

    rows.sort(key=lambda r: (-r["searches"], r["keyword"], r["capture"]))

    return {
        "generated_at": date.today().isoformat(),
        "captures": [
            {
                "date": c,
                "source": "erank",
                "queries": sorted(captures[c]),
            }
            for c in ordered_captures
        ],
        "rows": rows,
    }


def write_corpus() -> int:
    corpus = build_corpus()
    out = REPO / "data" / "keyword-corpus.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(corpus, indent=2) + "\n", encoding="utf-8")
    return len(corpus["rows"])


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

    n = write_manifest()
    print(f"index refreshed ({n} pulls in index.json)" if write_index()
          else "index markers missing in docs/pulls/README.md")
    print(f"keyword corpus refreshed ({write_corpus()} rows in data/keyword-corpus.json)")
    if landed:
        print("\nNext: write or extend the dated note in docs/pulls/, then commit.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
