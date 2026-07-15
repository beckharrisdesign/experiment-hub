#!/usr/bin/env python3
"""Sync the latest captured Etsy state into the Notion Inventory database.

Derived, current-state view only (the history lives in the SQLite store).
Writes only fields that changed; DRY_RUN=true by default logs the plan and
touches nothing.
"""
import json
import logging
import os

from backends import make_backend
from capture import LISTINGS_ENDPOINT_TEMPLATE
from notion_api import NotionClient

log = logging.getLogger("sync_notion")

# Etsy listing state -> Notion Status option name. Options are validated
# against the live database schema before any write; unknown options are
# skipped with a warning rather than guessed (SPEC: "confirm exact option
# names before writing").
DEFAULT_STATE_TO_STATUS = {
    "active": "Active",
    "inactive": "Inactive",
    "sold_out": "Sold out",
    "draft": "Draft",
    "expired": "Expired",
}


def _plain_text(prop):
    """Best-effort plain-text value of a Notion property (for SKU matching)."""
    prop_type = prop.get("type")
    if prop_type in ("title", "rich_text"):
        return "".join(part.get("plain_text", "") for part in prop.get(prop_type) or []).strip()
    if prop_type == "formula":
        formula = prop.get("formula") or {}
        if formula.get("type") == "string":
            return (formula.get("string") or "").strip()
    return ""


def _current_value(prop):
    prop_type = prop.get("type")
    if prop_type == "number":
        return prop.get("number")
    if prop_type == "select":
        return (prop.get("select") or {}).get("name")
    if prop_type == "status":
        return (prop.get("status") or {}).get("name")
    return None


def _payload_for(prop_type, value):
    if prop_type == "number":
        return {"number": value}
    if prop_type == "select":
        return {"select": {"name": value}}
    if prop_type == "status":
        return {"status": {"name": value}}
    return None


def _status_options(db_schema, status_prop):
    prop = (db_schema.get("properties") or {}).get(status_prop) or {}
    prop_type = prop.get("type")
    if prop_type not in ("select", "status"):
        return None
    options = (prop.get(prop_type) or {}).get("options") or []
    return {option.get("name") for option in options}


def build_page_indexes(pages, listing_id_property, sku_property):
    """Two match indexes: Etsy listing id text -> page, and SKU text -> page.

    Listing id is the primary key (exact, survives SKU format changes); SKU is
    the fallback for rows where the listing id property is empty. Duplicates
    keep the first page and warn.
    """
    by_listing_id = {}
    by_sku = {}
    for page in pages:
        properties = page.get("properties") or {}
        for prop_name, index, label in (
            (listing_id_property, by_listing_id, "listing id"),
            (sku_property, by_sku, "SKU"),
        ):
            prop = properties.get(prop_name)
            if not prop:
                continue
            value = _plain_text(prop)
            if not value:
                continue
            if value in index:
                log.warning("Duplicate %s %r in Notion — keeping first page, ignoring %s",
                            label, value, page.get("id"))
                continue
            index[value] = page
    return by_listing_id, by_sku


def plan_updates(latest, indexes, db_schema, config):
    """Compare latest Etsy state against Notion pages; return only real changes.

    indexes is (by_listing_id, by_sku) from build_page_indexes. Returns
    (plans, unmatched). Each plan: {page_id, listing_id, matched_by, changes, properties}.
    """
    by_listing_id, by_sku = indexes
    db_props = db_schema.get("properties") or {}
    status_options = _status_options(db_schema, config["status_property"])
    state_to_status = config["state_to_status"]

    plans = []
    unmatched = []
    for listing_id, snapshot in sorted(latest.items()):
        parsed = snapshot["parsed"]
        skus = parsed.get("skus") or ([snapshot["sku"]] if snapshot["sku"] else [])
        page = by_listing_id.get(str(listing_id))
        matched_by = str(listing_id) if page is not None else None
        if page is None:
            for sku in skus:
                if sku in by_sku:
                    page = by_sku[sku]
                    matched_by = sku
                    break
        if page is None:
            unmatched.append({"listing_id": listing_id, "skus": skus})
            continue

        desired = {
            config["price_property"]: parsed.get("price"),
            config["quantity_property"]: parsed.get("quantity"),
        }
        state = parsed.get("state")
        if state is not None:
            desired[config["status_property"]] = state_to_status.get(state)
            if desired[config["status_property"]] is None:
                log.warning("No Status mapping for Etsy state %r (listing %s) — skipping status", state, listing_id)
                del desired[config["status_property"]]

        changes = {}
        properties = {}
        page_props = page.get("properties") or {}
        for prop_name, new_value in desired.items():
            if new_value is None:
                continue
            schema_prop = db_props.get(prop_name)
            if schema_prop is None:
                log.warning("Notion database has no property %r — skipping", prop_name)
                continue
            prop_type = schema_prop.get("type")
            payload = _payload_for(prop_type, new_value)
            if payload is None:
                log.warning("Property %r has unwritable type %r — skipping", prop_name, prop_type)
                continue
            if prop_name == config["status_property"] and status_options is not None \
                    and new_value not in status_options:
                log.warning(
                    "Status option %r not in Notion options %s — skipping status for listing %s",
                    new_value, sorted(status_options), listing_id,
                )
                continue
            current = _current_value(page_props.get(prop_name) or {})
            if current == new_value:
                continue
            changes[prop_name] = {"from": current, "to": new_value}
            properties[prop_name] = payload

        if properties:
            plans.append({
                "page_id": page["id"],
                "listing_id": listing_id,
                "matched_by": matched_by,
                "changes": changes,
                "properties": properties,
            })
    return plans, unmatched


def apply_updates(client, plans, dry_run):
    for plan in plans:
        log.info(
            "%s %s (listing %s): %s",
            "DRY RUN — would update" if dry_run else "Updating",
            plan["matched_by"],
            plan["listing_id"],
            json.dumps(plan["changes"]),
        )
        if not dry_run:
            client.update_page(plan["page_id"], plan["properties"])


def run_sync(client, backend, database_id, config, dry_run=True):
    latest = backend.latest_parsed_by_listing(LISTINGS_ENDPOINT_TEMPLATE)
    if not latest:
        log.warning("No captured listings in the store — run capture.py first.")
        return {"updates": 0, "unmatched": 0, "dry_run": dry_run}

    db_schema = client.get_database(database_id)
    pages = list(client.query_database_all(database_id))
    indexes = build_page_indexes(pages, config["listing_id_property"], config["sku_property"])

    plans, unmatched = plan_updates(latest, indexes, db_schema, config)
    for miss in unmatched:
        log.warning("No Notion row matched listing %s (skus=%s)", miss["listing_id"], miss["skus"])
    apply_updates(client, plans, dry_run)

    summary = {
        "listings": len(latest),
        "notion_pages": len(pages),
        "updates": len(plans),
        "unmatched": len(unmatched),
        "dry_run": dry_run,
    }
    log.info("Sync complete: %s", json.dumps(summary))
    return summary


def _require_env(name):
    value = os.environ.get(name)
    if not value:
        raise SystemExit("Missing required environment variable: {}".format(name))
    return value


def config_from_env():
    # Defaults match the real Inventory database (2026-07-15): "Etsy price" is
    # a plain number the sync owns; "Inventory level" is the writable stock
    # count ("Single price sum"/"Inventory value" are rollup/formula — the API
    # cannot write those); "Etsy Listing ID" is the primary match key.
    return {
        "listing_id_property": os.environ.get("NOTION_LISTING_ID_PROPERTY", "Etsy Listing ID"),
        "sku_property": os.environ.get("NOTION_SKU_PROPERTY", "SKU"),
        "price_property": os.environ.get("NOTION_PRICE_PROPERTY", "Etsy price"),
        "quantity_property": os.environ.get("NOTION_QUANTITY_PROPERTY", "Inventory level"),
        "status_property": os.environ.get("NOTION_STATUS_PROPERTY", "Status"),
        "state_to_status": json.loads(
            os.environ.get("ETSY_STATE_TO_STATUS_JSON", json.dumps(DEFAULT_STATE_TO_STATUS))
        ),
    }


def main():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        pass

    token = _require_env("NOTION_TOKEN")
    database_id = _require_env("NOTION_INVENTORY_DB_ID")
    dry_run = os.environ.get("DRY_RUN", "true").strip().lower() != "false"
    if dry_run:
        log.info("DRY_RUN is on (default) — no Notion writes will happen. Set DRY_RUN=false to write.")

    client = NotionClient(token)
    run_sync(client, make_backend(), database_id, config_from_env(), dry_run=dry_run)


if __name__ == "__main__":
    main()
