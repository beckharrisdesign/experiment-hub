#!/usr/bin/env python3
"""Merge a bundle's member PDFs into one multi-page deliverable per hoop size.

Etsy caps digital listings at 5 files, so a 4-pattern bundle ships as two
multi-page PDFs (one per hoop size) rather than eight singles. Member order
follows the listing title, so page order matches what the buyer was sold.

Usage:
  python scripts/merge-bundle-pdfs.py --bundle christmas-classics-set \
      --members christmas-bow christmas-candy-canes christmas-nutcracker christmas-poinsettia \
      [--sizes 6in 8in] [--components-root PATH] [--apply]

Dry run by default: prints the plan and verifies every input exists and
parses. Nothing is written without --apply, and an existing output is never
overwritten unless --force is given.
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

DEFAULT_COMPONENTS_ROOT = (
    Path.home()
    / "Library/CloudStorage/GoogleDrive-katy@beckharrisdesign.com"
    / "My Drive/W+H Listings/W+H Components"
)


def member_pdf(root: Path, slug: str, size: str) -> Path:
    return root / slug / f"Printable-{slug}-{size}.pdf"


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--bundle", required=True, help="Bundle slug, e.g. christmas-classics-set")
    p.add_argument(
        "--members",
        required=True,
        nargs="+",
        help="Member component slugs, in the order they appear in the listing title",
    )
    p.add_argument("--sizes", nargs="+", default=["6in", "8in"], help="Hoop sizes (default: 6in 8in)")
    p.add_argument(
        "--components-root",
        type=Path,
        default=Path(os.environ.get("COMPONENTS_ROOT", DEFAULT_COMPONENTS_ROOT)),
        help="W+H Components directory (env: COMPONENTS_ROOT)",
    )
    p.add_argument("--apply", action="store_true", help="Actually write the merged PDFs")
    p.add_argument("--force", action="store_true", help="Overwrite an existing output")
    return p.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    root: Path = args.components_root

    if not root.is_dir():
        print(f"ERROR components root not found: {root}", file=sys.stderr)
        return 2

    try:
        from pypdf import PdfReader, PdfWriter
    except ImportError:
        print("ERROR pypdf not installed — pip install pypdf", file=sys.stderr)
        return 2

    out_dir = root / args.bundle
    plans = []

    # Verify everything before writing anything: a half-built bundle is worse
    # than none, because the missing half is invisible on the listing.
    for size in args.sizes:
        inputs = [member_pdf(root, slug, size) for slug in args.members]
        missing = [p for p in inputs if not p.is_file()]
        if missing:
            for p in missing:
                print(f"ERROR missing input: {p}", file=sys.stderr)
            return 1

        pages = 0
        for p in inputs:
            try:
                pages += len(PdfReader(str(p)).pages)
            except Exception as exc:  # unreadable source = stop, don't guess
                print(f"ERROR unreadable PDF {p}: {exc}", file=sys.stderr)
                return 1

        out = out_dir / f"Printable-{args.bundle}-{size}.pdf"
        if out.exists() and not args.force:
            print(f"ERROR output exists (use --force): {out}", file=sys.stderr)
            return 1
        plans.append((size, inputs, out, pages))

    for size, inputs, out, pages in plans:
        print(f"PLAN  {size}: {len(inputs)} files -> {pages} pages -> {out.name}")
        for p in inputs:
            print(f"        + {p.name}")

    if not args.apply:
        print("\nDry run. Re-run with --apply to write.")
        return 0

    out_dir.mkdir(parents=True, exist_ok=True)
    for size, inputs, out, expected_pages in plans:
        writer = PdfWriter()
        for p in inputs:
            for page in PdfReader(str(p)).pages:
                writer.add_page(page)
        tmp = out.with_suffix(".pdf.tmp")
        with open(tmp, "wb") as fh:
            writer.write(fh)
        os.replace(tmp, out)

        # Verify what landed, not what we intended to write.
        actual = len(PdfReader(str(out)).pages)
        status = "OK" if actual == expected_pages else f"MISMATCH (expected {expected_pages})"
        print(f"WROTE {out.name} — {actual} pages, {out.stat().st_size:,} bytes -> {status}")
        if actual != expected_pages:
            return 1

    print("\nBundle PDFs built. Next: upload them to the bundle listing.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
