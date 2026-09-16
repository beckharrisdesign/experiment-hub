"""Bundle PDF merge — the safety properties, not the PDF library.

The deliverable risk is a half-built or bad bundle landing on a live listing:
the missing half is invisible on Etsy, and with --force a bad write would
replace a deliverable that was previously valid. These tests pin the rules
that prevent that.
"""
import importlib.util
import os
import sys

import pytest

pypdf = pytest.importorskip("pypdf")

SCRIPT = os.path.join(
    os.path.dirname(__file__), "..", "..", "..", "..", "scripts", "merge-bundle-pdfs.py"
)

spec = importlib.util.spec_from_file_location("merge_bundle_pdfs", SCRIPT)
mbp = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mbp)


def write_pdf(path, pages=1):
    """A minimal real PDF, so the script's own reader is exercised."""
    from pypdf import PdfWriter

    writer = PdfWriter()
    for _ in range(pages):
        writer.add_blank_page(width=612, height=792)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "wb") as fh:
        writer.write(fh)
    return path


@pytest.fixture
def components(tmp_path):
    for slug in ("a", "b"):
        for size in ("6in", "8in"):
            write_pdf(tmp_path / slug / f"Printable-{slug}-{size}.pdf")
    return tmp_path


def run(components_root, *extra):
    return mbp.main(
        [
            "--components-root", str(components_root),
            "--bundle", "bundle",
            "--members", "a", "b",
            *extra,
        ]
    )


def outputs(components_root):
    return sorted(p.name for p in (components_root / "bundle").glob("*.pdf"))


def temps(components_root):
    return sorted(p.name for p in (components_root / "bundle").glob("*.tmp"))


def test_dry_run_writes_nothing(components):
    assert run(components) == 0
    assert not (components / "bundle").exists()


def test_apply_writes_one_file_per_size(components):
    assert run(components, "--apply") == 0
    assert outputs(components) == [
        "Printable-bundle-6in.pdf",
        "Printable-bundle-8in.pdf",
    ]
    for name in outputs(components):
        reader = pypdf.PdfReader(str(components / "bundle" / name))
        assert len(reader.pages) == 2  # one page from each member


def test_missing_input_stops_before_writing(components):
    (components / "b" / "Printable-b-8in.pdf").unlink()
    assert run(components, "--apply") == 1
    assert not (components / "bundle").exists()


def test_unreadable_input_stops_before_writing(components):
    (components / "b" / "Printable-b-8in.pdf").write_bytes(b"not a pdf")
    assert run(components, "--apply") == 1
    assert not (components / "bundle").exists()


def test_existing_output_is_not_overwritten_without_force(components):
    assert run(components, "--apply") == 0
    before = (components / "bundle" / "Printable-bundle-6in.pdf").read_bytes()
    assert run(components, "--apply") == 1  # refuses
    assert (components / "bundle" / "Printable-bundle-6in.pdf").read_bytes() == before


def test_force_overwrites(components):
    assert run(components, "--apply") == 0
    assert run(components, "--apply", "--force") == 0
    assert len(outputs(components)) == 2


def test_staged_verification_failure_leaves_existing_files_untouched(components, monkeypatch):
    """The core guarantee: a bad build never replaces a good deliverable.

    A staged file that fails its page-count check must roll back every size —
    including ones that already verified — and leave no temp files behind.
    """
    assert run(components, "--apply") == 0
    good = {
        name: (components / "bundle" / name).read_bytes() for name in outputs(components)
    }

    real_reader = mbp.PdfReader if hasattr(mbp, "PdfReader") else pypdf.PdfReader

    class ShortReader:
        """Reports a wrong page count for staged temp files only."""

        def __init__(self, path):
            self._inner = real_reader(path)
            self._lie = str(path).endswith(".tmp")

        @property
        def pages(self):
            return [] if self._lie else self._inner.pages

    monkeypatch.setattr(pypdf, "PdfReader", ShortReader)

    assert run(components, "--apply", "--force") == 1
    for name, content in good.items():
        assert (components / "bundle" / name).read_bytes() == content, (
            f"{name} was replaced by an unverified build"
        )
    assert temps(components) == [], "temp files left behind after rollback"
