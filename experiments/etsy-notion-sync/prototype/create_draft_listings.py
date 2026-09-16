#!/usr/bin/env python3
"""Create DRAFT Etsy listings from an approved copy payload.

Part of the separately-gated listing-edit tooling (see apply_listing_copy.py
and SPEC.md guardrail 5) — manual-only, never scheduled. Creates listings in
draft state only: drafts are invisible to buyers and activation stays a human
step in Shop Manager (after images and PDF files are attached).

Usage (run from Katy's own terminal with vault creds in env):
  python create_draft_listings.py            # dry run: validate + show the plan
  python create_draft_listings.py --apply    # plan, confirm interactively, create
"""
import argparse
import json
import logging
import os
import time

import requests

from apply_listing_copy import TAG_BAD_CHARS, TAG_MAX, TAGS_PER_LISTING, TITLE_MAX
from env import load_env
from etsy_api import API_BASE

log = logging.getLogger("create_draft_listings")

TEMPLATE_REQUIRED = ("taxonomy_id", "who_made", "when_made", "is_supply", "type")
WRITE_PACING_SECONDS = 0.3


def validate(payload):
    errors = []
    template = payload.get("template") or {}
    for key in TEMPLATE_REQUIRED:
        if key not in template:
            errors.append("template: missing {}".format(key))
    for e in payload.get("listings") or []:
        where = e.get("name") or "unnamed entry"
        title, tags = e.get("title") or "", e.get("tags") or []
        if not title or len(title) > TITLE_MAX:
            errors.append("{}: title {} chars (need 1-{})".format(where, len(title), TITLE_MAX))
        if not e.get("description"):
            errors.append("{}: missing description".format(where))
        if not isinstance(e.get("price"), (int, float)) or e["price"] <= 0:
            errors.append("{}: price must be a positive number".format(where))
        if not isinstance(e.get("quantity"), int) or e["quantity"] <= 0:
            errors.append("{}: quantity must be a positive integer".format(where))
        if len(tags) != TAGS_PER_LISTING:
            errors.append("{}: {} tags (need {})".format(where, len(tags), TAGS_PER_LISTING))
        if len(set(tags)) != len(tags):
            errors.append("{}: duplicate tag within set".format(where))
        for t in tags:
            if len(t) > TAG_MAX:
                errors.append("{}: tag '{}' is {} chars (max {})".format(where, t, len(t), TAG_MAX))
            if TAG_BAD_CHARS.search(t):
                errors.append("{}: tag '{}' has characters Etsy rejects".format(where, t))
    if not payload.get("listings"):
        errors.append("payload has no listings")
    return errors




def personalization_body(pers):
    """updateListingPersonalization wants a JSON personalization_questions
    array (one text_input question here), not flat listing fields."""
    return {
        "personalization_questions": [{
            "question_text": "Custom text for your pattern",
            "instructions": pers["instructions"],
            "question_type": "text_input",
            "required": bool(pers.get("is_required")),
            "max_allowed_characters": pers.get("char_count_max", 40),
        }],
    }


def set_personalization(shop_id, lid, pers, headers, post=requests.post):
    """Returns an error string, or None on success."""
    purl = "{}/v3/application/shops/{}/listings/{}/personalization".format(API_BASE, shop_id, lid)
    jheaders = dict(headers, **{"Content-Type": "application/json"})
    try:
        presp = post(purl, headers=jheaders, json=personalization_body(pers), timeout=30)
    except requests.RequestException as exc:
        return str(exc)
    if presp.status_code not in (200, 201):
        return "HTTP {} {}".format(presp.status_code, presp.text[:200])
    return None

def create_drafts(payload, shop_id, headers, post=requests.post, sleep=time.sleep):
    """POST each draft; verify the response is a draft echoing the sent title.

    Returns (created, failed) where created is a list of
    (name, listing_id) tuples. Per-listing failures are reported and the
    remaining creations continue — each draft is independent and drafts are
    invisible to buyers, so there is no cross-listing corruption to fail-fast
    against.
    """
    template = payload["template"]
    created, failed = [], 0
    url = "{}/v3/application/shops/{}/listings".format(API_BASE, shop_id)
    for e in payload["listings"]:
        data = {
            "title": e["title"],
            "description": e["description"],
            "price": e["price"],
            "quantity": e["quantity"],
            "tags": ",".join(e["tags"]),
            "taxonomy_id": template["taxonomy_id"],
            "who_made": template["who_made"],
            "when_made": template["when_made"],
            "is_supply": "true" if template["is_supply"] else "false",
            "type": template["type"],
            **({"styles": ",".join(e["styles"])} if e.get("styles") else {}),
        }
        try:
            resp = post(url, headers=headers, data=data, timeout=30)
        except requests.RequestException as exc:
            failed += 1
            log.error("FAILED %s: %s", e["name"], exc)
            continue
        if resp.status_code != 201:
            failed += 1
            log.error("FAILED %s: HTTP %s %s", e["name"], resp.status_code, resp.text[:300])
            continue
        body = resp.json()
        if body.get("state") != "draft" or body.get("title") != e["title"]:
            failed += 1
            log.error("UNEXPECTED response for %s: state=%s — verify listing %s in Shop Manager",
                      e["name"], body.get("state"), body.get("listing_id"))
            continue
        lid = body["listing_id"]
        pers = e.get("personalization")
        if pers:
            err = set_personalization(shop_id, lid, pers, headers, post=post)
            if err:
                failed += 1
                log.error("PERSONALIZATION FAILED on %s (listing %s): %s — set it in Shop Manager", e["name"], lid, err)
                continue
        created.append((e["name"], lid))
        log.info("created draft %s -> listing %s%s", e["name"], lid,
                 " (personalization set)" if pers else "")
        sleep(WRITE_PACING_SECONDS)
    return created, failed


def main():
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--payload", default="holiday_drafts_2026.json")
    parser.add_argument("--apply", action="store_true",
                        help="create the drafts after typing 'create' at the prompt (default: dry run)")
    parser.add_argument("--personalize-ids",
                        help="repair mode: comma-separated listing ids to receive personalization, "
                             "zipped in order with the payload's personalizable entries; creates NO drafts")
    args = parser.parse_args()

    load_env()
    api_key = os.environ["ETSY_API_KEY"]
    shared_secret = os.environ["ETSY_SHARED_SECRET"]
    shop_id = os.environ["ETSY_SHOP_ID"]

    from scheduled_run import refresh_tokens_from_store
    from store_supabase import SupabaseStore
    backend = SupabaseStore(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

    with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), args.payload)) as f:
        payload = json.load(f)

    errors = validate(payload)
    if errors:
        for e in errors:
            log.error(e)
        raise SystemExit("payload failed validation — nothing was sent to Etsy")

    if args.personalize_ids:
        ids = [int(x) for x in args.personalize_ids.split(",") if x.strip()]
        pers_entries = [e for e in payload["listings"] if e.get("personalization")]
        if len(ids) != len(pers_entries):
            raise SystemExit("{} ids given but payload has {} personalizable listings".format(
                len(ids), len(pers_entries)))
        for e, lid in zip(pers_entries, ids):
            print("  {} -> listing {}".format(e["name"], lid))
        answer = input("Type 'personalize' to set personalization on these {} listings: ".format(len(ids)))
        if answer.strip().lower() != "personalize":
            raise SystemExit("aborted — nothing written")
        from scheduled_run import refresh_tokens_from_store as _r
        from store_supabase import SupabaseStore as _S
        _backend = _S(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])
        _token = _r(_backend, api_key)
        _headers = {"x-api-key": "{}:{}".format(api_key, shared_secret),
                    "Authorization": "Bearer {}".format(_token)}
        bad = 0
        for e, lid in zip(pers_entries, ids):
            err = set_personalization(shop_id, lid, e["personalization"], _headers)
            if err:
                bad += 1
                log.error("FAILED %s (listing %s): %s", e["name"], lid, err)
            else:
                log.info("personalization set on %s (listing %s)", e["name"], lid)
            time.sleep(WRITE_PACING_SECONDS)
        raise SystemExit("{} of {} failed".format(bad, len(ids)) if bad else None)

    print("\nPlan — {} DRAFT listings (invisible to buyers until activated):\n".format(len(payload["listings"])))
    for e in payload["listings"]:
        print("  {} — ${:.2f} — {}".format(e["name"], e["price"], e["title"]))
    print()

    if not args.apply:
        print("Dry run — nothing created. Rerun with --apply to create the drafts.")
        return

    answer = input("Type 'create' to create these {} draft listings: ".format(len(payload["listings"])))
    if answer.strip().lower() != "create":
        raise SystemExit("aborted — nothing created")

    token = refresh_tokens_from_store(backend, api_key)
    headers = {
        "x-api-key": "{}:{}".format(api_key, shared_secret),
        "Authorization": "Bearer {}".format(token),
    }
    created, failed = create_drafts(payload, shop_id, headers)
    for name, lid in created:
        print("  {} -> https://www.etsy.com/your/shops/me/listing-editor/edit/{}".format(name, lid))
    if failed:
        raise SystemExit("{} created, {} failed — see errors above".format(len(created), failed))
    print("\nAll {} drafts created. Next: images + PDF files, then activate from Shop Manager.".format(len(created)))


if __name__ == "__main__":
    main()
