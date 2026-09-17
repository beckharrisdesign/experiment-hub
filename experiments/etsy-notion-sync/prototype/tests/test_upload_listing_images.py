import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import upload_listing_images as uli


def test_gallery_plan_orders_roles_and_strips_prefixes():
    files = [
        "Listing-WH-UN-S-0DF4-scale.png", "Listing-WH-UN-S-0DF4-hero.png",
        "Listing-WH-UN-S-0DF4-faq-1.png", "notes.txt", "Listing-WH-UN-S-0DF4-wip-01.png",
    ]
    plan = uli.gallery_plan(files, "WH-UN-S-0DF4")
    assert [e["role"] for e in plan] == ["hero", "scale", "faq-1"]


def test_gallery_plan_handles_staging_bundle_naming():
    files = ["Listing-WH-UN-B-STAGING-hero.jpg", "Listing-WH-UN-B-STAGING-detail-2.jpg",
             "Listing-WH-UN-B-STAGING-content-center.jpg"]
    plan = uli.gallery_plan(files, "WH-UN-B-STAGING")
    assert [e["role"] for e in plan] == ["hero", "content-center", "detail-2"]


def test_alt_for_uses_pack_then_bundle_fallback():
    pack = {"Christmas Bow": {"hero": "Bow hero alt"}}
    assert uli.alt_for(pack, "Christmas Bow", "hero") == "Bow hero alt"
    assert "candy cane" in uli.alt_for(pack, "Christmas Classics Set (bundle of 4)", "detail-2")
    assert uli.alt_for(pack, "Christmas Bow", "lifestyle") is None
