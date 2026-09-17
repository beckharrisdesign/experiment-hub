#!/usr/bin/env python3
"""Apply approved tag-experiment copy (titles + tags) via the Etsy API.

This is the separately-gated LISTING-EDIT WRITER — the one deliberate
exception to the capture/sync system's one-directional guardrail (SPEC.md
guardrail 5). The capture/sync pipeline (capture.py, sync_notion.py,
etsy_api.py) remains GET-only against Etsy; this script is manual-only,
never scheduled, and writes nothing without an interactive confirmation.

Reads a payload JSON (default listing_copy_2026-09.json), refuses any
listing in the experiment's protected or control groups, shows a full
before/after plan (current title AND tags), and PATCHes updateListing only
after the operator types 'apply'. After each write it verifies the response
echoes the sent title and tags, and aborts the remaining writes on the
first mismatch.

Usage (run from Katy's own terminal with vault creds in env):
  python apply_listing_copy.py            # dry run: validate + show the plan
  python apply_listing_copy.py --apply    # plan, confirm interactively, write
"""
import argparse
import json
import logging
import os
import re
import time

import requests

from env import load_env
from etsy_api import API_BASE, EtsyClient

log = logging.getLogger("apply_listing_copy")

# Experiment groups that must never be edited before the day-30 readout
# (docs/tag-positioning-experiment.md). Defense in depth: refuse them even
# if a payload mistakenly includes one.
PROTECTED = {4415035303, 4466080258, 4466076995, 4417250225}
CONTROL = {4466078772, 4466791377, 4417250834, 4466795015, 4466795496, 4465357735}

TITLE_MAX = 140
TAG_MAX = 20
TAGS_PER_LISTING = 13
# Etsy's tag charset: letters, numbers, whitespace, -, ', ™, ©, ®
TAG_BAD_CHARS = re.compile(r"[^A-Za-z0-9\s\-'™©®]")

WRITE_PACING_SECONDS = 0.3
MAX_429_RETRIES = 3


def validate(entries):
    """Return a list of problems; also normalizes listing_id to int in place
    so the protected/control membership checks can't be bypassed by a string
    id in the JSON."""
    errors = []
    for e in entries:
        raw_id = e.get("listing_id")
        try:
            lid = int(raw_id)
        except (TypeError, ValueError):
            errors.append("listing_id {!r}: not an integer — refusing".format(raw_id))
            continue
        e["listing_id"] = lid
        title, tags = e["title"], e["tags"]
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


def print_plan(entries, client):
    """Fetch current state and print a full before/after plan."""
    print("\nPlan — {} listings:\n".format(len(entries)))
    for e in entries:
        current = client.get("/v3/application/listings/{}".format(e["listing_id"]))
        print("[{}] {} ({})".format(e["listing_id"], e["group"], current.get("state", "?")))
        print("  title now: {}".format(current.get("title", "?")))
        print("  title new: {}".format(e["title"]))
        print("  tags now:  {}".format(", ".join(current.get("tags") or []) or "(none)"))
        print("  tags new:  {}\n".format(", ".join(e["tags"])))


def apply_updates(entries, shop_id, headers, patch=requests.patch, sleep=time.sleep):
    """PATCH each listing; verify the response echoes what we sent.

    Honors 429/retry-after (bounded retries), paces between writes, and
    catches per-listing request exceptions so one failure can't leave a
    traceback instead of a report. A response that doesn't echo the sent
    title+tags aborts the REMAINING writes: it means our request encoding
    and Etsy's interpretation disagree, and continuing would corrupt more
    listings. Returns (updated, failed, aborted_early).
    """
    updated, failed = 0, 0
    for i, e in enumerate(entries):
        url = "{}/v3/application/shops/{}/listings/{}".format(API_BASE, shop_id, e["listing_id"])
        # Etsy's OpenAPI declares tags as form-style, explode=false — a
        # single comma-separated field ("A comma-separated list of tag
        # strings", per the updateListing schema).
        data = {"title": e["title"], "tags": ",".join(e["tags"])}
        try:
            resp = None
            for attempt in range(MAX_429_RETRIES + 1):
                resp = patch(url, headers=headers, data=data, timeout=30)
                if resp.status_code != 429:
                    break
                try:
                    retry_after = float(resp.headers.get("retry-after", 1))
                except (TypeError, ValueError):
                    retry_after = 1.0
                log.warning("429 on %s — honoring retry-after=%ss", e["listing_id"], retry_after)
                sleep(retry_after)
        except requests.RequestException as exc:
            failed += 1
            log.error("FAILED %s: %s", e["listing_id"], exc)
            continue
        if resp.status_code != 200:
            failed += 1
            log.error("FAILED %s: HTTP %s %s", e["listing_id"], resp.status_code, resp.text[:300])
            continue
        body = resp.json()
        if body.get("title") != e["title"] or (body.get("tags") or []) != e["tags"]:
            failed += 1
            log.error("MISMATCH on %s: Etsy's response does not echo the sent title/tags — "
                      "aborting the remaining %s writes. Verify this listing in Shop Manager.",
                      e["listing_id"], len(entries) - i - 1)
            return updated, failed, True
        updated += 1
        log.info("updated %s (%s)", e["listing_id"], e["group"])
        sleep(WRITE_PACING_SECONDS)
    return updated, failed, False


def main():
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--payload", default="listing_copy_2026-09.json")
    parser.add_argument("--apply", action="store_true",
                        help="write to Etsy after typing 'apply' at the prompt (default: dry run)")
    args = parser.parse_args()

    load_env()
    api_key = os.environ["ETSY_API_KEY"]
    shared_secret = os.environ["ETSY_SHARED_SECRET"]
    shop_id = os.environ["ETSY_SHOP_ID"]

    from scheduled_run import refresh_tokens_from_store
    from store_supabase import SupabaseStore
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
    print_plan(entries, client)

    if not args.apply:
        print("Dry run — nothing written. Rerun with --apply to update Etsy.")
        return

    answer = input("Type 'apply' to write these {} updates to Etsy: ".format(len(entries)))
    if answer.strip().lower() != "apply":
        raise SystemExit("aborted — nothing written")

    headers = {
        "x-api-key": "{}:{}".format(api_key, shared_secret),
        "Authorization": "Bearer {}".format(token),
    }
    updated, failed, aborted = apply_updates(entries, shop_id, headers)
    if failed:
        raise SystemExit("{} updated, {} failed{} — verify in Shop Manager".format(
            updated, failed, ", remaining writes aborted" if aborted else ""))
    print("\nAll {} listings updated. Today is day 0 — the next sync run records the change.".format(updated))


if __name__ == "__main__":
    main()
