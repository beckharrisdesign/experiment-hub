#!/usr/bin/env python3
"""Upload the holiday drafts' PDF deliverables to Etsy.

Part of the gated listing-edit tooling (SPEC.md guardrail 5): manual-only,
dry-run by default, interactive confirmation. For each draft in
holiday_listing_ids.json, uploads its component's printable PDFs in hoop-size
order (6in, then 8in) from the W+H Components store.

Etsy caps a digital listing at FILE_CAP files, which is why the bundle ships
as two merged multi-page PDFs (scripts/merge-bundle-pdfs.py) instead of eight
singles. The cap is enforced here too: a listing whose existing files plus
planned uploads would exceed it is refused rather than half-uploaded, because
the API rejects the overflow file and leaves the listing in a state no rerun
can reason about.

Resume is by filename: files already on the listing are skipped by name, so
reruns never duplicate and a partial run continues where it stopped. After
each listing, the upload is verified by re-reading the file list and comparing
names — not just the count, since a silently-renamed file would pass a count
check.

Usage (from Katy's terminal, op-injected env):
  python upload_listing_files.py            # dry run: plan only
  python upload_listing_files.py --apply    # plan, confirm, upload
"""
import argparse
import json
import logging
import os
import time

import requests

from etsy_api import API_BASE

log = logging.getLogger("upload_listing_files")

SIZE_ORDER = ["6in", "8in"]
FILE_CAP = 5  # Etsy's per-digital-listing file limit
PACING_SECONDS = 0.4
UPLOAD_TIMEOUT = 180  # PDFs run ~0.3-2 MB; the image uploader's 120s is tight


def file_plan(component, sizes=SIZE_ORDER):
    """The PDF filenames a component ships, in hoop-size order. Pure."""
    return [
        {"size": size, "name": "Printable-{}-{}.pdf".format(component, size)}
        for size in sizes
    ]


def pending_files(planned, existing_names):
    """Planned files not already on the listing, by filename. Pure."""
    have = {str(n).strip().lower() for n in existing_names}
    return [f for f in planned if f["name"].strip().lower() not in have]


def cap_exceeded(existing_count, pending_count, cap=FILE_CAP):
    """True when uploading everything pending would breach Etsy's file cap."""
    return existing_count + pending_count > cap


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
    root = os.environ.get("COMPONENTS_ROOT", idmap["components_root"])

    plans, missing = [], 0
    for entry in idmap["listings"]:
        if args.listing and entry["listing_id"] != args.listing:
            continue
        component = entry.get("component")
        if not component:
            log.error("no component mapped for %s — cannot find its PDFs", entry["name"])
            missing += 1
            continue
        files = file_plan(component)
        absent = [
            f["name"] for f in files
            if not os.path.isfile(os.path.join(root, component, f["name"]))
        ]
        if absent:
            for name in absent:
                log.error("missing PDF for %s: %s", entry["name"], os.path.join(root, component, name))
            missing += 1
            continue
        plans.append({**entry, "dir": os.path.join(root, component), "files": files})
        print("PLAN  {} (listing {}) — {} files: {}".format(
            entry["name"], entry["listing_id"], len(files),
            ", ".join(f["name"] for f in files)))

    if missing:
        raise SystemExit("{} listing(s) missing PDFs — nothing uploaded".format(missing))

    if not args.apply:
        print("\nDry run — nothing uploaded. Rerun with --apply to upload.")
        return

    answer = input("Type 'upload' to send these PDFs to Etsy: ")
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
        url = "{}/v3/application/shops/{}/listings/{}/files".format(API_BASE, shop_id, lid)
        try:
            existing = requests.get(url, headers=headers, timeout=30).json().get("results") or []
        except requests.RequestException as exc:
            failed += 1
            log.error("FAILED reading files for %s: %s", plan["name"], exc)
            continue

        existing_names = [f.get("filename") for f in existing]
        pending = pending_files(plan["files"], existing_names)
        if not pending:
            log.info("SKIP %s — already has %s", plan["name"], ", ".join(existing_names))
            continue
        if cap_exceeded(len(existing), len(pending)):
            failed += 1
            log.error(
                "REFUSED %s — %s existing + %s pending exceeds Etsy's %s-file cap; "
                "remove files in Shop Manager first",
                plan["name"], len(existing), len(pending), FILE_CAP)
            continue

        log.info("UPLOAD %s — %s file(s)", plan["name"], len(pending))
        for spec in pending:
            path = os.path.join(plan["dir"], spec["name"])
            try:
                with open(path, "rb") as fh:
                    resp = requests.post(
                        url, headers=headers,
                        data={"name": spec["name"]},
                        files={"file": (spec["name"], fh, "application/pdf")},
                        timeout=UPLOAD_TIMEOUT)
            except requests.RequestException as exc:
                failed += 1
                log.error("  FAILED %s: %s (rerun resumes here)", spec["name"], exc)
                break
            if resp.status_code != 201:
                failed += 1
                log.error("  FAILED %s: HTTP %s %s (rerun resumes here)",
                          spec["name"], resp.status_code, resp.text[:200])
                break
            body = resp.json() if resp.content else {}
            log.info("  uploaded %s (%s bytes)", spec["name"], body.get("size_bytes", "?"))
            time.sleep(PACING_SECONDS)

        # Verify by name, not count: a wrong-but-equal count would pass silently.
        try:
            after = requests.get(url, headers=headers, timeout=30).json().get("results") or []
            names = {str(f.get("filename")).strip().lower() for f in after}
            want = {f["name"].strip().lower() for f in plan["files"]}
            ok = want.issubset(names)
            log.info("  VERIFY %s: %s file(s) [%s] -> %s",
                     plan["name"], len(after),
                     ", ".join(sorted(str(f.get("filename")) for f in after)),
                     "OK" if ok else "CHECK IN SHOP MANAGER")
            if not ok:
                failed += 1
        except requests.RequestException:
            log.warning("  VERIFY %s: could not re-read files", plan["name"])

    if failed:
        raise SystemExit("{} failures — rerun to resume".format(failed))
    print("\nAll PDFs uploaded. Next: review the batch, then activate.")


if __name__ == "__main__":
    main()
