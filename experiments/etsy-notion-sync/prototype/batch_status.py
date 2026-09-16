#!/usr/bin/env python3
"""Read-only status of the holiday batch on Etsy.

Answers "what's actually live?" without touching anything: for each listing in
holiday_listing_ids.json it reports state, price, image count, PDF count and
whether personalization is on — read straight from Etsy, not from our payloads.

Safe to run any time; uses listings_r only and makes no writes.

Usage (from Katy's terminal, op-injected env):
  python batch_status.py
"""
import json
import os
import sys

import requests

from etsy_api import API_BASE

STATE_MARK = {"active": "LIVE", "draft": "draft", "inactive": "inactive",
              "expired": "expired", "sold_out": "sold out"}


def summarize(listing, images, files):
    """Shape one row. Pure, so the display stays honest about what was read."""
    state = (listing.get("state") or "?").lower()
    return {
        "state": state,
        "mark": STATE_MARK.get(state, state),
        "title": (listing.get("title") or "")[:46],
        "price": listing.get("price") or {},
        "images": len(images),
        "files": len(files),
        "personalized": bool(listing.get("is_personalizable")),
        "views": listing.get("views"),
    }


def main():
    from env import load_env
    load_env()
    api_key = os.environ["ETSY_API_KEY"]
    shared_secret = os.environ["ETSY_SHARED_SECRET"]
    shop_id = os.environ["ETSY_SHOP_ID"]

    here = os.path.dirname(os.path.abspath(__file__))
    with open(os.path.join(here, "holiday_listing_ids.json")) as f:
        idmap = json.load(f)

    from scheduled_run import refresh_tokens_from_store
    from store_supabase import SupabaseStore
    backend = SupabaseStore(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])
    token = refresh_tokens_from_store(backend, api_key)
    headers = {
        "x-api-key": "{}:{}".format(api_key, shared_secret),
        "Authorization": "Bearer {}".format(token),
    }

    def get(url):
        r = requests.get(url, headers=headers, timeout=30)
        return r.json() if r.status_code == 200 else {}

    rows, live, problems = [], 0, []
    for entry in idmap["listings"]:
        lid = entry["listing_id"]
        listing = get("{}/v3/application/listings/{}".format(API_BASE, lid))
        if not listing:
            problems.append("{} — could not read listing {}".format(entry["name"], lid))
            continue
        images = (get("{}/v3/application/listings/{}/images".format(API_BASE, lid)) or {}).get("results") or []
        files = (get("{}/v3/application/shops/{}/listings/{}/files".format(API_BASE, shop_id, lid)) or {}).get("results") or []
        s = summarize(listing, images, files)
        rows.append((entry["name"], s))
        if s["state"] == "active":
            live += 1
        expected_imgs = 6 if "bundle" in entry["name"].lower() else 12
        if s["images"] != expected_imgs:
            problems.append("{} — {} images, expected {}".format(entry["name"], s["images"], expected_imgs))
        if s["files"] != 2:
            problems.append("{} — {} PDFs, expected 2".format(entry["name"], s["files"]))
        if "Personalized" in entry["name"] and not s["personalized"]:
            problems.append("{} — personalization is OFF".format(entry["name"]))

    print("\n{:<40} {:<9} {:>4} {:>5} {:>6} {:>7}".format(
        "LISTING", "STATE", "IMGS", "PDFS", "PERS", "VIEWS"))
    print("-" * 76)
    for name, s in rows:
        print("{:<40} {:<9} {:>4} {:>5} {:>6} {:>7}".format(
            name[:38], s["mark"], s["images"], s["files"],
            "yes" if s["personalized"] else "-",
            s["views"] if s["views"] is not None else "-"))
    print("-" * 76)
    print("{} of {} live".format(live, len(rows)))

    if problems:
        print("\nNeeds attention:")
        for p in problems:
            print("  - " + p)
        return 1
    print("\nEvery listing has its full gallery, both PDFs, and personalization where expected.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
