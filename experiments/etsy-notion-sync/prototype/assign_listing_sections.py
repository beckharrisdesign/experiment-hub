#!/usr/bin/env python3
"""Put each holiday listing in its Etsy shop section.

Part of the gated listing-edit tooling (SPEC.md guardrail 5): manual-only,
dry-run by default, interactive confirmation.

Etsy allows exactly ONE section per listing (`shop_section_id` is a single
value), so the split is: the 4 classics and the bundle in Holiday, the 4
personalizable globes in Personalized. That mapping lives in
holiday_listing_ids.json alongside the section ids.

Creating a section needs the `shops_w` scope, which this token does not have —
create the two sections in Shop Manager first and put their numeric ids in
holiday_listing_ids.json (`shop_sections`). This script only assigns.

Resume is inherent: a listing already in its target section is skipped, so
reruns are free. After each change the listing is re-read and the section
verified, because a PATCH that silently no-ops is otherwise invisible.

Usage (from Katy's terminal, op-injected env):
  python assign_listing_sections.py            # dry run: plan only
  python assign_listing_sections.py --apply    # plan, confirm, assign
"""
import argparse
import json
import logging
import os
import time

import requests

from etsy_api import API_BASE

log = logging.getLogger("assign_listing_sections")

PACING_SECONDS = 0.4


def resolve_sections(idmap):
    """Section name -> id, or a list of names still missing an id. Pure."""
    sections = {k: v for k, v in (idmap.get("shop_sections") or {}).items()
                if k != "comment"}
    missing = [name for name, sid in sections.items() if not sid]
    return sections, missing


def plan_changes(listings, sections, current_by_id):
    """Listings whose section differs from target. Pure; unit-tested."""
    out = []
    for entry in listings:
        target_name = entry.get("section")
        if not target_name:
            continue
        target_id = sections.get(target_name)
        current = current_by_id.get(entry["listing_id"])
        if current is not None and str(current) == str(target_id):
            continue
        out.append({**entry, "target_name": target_name, "target_id": target_id,
                    "current": current})
    return out


def main():
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true",
                        help="assign after typing 'assign' at the prompt (default: dry run)")
    args = parser.parse_args()

    from env import load_env
    load_env()
    api_key = os.environ["ETSY_API_KEY"]
    shared_secret = os.environ["ETSY_SHARED_SECRET"]
    shop_id = os.environ["ETSY_SHOP_ID"]

    here = os.path.dirname(os.path.abspath(__file__))
    with open(os.path.join(here, "holiday_listing_ids.json")) as f:
        idmap = json.load(f)

    sections, missing = resolve_sections(idmap)
    if missing:
        raise SystemExit(
            "No section id for: {}.\n"
            "Create the section(s) in Shop Manager, then put the numeric id in "
            "holiday_listing_ids.json under 'shop_sections'. "
            "(Creating sections needs the shops_w scope, which this token lacks.)"
            .format(", ".join(missing)))

    from scheduled_run import refresh_tokens_from_store
    from store_supabase import SupabaseStore
    backend = SupabaseStore(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])
    token = refresh_tokens_from_store(backend, api_key)
    headers = {
        "x-api-key": "{}:{}".format(api_key, shared_secret),
        "Authorization": "Bearer {}".format(token),
    }

    # Read current sections first so the plan reflects Etsy, not our assumptions.
    current_by_id = {}
    for entry in idmap["listings"]:
        lid = entry["listing_id"]
        try:
            r = requests.get("{}/v3/application/listings/{}".format(API_BASE, lid),
                             headers=headers, timeout=30)
            current_by_id[lid] = (r.json() or {}).get("shop_section_id") if r.status_code == 200 else None
        except requests.RequestException as exc:
            log.error("could not read listing %s: %s", lid, exc)
            current_by_id[lid] = None
        time.sleep(PACING_SECONDS)

    changes = plan_changes(idmap["listings"], sections, current_by_id)
    for name, sid in sections.items():
        n = sum(1 for e in idmap["listings"] if e.get("section") == name)
        print("SECTION  {} (id {}) — {} listing(s)".format(name, sid, n))
    for c in changes:
        print("PLAN  {} (listing {}) — section {} -> {} ({})".format(
            c["name"], c["listing_id"], c["current"] or "none", c["target_id"], c["target_name"]))
    if not changes:
        print("\nEvery listing is already in its section — nothing to do.")
        return

    if not args.apply:
        print("\nDry run — nothing changed. Rerun with --apply to assign.")
        return

    answer = input("Type 'assign' to set these sections on Etsy: ")
    if answer.strip().lower() != "assign":
        raise SystemExit("aborted — nothing changed")

    failed = 0
    for c in changes:
        lid = c["listing_id"]
        url = "{}/v3/application/shops/{}/listings/{}".format(API_BASE, shop_id, lid)
        try:
            resp = requests.patch(url, headers=headers,
                                  data={"shop_section_id": c["target_id"]}, timeout=60)
        except requests.RequestException as exc:
            failed += 1
            log.error("FAILED %s: %s", c["name"], exc)
            continue
        if resp.status_code != 200:
            failed += 1
            log.error("FAILED %s: HTTP %s %s", c["name"], resp.status_code, resp.text[:200])
            continue
        # Verify from the response, not from the fact that it returned 200:
        # a PATCH that quietly ignored the field would otherwise look like success.
        got = (resp.json() or {}).get("shop_section_id")
        ok = str(got) == str(c["target_id"])
        log.info("  %s -> %s (%s) %s", c["name"], c["target_name"], got,
                 "OK" if ok else "CHECK IN SHOP MANAGER")
        if not ok:
            failed += 1
        time.sleep(PACING_SECONDS)

    if failed:
        raise SystemExit("{} failures — rerun to resume".format(failed))
    print("\nSections assigned. Buyers browsing the shop will see both shelves.")


if __name__ == "__main__":
    main()
