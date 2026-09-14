#!/usr/bin/env python3
"""Apply approved tag-experiment copy (titles + tags) via the Etsy API.

The listing-edit tooling the write scope exists for — the capture/sync client
in etsy_api.py stays GET-only. Reads a payload JSON (default
listing_copy_2026-09.json), refuses any listing in the experiment's protected
or control groups, shows a before/after plan, and PATCHes updateListing only
after confirmation.

Usage (run from Katy's own terminal with vault creds in env):
  python apply_listing_copy.py            # dry run: validate + show the plan
  python apply_listing_copy.py --apply    # plan, confirm interactively, write
"""
import argparse
import json
import logging
import os
import re
import sys

import requests

from env import load_env
from etsy_api import API_BASE, EtsyApiError, EtsyClient
from scheduled_run import refresh_tokens_from_store
from store_supabase import SupabaseStore

log = logging.getLogger("apply_listing_copy")

# Experiment groups that must never be edited before the day-30 readout
# (tag-positioning-experiment.md). Defense in depth: refuse them even if a
# payload mistakenly includes one.
PROTECTED = {4415035303, 4466080258, 4466076995, 4417250225}
CONTROL = {4466078772, 4466791377, 4417250834, 4466795015, 4466795496, 4465357735}

TITLE_MAX = 140
TAG_MAX = 20
TAGS_PER_LISTING = 13
# Etsy's tag charset: letters, numbers, whitespace, -, ', ™, ©, ®
TAG_BAD_CHARS = re.compile(r"[^A-Za-z0-9\s\-'™©®]")


def validate(entries):
    errors = []
    for e in entries:
        lid, title, tags = e["listing_id"], e["title"], e["tags"]
        where = "listing {}".format(lid)
        if lid in PROTECTED or lid in CONTROL:
            errors.append("{}: in the protected/control group — refusing".format(where))
        if len(title) > TITLE_MAX:
            errors.append("{}: title {} chars (max {})".format(where, len(title), TITLE_MAX))
        if len(tags) != TAGS_PER_LISTING:
            errors.append("{}: {} tags (need {})".format(where, len(tags), TAGS_PER_LISTING))
        if len(set(tags)) != len(tags):
            errors.append("{}: duplicate tag within set".format(where))
        for t in tags:
            if len(t) > TAG_MAX:
                errors.append("{}: tag '{}' is {} chars (max {})".format(where, t, len(t), TAG_MAX))
            if TAG_BAD_CHARS.search(t):
                errors.append("{}: tag '{}' has characters Etsy rejects".format(where, t))
    return errors


def main():
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--payload", default="listing_copy_2026-09.json")
    parser.add_argument("--apply", action="store_true",
                        help="write to Etsy after confirmation (default: dry run)")
    parser.add_argument("--yes", action="store_true",
                        help="skip the interactive confirmation (for non-TTY runs)")
    args = parser.parse_args()

    load_env()
    api_key = os.environ["ETSY_API_KEY"]
    shared_secret = os.environ["ETSY_SHARED_SECRET"]
    shop_id = os.environ["ETSY_SHOP_ID"]
    backend = SupabaseStore(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

    with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), args.payload)) as f:
        entries = json.load(f)["listings"]

    errors = validate(entries)
    if errors:
        for e in errors:
            log.error(e)
        raise SystemExit("payload failed validation — nothing was sent to Etsy")

    token = refresh_tokens_from_store(backend, api_key)
    client = EtsyClient(api_key, token, shared_secret=shared_secret)

    print("\nPlan — {} listings:\n".format(len(entries)))
    for e in entries:
        current = client.get("/v3/application/listings/{}".format(e["listing_id"]))
        e["_current_title"] = current.get("title", "?")
        print("[{}] {} ({})".format(e["listing_id"], e["group"], current.get("state", "?")))
        print("  now: {}".format(e["_current_title"]))
        print("  new: {}".format(e["title"]))
        print("  tags: {}\n".format(", ".join(e["tags"])))

    if not args.apply:
        print("Dry run — nothing written. Rerun with --apply to update Etsy.")
        return

    if not args.yes:
        answer = input("Type 'apply' to write these {} updates to Etsy: ".format(len(entries)))
        if answer.strip().lower() != "apply":
            raise SystemExit("aborted — nothing written")

    headers = {
        "x-api-key": "{}:{}".format(api_key, shared_secret),
        "Authorization": "Bearer {}".format(token),
    }
    failures = 0
    for e in entries:
        url = "{}/v3/application/shops/{}/listings/{}".format(API_BASE, shop_id, e["listing_id"])
        resp = requests.patch(url, headers=headers,
                              data={"title": e["title"], "tags": ",".join(e["tags"])},
                              timeout=30)
        if resp.status_code == 200 and resp.json().get("title") == e["title"]:
            log.info("updated %s (%s)", e["listing_id"], e["group"])
        else:
            failures += 1
            log.error("FAILED %s: HTTP %s %s", e["listing_id"], resp.status_code, resp.text[:300])
    if failures:
        raise SystemExit("{} of {} updates failed — verify in Shop Manager".format(failures, len(entries)))
    print("\nAll {} listings updated. Today is day 0 — the next sync run records the change.".format(len(entries)))


if __name__ == "__main__":
    main()
