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


SPOTTED_RE = re.compile(r"^(\d{4}-\d{2}-\d{2})-erank-spotted-on-etsy(?:-.+)?\.csv$")


def spotted_on_etsy_csvs(pulls: Path | None = None) -> list[tuple[str, Path]]:
    """(capture_date, path) for every archived eRank "Spotted on Etsy" export."""
    pulls = pulls or PULLS
    out = []
    for f in sorted(pulls.glob("*.csv")):
        m = SPOTTED_RE.match(f.name)
        if m:
            out.append((m.group(1), f))
    return out


def read_spotted_on_etsy_csv(path: Path) -> list[dict]:
    """Rows from one Spotted on Etsy export. Tolerates the BOM eRank writes."""
    import csv

    with path.open(encoding="utf-8-sig", newline="") as fh:
        rows = []
        for r in csv.DictReader(fh):
            term = (r.get("Search Term") or "").strip()
            listing = (r.get("Shop/Listing") or "").strip()
            if not term or not listing:
                continue
            try:
                # No `or 0` fallback: a blank cell must raise (empty string
                # -> ValueError), not silently become the int 0. A ranking
                # position of 0 would be indistinguishable from "no match" —
                # exactly the fabricated-zero bug read_keyword_csv's own
                # comment warns against, and the one this join's "blank,
                # never 0" rule exists to prevent.
                page = int(str(r.get("Page", "")).replace(",", ""))
                position = int(str(r.get("Position", "")).replace(",", ""))
            except ValueError:
                continue
            if page <= 0 or position <= 0:
                # Real Etsy search positions and pages are always >= 1; a
                # non-positive value is malformed, not a low rank.
                continue
            rows.append({
                "search_term": term,
                "listing": listing,
                "page": page,
                "position": position,
            })
    return rows


def build_ranked_index(pulls: Path | None = None) -> dict[str, dict]:
    """keyword.lower() -> {best, matches, term, captures} across every archived
    Spotted on Etsy export, matched against corpus keywords case-insensitive
    exact.

    `term` and `captures` (the original-cased search term, and every capture
    date it was observed in) exist so `build_corpus()` can surface a ranked
    term that never appeared in any Keyword Tool export as a row of its own,
    rather than silently dropping it because there was nothing to attach it
    to -- see the "ranked but no Keyword Tool row" section there.

    A term ranked by more than one listing keeps one match per distinct
    listing; `best` is the lowest (best) position among them, which is what
    "sort by rank" means -- the full list stays reachable rather than being
    averaged or dropped.

    Repeat pulls are an intentional part of this archive (proposal.md § Why),
    but a listing's own `RankedListingMatch` carries no capture identifier --
    so re-pulling the same term/listing must not just append another copy of
    it, or `matches` would grow a duplicate entry every time the same listing
    is re-observed, with the promised "every ranking listing" detail actually
    showing the same listing more than once. Deduped by listing name per
    term, keeping the best (lowest) position seen for that listing across
    every archived pull -- a listing's position moving between captures is
    real signal, and the more favorable observation is the one worth keeping.

    The dedup key is the exported "Shop/Listing" text -- in practice the
    listing's full title (confirmed against the real archived CSVs; eRank's
    Spotted on Etsy export carries no numeric listing ID). This is a known,
    accepted limitation, not an oversight: a listing retitled between pulls
    would read as two separate matches, and two distinct listings that happen
    to share an identical title would incorrectly collapse into one. Neither
    is fixable from this data source alone -- resolving a stable identity
    would mean joining against the Etsy API by search term/position per pull,
    well beyond this join's scope. Title collisions are the same order of
    unlikely as two W&H listings sharing an exact title today, and a
    retitle-driven "duplicate" is still a real listing that really ranked --
    strictly worse than the pre-dedup behavior (every re-pull duplicating
    every still-ranking listing), not a regression from it.
    """
    by_term: dict[str, dict[str, dict]] = {}
    term_text: dict[str, str] = {}
    term_captures: dict[str, set[str]] = {}
    for capture, path in spotted_on_etsy_csvs(pulls):
        for r in read_spotted_on_etsy_csv(path):
            key = r["search_term"].lower()
            term_text.setdefault(key, r["search_term"])
            term_captures.setdefault(key, set()).add(capture)
            by_listing = by_term.setdefault(key, {})
            existing = by_listing.get(r["listing"])
            if existing is None or r["position"] < existing["position"]:
                by_listing[r["listing"]] = {
                    "listing": r["listing"],
                    "page": r["page"],
                    "position": r["position"],
                }

    return {
        term: {
            "best": min(m["position"] for m in matches.values()),
            "matches": list(matches.values()),
            "term": term_text[term],
            "captures": sorted(term_captures[term]),
        }
        for term, matches in by_term.items()
    }


def build_corpus(pulls: Path | None = None) -> dict:
    files = keyword_csvs(pulls)
    ranked_index = build_ranked_index(pulls)
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

    def to_ranked(entry: dict | None) -> dict | None:
        if entry is None:
            return None
        return {"best": entry["best"], "matches": entry["matches"]}

    rows = []
    covered_keywords: set[str] = set()
    for (capture, keyword), row in acc.items():
        row["found_via"].sort(key=lambda h: h["query"])
        current = capture == newest[keyword]
        row["current"] = current
        row["superseded_by"] = None if current else newest[keyword]
        row["coverage"] = {"seen": seen_in[keyword], "of": total_captures}
        # Ranked is keyword-scoped, not capture-scoped: a real-world ranking
        # observed once applies to the keyword regardless of which capture's
        # row is being built. null (not a missing key, not a 0) when there is
        # no Spotted on Etsy match.
        row["ranked"] = to_ranked(ranked_index.get(keyword.lower()))
        rows.append(row)
        covered_keywords.add(keyword.lower())

    # A term W&H already ranks for on Etsy, but the Keyword Tool has never
    # scored, has no row to attach `ranked` to above -- and was silently
    # invisible until now. Katy, 2026-09-18: "add a row for the ranked
    # keywords even if they don't have entries from the erank data." Every
    # such term gets its own row instead: searches/competition/kd stay null
    # (never a fabricated 0 -- there is no Keyword Tool export for this
    # keyword to source a real number from), and coverage reads "seen in 0 of
    # N" Keyword Tool captures, which is the true, non-fabricated count.
    for key, entry in ranked_index.items():
        if key in covered_keywords:
            continue
        rows.append({
            "keyword": entry["term"],
            "capture": max(entry["captures"]),
            "searches": None,
            "competition": None,
            "kd": None,
            "found_via": [],
            "current": True,
            "superseded_by": None,
            "coverage": {"seen": 0, "of": total_captures},
            "ranked": to_ranked(entry),
        })

    # A fabricated 0 would sort a null-searches row as if it were the lowest
    # possible demand; instead every such row sorts after every scored one,
    # in this fixed default order -- same "blank sorts last" rule the table's
    # own Ranked/Targeting columns already apply.
    rows.sort(
        key=lambda r: (
            r["searches"] is None,
            -(r["searches"] or 0),
            r["keyword"],
            r["capture"],
        )
    )

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


# --- bulk keyword corpus ---------------------------------------------------
#
# eRank's Bulk Keywords tool is a second, distinct instrument from the
# Keyword Tool above: related-term suggestions for a seed list, not a
# per-seed demand table. Its export has a different schema entirely
# (Avg Searches/Avg Clicks/Avg CTR/Etsy Competition/Keyword Difficulty vs.
# Average Searches/Competition/KD/Tag Occurrences) and, critically, a value
# shape read_keyword_csv() never sees: "< 20" rather than a bare number or a
# blank. That is real signal -- demand exists and is small -- not the same
# as "Unknown" (eRank never scored it at all). Collapsing either into 0 would
# repeat exactly the fabricated-zero mistake read_keyword_csv()'s own comment
# warns against, so both are kept distinct below: `censored=True` means "the
# true value is below this cap", a bare `None` means "not scored".

BULK_KEYWORD_RE = re.compile(r"^(\d{4}-\d{2}-\d{2})-erank-bulk-keywords(?:-(.+))?\.csv$")


def bulk_keyword_csvs(pulls: Path | None = None) -> list[tuple[str, str, Path]]:
    """(capture_date, variant, path) for every archived eRank Bulk Keywords export."""
    pulls = pulls or PULLS
    out = []
    for f in sorted(pulls.glob("*.csv")):
        m = BULK_KEYWORD_RE.match(f.name)
        if m:
            out.append((m.group(1), m.group(2) or "", f))
    return out


def _num(text: str) -> int | float:
    """int when the value is whole, otherwise float -- '100' reads as 100,
    not 100.0, matching read_keyword_csv()'s plain ints."""
    value = float(text)
    return int(value) if value.is_integer() else value


def parse_bulk_number(raw: str | None) -> tuple[int | float | None, bool]:
    """(value, censored) for one Bulk Keywords cell.

    '< 20' -> (20, True): a real, nonzero value eRank capped rather than
    scored exactly. 'Unknown' or blank -> (None, False): not scored at all.
    Otherwise the parsed number (commas and a trailing '%' stripped), False.
    """
    text = (raw or "").strip()
    if not text or text.lower() == "unknown":
        return None, False
    m = re.match(r"^<\s*([\d,]+)\s*%?$", text)
    if m:
        return _num(m.group(1).replace(",", "")), True
    try:
        return _num(text.rstrip("%").replace(",", "")), False
    except ValueError:
        return None, False


def read_bulk_keywords_csv(path: Path) -> list[dict]:
    """Rows from one eRank Bulk Keywords export. Tolerates the BOM eRank writes.

    Every row with a keyword is kept, including ones where every numeric
    field is unscored -- the term itself, as one of eRank's related-keyword
    suggestions, is the signal even before any number attaches to it.
    """
    import csv

    with path.open(encoding="utf-8-sig", newline="") as fh:
        rows = []
        for r in csv.DictReader(fh):
            kw = (r.get("Keywords") or "").strip()
            if not kw:
                continue
            searches, searches_censored = parse_bulk_number(r.get("Avg Searches"))
            clicks, clicks_censored = parse_bulk_number(r.get("Avg Clicks"))
            ctr, ctr_censored = parse_bulk_number(r.get("Avg CTR"))
            competition, _ = parse_bulk_number(r.get("Etsy Competition"))
            kd, _ = parse_bulk_number(r.get("Keyword Difficulty"))
            rows.append({
                "keyword": kw,
                "avg_searches": searches,
                "avg_searches_censored": searches_censored,
                "avg_clicks": clicks,
                "avg_clicks_censored": clicks_censored,
                "avg_ctr": ctr,
                "avg_ctr_censored": ctr_censored,
                "etsy_competition": competition,
                "kd": kd,
            })
    return rows


def build_bulk_corpus(pulls: Path | None = None) -> dict:
    files = bulk_keyword_csvs(pulls)
    captures: dict[str, int] = {}
    # (capture, keyword.lower()) -> row under construction
    acc: dict[tuple[str, str], dict] = {}

    for capture, _variant, path in files:
        captures[capture] = captures.get(capture, 0) + 1
        for r in read_bulk_keywords_csv(path):
            key = (capture, r["keyword"].lower())
            if key in acc:
                # Multiple Bulk Keywords batches landed the same day commonly
                # share terms (they are related-suggestion exports over
                # overlapping seed lists) -- first-seen wins rather than
                # duplicating the row, matching keyword-tool's own row-per-
                # keyword-per-capture shape.
                continue
            acc[key] = {**r, "capture": capture}

    # A repeat capture of the same keyword extends the series, exactly as
    # build_corpus() does for the Keyword Tool above.
    newest: dict[str, str] = {}
    for (capture, kw_lower) in acc:
        if kw_lower not in newest or capture > newest[kw_lower]:
            newest[kw_lower] = capture

    rows = []
    for (capture, kw_lower), row in acc.items():
        current = capture == newest[kw_lower]
        row["current"] = current
        row["superseded_by"] = None if current else newest[kw_lower]
        rows.append(row)

    # Unscored (None) searches sort last within a direction, never as 0.
    rows.sort(key=lambda r: (
        r["avg_searches"] is None,
        -(r["avg_searches"] or 0),
        r["keyword"],
    ))

    return {
        "captures": [
            {"date": c, "source": "erank", "files": n}
            for c, n in sorted(captures.items())
        ],
        "rows": rows,
    }


# --- tag report corpus -----------------------------------------------------
#
# eRank's Tag Report is a third instrument again: it scores tags W&H already
# uses on live listings, rather than answering a seed query (Keyword Tool) or
# suggesting related terms (Bulk Keywords). Its export encodes absence three
# ways -- an empty cell, the literal string "Unknown", and a censored "< 20" --
# which parse_bulk_number() already handles correctly, so it is reused rather
# than duplicated. Its header carries doubled spaces ("Avg. Clicks  (USA)"),
# so headers are whitespace-normalised before lookup rather than matched
# literally; a silent KeyError here would read as "eRank scored nothing".

TAG_REPORT_RE = re.compile(r"^(\d{4}-\d{2}-\d{2})-erank-tag-report(?:-(.+))?\.csv$")


def tag_report_csvs(pulls: Path | None = None) -> list[tuple[str, str, Path]]:
    """(capture_date, variant, path) for every archived eRank Tag Report export."""
    pulls = pulls or PULLS
    out = []
    for f in sorted(pulls.glob("*.csv")):
        m = TAG_REPORT_RE.match(f.name)
        if m:
            out.append((m.group(1), m.group(2) or "", f))
    return out


def read_tag_report_csv(path: Path) -> list[dict]:
    """Rows from one eRank Tag Report export. Tolerates the BOM eRank writes."""
    import csv

    def norm(name: str) -> str:
        return re.sub(r"\s+", " ", (name or "").strip()).lower()

    with path.open(encoding="utf-8-sig", newline="") as fh:
        rows = []
        for raw in csv.DictReader(fh):
            r = {norm(k): v for k, v in raw.items() if k is not None}
            tag = (r.get("tag") or "").strip()
            if not tag:
                continue
            occurrences, _ = parse_bulk_number(r.get("tag occurrences"))
            searches, searches_censored = parse_bulk_number(r.get("avg. searches (usa)"))
            clicks, clicks_censored = parse_bulk_number(r.get("avg. clicks (usa)"))
            ctr, ctr_censored = parse_bulk_number(r.get("avg. ctr (usa)"))
            competition, _ = parse_bulk_number(r.get("etsy competition (usa)"))
            kd, _ = parse_bulk_number(r.get("keyword difficulty (usa)"))
            google, _ = parse_bulk_number(r.get("google searches"))
            rows.append({
                "keyword": tag,
                "tag_occurrences": occurrences,
                "avg_searches": searches,
                "avg_searches_censored": searches_censored,
                "avg_clicks": clicks,
                "avg_clicks_censored": clicks_censored,
                "avg_ctr": ctr,
                "avg_ctr_censored": ctr_censored,
                "etsy_competition": competition,
                "kd": kd,
                "google_searches": google,
            })
    return rows


def build_tag_report_corpus(pulls: Path | None = None) -> dict:
    """Newest-capture-wins rows keyed by tag, same shape rule as the others."""
    acc: dict[tuple[str, str], dict] = {}
    captures: dict[str, int] = {}

    for capture, _variant, path in tag_report_csvs(pulls):
        captures[capture] = captures.get(capture, 0) + 1
        for r in read_tag_report_csv(path):
            key = (capture, r["keyword"].lower())
            if key in acc:
                continue
            acc[key] = {**r, "capture": capture}

    newest: dict[str, str] = {}
    for (capture, kw_lower) in acc:
        if kw_lower not in newest or capture > newest[kw_lower]:
            newest[kw_lower] = capture

    rows = []
    for (capture, kw_lower), row in acc.items():
        current = capture == newest[kw_lower]
        row["current"] = current
        row["superseded_by"] = None if current else newest[kw_lower]
        rows.append(row)

    return {
        "captures": [
            {"date": c, "source": "erank", "files": n}
            for c, n in sorted(captures.items())
        ],
        "rows": rows,
    }


# --- merged corpus ---------------------------------------------------------
#
# One row per distinct keyword text (case-insensitive exact match -- no
# stemming, no fuzzy join), carrying an independently-nullable sub-object per
# source. A source with no data for a keyword is an ABSENT sub-object, never a
# zeroed-out one: a fabricated 0 reads as "measured, and it was none", which is
# the single inference this whole corpus exists to prevent.
#
# A row exists if ANY source has the keyword. The ranked-only synthetic row
# from #504 is therefore no longer a special case bolted on beside the join --
# it falls out of that one rule, alongside bulk-only and tag-report-only rows.
#
# Repeat captures of one keyword collapse to the newest (design.md decision 5,
# settled with Katy 2026-09-20). Earlier captures are kept in `history` on the
# source's own sub-object rather than discarded, and `current`/`superseded_by`
# keep exactly the meaning they carry today.


def _collapse(rows: list[dict], fields: tuple[str, ...]) -> dict:
    """Newest capture's values, with every earlier capture kept in `history`."""
    ordered = sorted(rows, key=lambda r: r["capture"], reverse=True)
    current, earlier = ordered[0], ordered[1:]
    out = {f: current.get(f) for f in fields}
    out["capture"] = current["capture"]
    out["current"] = current.get("current", True)
    out["superseded_by"] = current.get("superseded_by")
    out["history"] = [
        {**{f: r.get(f) for f in fields}, "capture": r["capture"]} for r in earlier
    ]
    return out


KT_FIELDS = ("searches", "competition", "kd", "found_via", "coverage")
BULK_FIELDS = (
    "avg_searches", "avg_searches_censored", "avg_clicks", "avg_clicks_censored",
    "avg_ctr", "avg_ctr_censored", "etsy_competition", "kd",
)
TAG_FIELDS = (
    "tag_occurrences", "avg_searches", "avg_searches_censored",
    "avg_clicks", "avg_clicks_censored", "avg_ctr", "avg_ctr_censored",
    "etsy_competition", "kd", "google_searches",
)


def build_merged_corpus(pulls: Path | None = None) -> dict:
    base = build_corpus(pulls)
    bulk = build_bulk_corpus(pulls)
    tags = build_tag_report_corpus(pulls)

    merged: dict[str, dict] = {}

    def slot(keyword: str) -> dict:
        key = keyword.lower()
        row = merged.get(key)
        if row is None:
            row = {
                "keyword": keyword,
                "keyword_tool": None,
                "bulk_keywords": None,
                "tag_report": None,
                "ranked": None,
                # Targeting is computed per request against live listing
                # snapshots; the static corpus carries no opinion on it.
            }
            merged[key] = row
        return row

    grouped: dict[str, list[dict]] = {}
    for r in base["rows"]:
        grouped.setdefault(r["keyword"].lower(), []).append(r)

    for kw_lower, rows in grouped.items():
        newest_first = sorted(rows, key=lambda r: r["capture"], reverse=True)
        head = newest_first[0]
        row = slot(head["keyword"])
        # `coverage.seen == 0` marks build_corpus()'s ranked-only synthetic
        # row: a term Etsy ranks for that the Keyword Tool has never scored.
        # It carries no Keyword Tool data, so it contributes no sub-object --
        # only its `ranked` join, which is keyword-scoped anyway.
        if head["coverage"]["seen"] > 0:
            row["keyword_tool"] = _collapse(newest_first, KT_FIELDS)
        row["ranked"] = head["ranked"]

    def join(source_rows: list[dict], key: str, fields: tuple[str, ...]) -> None:
        """Group a source's per-capture rows by keyword, then collapse each
        group onto the merged row -- grouping first is what keeps `history`
        intact for a keyword captured more than once."""
        by_kw: dict[str, list[dict]] = {}
        for r in source_rows:
            by_kw.setdefault(r["keyword"].lower(), []).append(r)
        for kw_lower, group in by_kw.items():
            newest_first = sorted(group, key=lambda r: r["capture"], reverse=True)
            row = merged.get(kw_lower) or slot(newest_first[0]["keyword"])
            row[key] = _collapse(newest_first, fields)

    join(bulk["rows"], "bulk_keywords", BULK_FIELDS)
    join(tags["rows"], "tag_report", TAG_FIELDS)

    rows = list(merged.values())

    # Same "blank sorts last, never 0" default the table applies: a keyword the
    # Keyword Tool never scored must not sort as if its demand were zero.
    def searches_of(r: dict):
        kt = r["keyword_tool"]
        return kt["searches"] if kt else None

    rows.sort(key=lambda r: (searches_of(r) is None, -(searches_of(r) or 0), r["keyword"]))

    return {
        "generated_at": date.today().isoformat(),
        "captures": base["captures"],
        "bulk_captures": bulk["captures"],
        "tag_report_captures": tags["captures"],
        "rows": rows,
    }


def write_corpus() -> int:
    corpus = build_merged_corpus()
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
