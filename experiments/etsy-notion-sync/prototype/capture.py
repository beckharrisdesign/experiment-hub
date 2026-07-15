#!/usr/bin/env python3
"""Append-only historical capture of Etsy shop data.

Read-only against Etsy; writes only to the local SQLite store. Safe to run
on every scheduled cycle regardless of DRY_RUN (that flag only gates the
Notion sync step in sync_notion.py).
"""
import json
import logging
import os
from datetime import datetime, timezone

import schema_watch
from backends import make_backend
from etsy_api import (
    API_VERSION,
    INVENTORY_ENDPOINT,
    LISTINGS_ENDPOINT,
    EtsyClient,
)

log = logging.getLogger("capture")

# Endpoints are stored as the templated path (not the id-substituted URL) so
# snapshots and schema keys group across listings; see SPEC record shape.
LISTINGS_ENDPOINT_TEMPLATE = "/v3/application/shops/{shop_id}/listings"
INVENTORY_ENDPOINT_TEMPLATE = "/v3/application/listings/{listing_id}/inventory"

assert LISTINGS_ENDPOINT_TEMPLATE == LISTINGS_ENDPOINT
assert INVENTORY_ENDPOINT_TEMPLATE == INVENTORY_ENDPOINT


def parse_listing(listing):
    """Convenience projection of the fields we analyze most; raw JSON keeps the rest."""
    price = listing.get("price") or {}
    amount = price.get("amount")
    divisor = price.get("divisor") or 100
    return {
        "title": listing.get("title"),
        "price": (amount / divisor) if amount is not None else None,
        "currency_code": price.get("currency_code"),
        "quantity": listing.get("quantity"),
        "state": listing.get("state"),
        "views": listing.get("views"),
        "num_favorers": listing.get("num_favorers"),
        "last_modified_timestamp": listing.get("last_modified_timestamp"),
        "skus": listing.get("skus") or [],
        "tags": listing.get("tags") or [],
    }


def parse_inventory(inventory):
    products = inventory.get("products") or []
    skus = sorted({p.get("sku") for p in products if p.get("sku")})
    total_quantity = 0
    for product in products:
        for offering in product.get("offerings") or []:
            total_quantity += offering.get("quantity") or 0
    return {
        "product_count": len(products),
        "skus": skus,
        "total_offering_quantity": total_quantity,
    }


def _watch_schema(backend, endpoint, payload, seen_at, summary):
    known = backend.known_keys(endpoint)
    baseline = len(known) == 0
    new_keys = schema_watch.detect_new_keys(known, payload)
    if not new_keys:
        return
    backend.record_keys(endpoint, new_keys, seen_at)
    if baseline:
        log.info("Schema baseline for %s: %d keys recorded", endpoint, len(new_keys))
        return
    for key, sample in sorted(new_keys.items()):
        log.warning("New field detected on %s: %s (sample: %s)", endpoint, key, sample)
        summary["new_fields"].append({"endpoint": endpoint, "key": key, "sample": sample})


def run_capture(client, backend, shop_id, states=("active",), now=None,
                trigger_source="scheduled"):
    captured_at = (now or datetime.now(timezone.utc)).isoformat()
    run_id = backend.start_run(captured_at, trigger_source)
    summary = {
        "listings_captured": 0,
        "snapshots_written": 0,
        "new_fields": [],
        "quota_low": False,
    }
    status = "ok"
    try:
        for listing in client.iter_shop_listings(shop_id, states=states):
            listing_id = listing["listing_id"]
            sku = ",".join(listing.get("skus") or []) or None

            _watch_schema(backend, LISTINGS_ENDPOINT_TEMPLATE, listing, captured_at, summary)
            backend.append_snapshot(
                captured_at=captured_at,
                etsy_api_version=API_VERSION,
                endpoint=LISTINGS_ENDPOINT_TEMPLATE,
                listing_id=listing_id,
                sku=sku,
                raw_response=listing,
                parsed=parse_listing(listing),
            )
            summary["snapshots_written"] += 1

            inventory = client.get_listing_inventory(listing_id)
            _watch_schema(backend, INVENTORY_ENDPOINT_TEMPLATE, inventory, captured_at, summary)
            backend.append_snapshot(
                captured_at=captured_at,
                etsy_api_version=API_VERSION,
                endpoint=INVENTORY_ENDPOINT_TEMPLATE,
                listing_id=listing_id,
                sku=",".join(parse_inventory(inventory)["skus"]) or None,
                raw_response=inventory,
                parsed=parse_inventory(inventory),
            )
            summary["snapshots_written"] += 1
            summary["listings_captured"] += 1
            # One commit per listing: durable progress without an fsync per row.
            backend.commit()

            if client.quota_is_low():
                summary["quota_low"] = True
                status = "paused_quota"
                log.warning(
                    "Daily quota below safety floor — pausing; remaining listings"
                    " will be captured next scheduled cycle."
                )
                break
    except Exception:
        status = "error"
        raise
    finally:
        summary["quota"] = dict(client.last_quota)
        finished_at = datetime.now(timezone.utc).isoformat()
        backend.finish_run(run_id, finished_at, status, summary)
        log.info("Capture run %s finished (%s): %s", run_id, status, json.dumps(summary))
    return summary


def _require_env(name):
    value = os.environ.get(name)
    if not value:
        raise SystemExit("Missing required environment variable: {}".format(name))
    return value


def main():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        pass

    api_key = _require_env("ETSY_API_KEY")
    oauth_token = _require_env("ETSY_OAUTH_TOKEN")
    shop_id = _require_env("ETSY_SHOP_ID")
    states = [s.strip() for s in os.environ.get("ETSY_LISTING_STATES", "active").split(",") if s.strip()]
    quota_floor = float(os.environ.get("QUOTA_SAFETY_FLOOR", "0.1"))

    client = EtsyClient(api_key, oauth_token, quota_floor=quota_floor)
    backend = make_backend()
    run_capture(client, backend, shop_id, states=states,
                trigger_source=os.environ.get("TRIGGER_SOURCE", "scheduled"))


if __name__ == "__main__":
    main()
