#!/usr/bin/env python3
"""Upload the holiday drafts' gallery images to Etsy, with alt text.

Part of the gated listing-edit tooling (SPEC.md guardrail 5): manual-only,
dry-run by default, interactive confirmation. For each draft in
holiday_listing_ids.json, uploads its gallery folder's images in role order
with an EXPLICIT rank per image (Etsy's rank is an insert position, not an
append index — sequential rank i on a listing holding i-1 images is the one
deterministic ordering), and sets each image's alt text from
holiday_alt_text_2026.json at upload time.

Resume is by count: a listing already holding N images continues from role
N+1, so reruns never duplicate. After each listing, placement is verified
by re-reading the images and comparing count and rank sequence.

Usage (from Katy's terminal, op-injected env):
  python upload_listing_images.py            # dry run: plan only
  python upload_listing_images.py --apply    # plan, confirm, upload
"""
import argparse
import json
import logging
import os
import time

import requests

from etsy_api import API_BASE

log = logging.getLogger("upload_listing_images")

ROLE_ORDER = [
    "hero", "lifestyle", "scale", "transferring", "content-tl", "content-center",
    "content-bl", "content-suggestions-4up", "badge", "faq-1", "faq-2", "faq-3",
    "endcap", "color-options", "detail-1", "detail-2", "detail-3", "detail-4",
]
PACING_SECONDS = 0.4

BUNDLE_ALT_FALLBACKS = {
    "detail-1": "Detail: the Christmas bow pattern from the Christmas Classics set",
    "detail-2": "Detail: the candy cane pattern from the Christmas Classics set",
    "detail-3": "Detail: the nutcracker pattern from the Christmas Classics set",
    "detail-4": "Detail: the poinsettia pattern from the Christmas Classics set",
    "content-center": "Close-up grid of the four Christmas Classics patterns",
}


def gallery_plan(folder_files, sku_prefix):
    """Order a folder's images by role. Pure; unit-tested."""
    entries = []
    for f in folder_files:
        if not f.lower().endswith((".png", ".jpg", ".jpeg")):
            continue
        role = f
        for pre in (f"Listing-{sku_prefix}-", "Listing-"):
            if role.startswith(pre):
                role = role[len(pre):]
                break
        role = role.rsplit(".", 1)[0]
        if role in ROLE_ORDER:
            entries.append({"role": role, "name": f})
    entries.sort(key=lambda e: ROLE_ORDER.index(e["role"]))
    return entries


def alt_for(alt_pack, listing_name, role):
    """Alt text for a role, with bundle fallbacks; None means no alt sent."""
    per = alt_pack.get(listing_name) or {}
    return per.get(role) or BUNDLE_ALT_FALLBACKS.get(role)


def main():
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true",
                        help="upload after typing 'upload' at the prompt (default: dry run)")
    parser.add_argument("--listing", type=int, help="limit to one listing id")
    args = parser.parse_args()

    from env import load_env
    load_env()
    api_key = os.environ["ETSY_API_KEY"]
    shared_secret = os.environ["ETSY_SHARED_SECRET"]
    shop_id = os.environ["ETSY_SHOP_ID"]

    here = os.path.dirname(os.path.abspath(__file__))
    with open(os.path.join(here, "holiday_listing_ids.json")) as f:
        idmap = json.load(f)
    with open(os.path.join(here, "holiday_alt_text_2026.json")) as f:
        alt_pack = json.load(f)
    root = os.environ.get("GALLERY_ROOT", idmap["gallery_root"])

    plans = []
    for entry in idmap["listings"]:
        if args.listing and entry["listing_id"] != args.listing:
            continue
        folder = os.path.join(root, entry["folder"])
        if not os.path.isdir(folder):
            log.error("missing gallery folder for %s: %s", entry["name"], folder)
            continue
        sku_prefix = os.path.basename(entry["folder"])
        images = gallery_plan(sorted(os.listdir(folder)), sku_prefix)
        missing_alt = [i["role"] for i in images if not alt_for(alt_pack, entry["name"], i["role"])]
        plans.append({**entry, "dir": folder, "images": images, "missing_alt": missing_alt})
        print("PLAN  {} (listing {}) — {} images: {}{}".format(
            entry["name"], entry["listing_id"], len(images),
            ", ".join(i["role"] for i in images),
            "  [NO ALT for: {}]".format(", ".join(missing_alt)) if missing_alt else ""))

    if not args.apply:
        print("\nDry run — nothing uploaded. Rerun with --apply to upload.")
        return

    answer = input("Type 'upload' to send these images to Etsy: ")
    if answer.strip().lower() != "upload":
        raise SystemExit("aborted — nothing uploaded")

    from scheduled_run import refresh_tokens_from_store
    from store_supabase import SupabaseStore
    backend = SupabaseStore(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])
    token = refresh_tokens_from_store(backend, api_key)
    headers = {
        "x-api-key": "{}:{}".format(api_key, shared_secret),
        "Authorization": "Bearer {}".format(token),
    }

    failed = 0
    for plan in plans:
        lid = plan["listing_id"]
        base = "{}/v3/application/shops/{}/listings/{}/images".format(API_BASE, shop_id, lid)
        listing_url = "{}/v3/application/listings/{}/images".format(API_BASE, lid)
        try:
            existing = requests.get(listing_url, headers=headers, timeout=30).json().get("results") or []
        except requests.RequestException as exc:
            failed += 1
            log.error("FAILED reading images for %s: %s", plan["name"], exc)
            continue
        start = len(existing)
        if start >= len(plan["images"]):
            log.info("SKIP %s — already has %s images", plan["name"], start)
            continue
        log.info("UPLOAD %s — resuming at image %s of %s", plan["name"], start + 1, len(plan["images"]))
        for i in range(start, len(plan["images"])):
            img = plan["images"][i]
            alt = alt_for(alt_pack, plan["name"], img["role"])
            data = {"rank": i + 1}
            if alt:
                data["alt_text"] = alt[:500]
            try:
                with open(os.path.join(plan["dir"], img["name"]), "rb") as fh:
                    resp = requests.post(base, headers=headers, data=data,
                                         files={"image": (img["name"], fh)}, timeout=120)
            except requests.RequestException as exc:
                failed += 1
                log.error("  FAILED %s: %s (rerun resumes here)", img["name"], exc)
                break
            if resp.status_code != 201:
                failed += 1
                log.error("  FAILED %s: HTTP %s %s (rerun resumes here)",
                          img["name"], resp.status_code, resp.text[:200])
                break
            log.info("  uploaded %s (rank %s%s)", img["role"], i + 1, ", alt set" if alt else "")
            time.sleep(PACING_SECONDS)
        # Verify placement — count and rank sequence, per the rank-insert lesson.
        try:
            after = requests.get(listing_url, headers=headers, timeout=30).json().get("results") or []
            ranks = sorted(im.get("rank") for im in after)
            ok = len(after) == len(plan["images"]) and ranks == list(range(1, len(after) + 1))
            log.info("  VERIFY %s: %s images, ranks %s -> %s",
                     plan["name"], len(after), ranks, "OK" if ok else "CHECK IN SHOP MANAGER")
        except requests.RequestException:
            log.warning("  VERIFY %s: could not re-read images", plan["name"])

    if failed:
        raise SystemExit("{} failures — rerun to resume".format(failed))
    print("\nAll galleries uploaded. Next: PDF files, then review and activate.")


if __name__ == "__main__":
    main()
