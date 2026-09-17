"""PDF deliverable upload — the rules that keep a listing coherent.

The risks this pins: duplicate files on a rerun, breaching Etsy's per-listing
file cap (the API rejects the overflow and leaves a half-uploaded listing),
and a verification that passes on count alone.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import upload_listing_files as ulf


def test_file_plan_is_hoop_size_ordered():
    plan = ulf.file_plan("christmas-bow")
    assert [f["size"] for f in plan] == ["6in", "8in"]
    assert [f["name"] for f in plan] == [
        "Printable-christmas-bow-6in.pdf",
        "Printable-christmas-bow-8in.pdf",
    ]


def test_bundle_uses_the_merged_component():
    plan = ulf.file_plan("christmas-classics-set")
    assert [f["name"] for f in plan] == [
        "Printable-christmas-classics-set-6in.pdf",
        "Printable-christmas-classics-set-8in.pdf",
    ]
    assert len(plan) <= ulf.FILE_CAP


def test_pending_skips_files_already_on_the_listing():
    plan = ulf.file_plan("christmas-bow")
    pending = ulf.pending_files(plan, ["Printable-christmas-bow-6in.pdf"])
    assert [f["name"] for f in pending] == ["Printable-christmas-bow-8in.pdf"]


def test_pending_is_case_and_whitespace_insensitive():
    """Etsy echoes back the filename; don't re-upload over a trivial difference."""
    plan = ulf.file_plan("christmas-bow")
    existing = [" printable-christmas-bow-6in.PDF ", "Printable-christmas-bow-8in.pdf"]
    assert ulf.pending_files(plan, existing) == []


def test_pending_tolerates_missing_filenames():
    plan = ulf.file_plan("christmas-bow")
    pending = ulf.pending_files(plan, [None])
    assert len(pending) == 2


def test_rerun_after_full_upload_uploads_nothing():
    plan = ulf.file_plan("christmas-bow")
    assert ulf.pending_files(plan, [f["name"] for f in plan]) == []


def test_cap_allows_a_normal_listing():
    assert ulf.cap_exceeded(existing_count=0, pending_count=2) is False
    assert ulf.cap_exceeded(existing_count=3, pending_count=2) is False


def test_cap_refuses_when_total_would_exceed():
    assert ulf.cap_exceeded(existing_count=4, pending_count=2) is True
    assert ulf.cap_exceeded(existing_count=5, pending_count=1) is True


def test_cap_boundary_is_inclusive():
    """Exactly FILE_CAP files is allowed; one more is not."""
    assert ulf.cap_exceeded(existing_count=ulf.FILE_CAP - 1, pending_count=1) is False
    assert ulf.cap_exceeded(existing_count=ulf.FILE_CAP, pending_count=1) is True
