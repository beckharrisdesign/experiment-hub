"""Shop-section assignment — one section per listing, and don't churn.

Etsy's `shop_section_id` is a single value, so the split is deliberate: the
classics and the bundle in Holiday, the personalizable globes in Personalized.
These pin that a rerun is free and that a missing section id stops the run
rather than writing a null section over a real one.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import assign_listing_sections as als

SECTIONS = {"Holiday": 111, "Personalized": 222}

LISTINGS = [
    {"listing_id": 1, "name": "Bow", "section": "Holiday"},
    {"listing_id": 2, "name": "Snowman Globe", "section": "Personalized"},
]


def test_resolve_sections_ignores_the_comment_key():
    sections, missing = als.resolve_sections(
        {"shop_sections": {"comment": "how to fill this in", "Holiday": 111}})
    assert sections == {"Holiday": 111}
    assert missing == []


def test_resolve_sections_reports_missing_ids():
    sections, missing = als.resolve_sections(
        {"shop_sections": {"Holiday": 111, "Personalized": None}})
    assert missing == ["Personalized"]


def test_resolve_sections_handles_no_block_at_all():
    sections, missing = als.resolve_sections({})
    assert sections == {} and missing == []


def test_plans_listings_with_no_section_yet():
    changes = als.plan_changes(LISTINGS, SECTIONS, {1: None, 2: None})
    assert [(c["listing_id"], c["target_id"]) for c in changes] == [(1, 111), (2, 222)]


def test_skips_listings_already_in_their_section():
    """A rerun must be free — no needless PATCH churn on the live shop."""
    changes = als.plan_changes(LISTINGS, SECTIONS, {1: 111, 2: 222})
    assert changes == []


def test_moves_a_listing_out_of_the_wrong_section():
    changes = als.plan_changes(LISTINGS, SECTIONS, {1: 999, 2: 222})
    assert len(changes) == 1
    assert changes[0]["listing_id"] == 1
    assert changes[0]["current"] == 999


def test_section_id_compared_as_string_not_type():
    """Etsy returns the id as an int; JSON config may hold a string."""
    changes = als.plan_changes(LISTINGS, {"Holiday": "111", "Personalized": 222},
                               {1: 111, 2: 222})
    assert changes == [], "a type difference must not look like a change"


def test_listing_without_a_section_is_left_alone():
    listings = LISTINGS + [{"listing_id": 3, "name": "Unrelated"}]
    changes = als.plan_changes(listings, SECTIONS, {1: 111, 2: 222, 3: None})
    assert changes == []
