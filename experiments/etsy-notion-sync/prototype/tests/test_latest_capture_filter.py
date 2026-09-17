"""Deleted listings must drop out of the sync.

The latest-snapshot view is "newest row per listing across all history", so a
listing deleted on Etsy keeps its final snapshot forever. Without a filter the
sync keeps treating it as live: its SKU conflicts re-fire every run, and its
stale data stays eligible to be written into Notion. Real case, 2026-09-16 —
three drafts deleted, and the duplicate-SKU warning kept firing afterwards.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from store_supabase import latest_from_current_capture

NEW = "2026-09-16 19:05:54.471201+00"
OLD = "2026-09-16 18:51:21.486922+00"


def row(listing_id, captured_at, sku=None, parsed=None):
    return {
        "listing_id": listing_id,
        "sku": sku,
        "parsed": parsed if parsed is not None else {"title": "t{}".format(listing_id)},
        "captured_at": captured_at,
    }


def test_empty_input():
    assert latest_from_current_capture([]) == {}


def test_keeps_listings_from_the_latest_capture():
    out = latest_from_current_capture([row(1, NEW), row(2, NEW)])
    assert sorted(out) == [1, 2]
    assert out[1]["captured_at"] == NEW


def test_drops_listings_missing_from_the_latest_capture():
    """A deleted listing's final snapshot must not look live."""
    out = latest_from_current_capture([row(1, NEW), row(999, OLD)])
    assert 999 not in out, "deleted listing still treated as live"
    assert sorted(out) == [1]


def test_drops_the_duplicate_sku_pair_that_was_deleted():
    """The real 2026-09-16 case: two drafts sharing a SKU, both deleted."""
    rows = [
        row(4576478333, NEW),
        row(4522856685, OLD, sku="WH-UN-B-7584"),
        row(4522923804, OLD, sku="WH-UN-B-7584"),
    ]
    out = latest_from_current_capture(rows)
    assert sorted(out) == [4576478333]
    skus = [v["sku"] for v in out.values()]
    assert "WH-UN-B-7584" not in skus


def test_all_rows_stale_is_not_possible_to_produce_an_empty_sync():
    """If every row shares one timestamp, nothing is dropped — even an old one."""
    out = latest_from_current_capture([row(1, OLD), row(2, OLD)])
    assert sorted(out) == [1, 2], "a quiet day must not empty the sync"


def test_parsed_json_string_is_decoded():
    out = latest_from_current_capture([
        {"listing_id": 7, "sku": None, "parsed": '{"title": "from json"}', "captured_at": NEW}
    ])
    assert out[7]["parsed"] == {"title": "from json"}


def test_parsed_dict_passes_through():
    out = latest_from_current_capture([row(7, NEW, parsed={"title": "already a dict"})])
    assert out[7]["parsed"] == {"title": "already a dict"}
