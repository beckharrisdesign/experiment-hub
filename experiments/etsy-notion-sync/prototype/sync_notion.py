#!/usr/bin/env python3
"""Sync the latest captured Etsy state into the Notion Inventory database.

Derived, current-state view only (the history lives in the SQLite store).
Writes only fields that changed; DRY_RUN=true by default logs the plan and
touches nothing.
"""
import json
import logging
import os
from datetime import datetime, timezone

from backends import make_backend
from capture import LISTINGS_ENDPOINT_TEMPLATE
from env import load_env
from notion_api import NotionClient

log = logging.getLogger("sync_notion")

# Etsy listing state -> Notion Status option name. Options are validated
# against the live database schema before any write; unknown options are
# skipped with a warning rather than guessed (SPEC: "confirm exact option
# names before writing").
DEFAULT_STATE_TO_STATUS = {
    "active": "Active",
    "inactive": "Inactive",
    "sold_out": "Sold Out",
    "draft": "Draft",
    "expired": "Expired",
}

# Additional Etsy fields mirrored into Notion beyond price/quantity/status.
# Each entry maps a key in the captured `parsed` snapshot to a Notion
# property; properties missing from the database are created automatically
# (status/select options are the one thing the API can't create — those stay
# validated in plan_updates). Override via NOTION_EXTRA_FIELDS_JSON.
DEFAULT_EXTRA_FIELDS = [
    {"parsed_key": "description", "property": "Description", "type": "rich_text"},
    {"parsed_key": "title", "property": "Etsy Title", "type": "rich_text"},
    {"parsed_key": "url", "property": "Etsy URL", "type": "url"},
    {"parsed_key": "views", "property": "Views", "type": "number"},
    {"parsed_key": "num_favorers", "property": "Favorites", "type": "number"},
    {"parsed_key": "tags", "property": "Tags", "type": "multi_select"},
    {"parsed_key": "materials", "property": "Materials", "type": "multi_select"},
    {"parsed_key": "currency_code", "property": "Currency", "type": "select"},
    {"parsed_key": "original_creation_timestamp", "property": "Etsy Created", "type": "date"},
    {"parsed_key": "last_modified_timestamp", "property": "Etsy Last Modified", "type": "date"},
]

# Property types ensure_properties may create on the database. Anything else
# (rollup, formula, relation, status) needs manual setup, so it's never
# auto-created.
CREATABLE_TYPES = {"rich_text", "number", "select", "multi_select", "url", "date"}

# Notion caps a single rich_text content block at 2000 characters.
RICH_TEXT_LIMIT = 2000


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
    if prop_type in ("title", "rich_text"):
        return _plain_text(prop) or None
    if prop_type == "url":
        return prop.get("url")
    if prop_type == "multi_select":
        names = sorted(option.get("name") for option in prop.get("multi_select") or [])
        return names or None
    if prop_type == "date":
        return (prop.get("date") or {}).get("start")
    return None


def _payload_for(prop_type, value):
    if prop_type == "number":
        return {"number": value}
    if prop_type == "select":
        return {"select": {"name": value}}
    if prop_type == "status":
        return {"status": {"name": value}}
    if prop_type == "title":
        return {"title": [{"text": {"content": str(value)}}]}
    if prop_type == "rich_text":
        return {"rich_text": [{"text": {"content": str(value)}}]}
    if prop_type == "url":
        return {"url": value}
    if prop_type == "multi_select":
        return {"multi_select": [{"name": name} for name in value]}
    if prop_type == "date":
        return {"date": {"start": value}}
    return None


def _convert(field_type, value, context=""):
    """Normalize a parsed Etsy value for a Notion property type.

    Returns None for empty values (the sync writes real values only — it
    never clears a property). Normalized forms are chosen so they round-trip
    through _current_value for idempotent change detection.
    """
    if value is None:
        return None
    if field_type == "rich_text":
        text = str(value).strip()
        if len(text) > RICH_TEXT_LIMIT:
            log.warning("Truncating %s to %d chars for Notion", context, RICH_TEXT_LIMIT)
            text = text[:RICH_TEXT_LIMIT]
        return text or None
    if field_type in ("url", "select"):
        return str(value) or None
    if field_type == "multi_select":
        return sorted(str(name) for name in value) or None
    if field_type == "date":
        # Unix timestamp -> date-only ISO string; Notion returns date-only
        # starts verbatim, so comparisons stay stable across runs.
        return datetime.fromtimestamp(value, timezone.utc).date().isoformat()
    return value


def _extra_desired(parsed, extra_fields):
    return {
        field["property"]: _convert(
            field["type"], parsed.get(field["parsed_key"]), context=field["property"]
        )
        for field in extra_fields
    }


def _format_value(value):
    """Human-readable rendering of a from/to value for a change comment."""
    if value is None:
        return "(empty)"
    if isinstance(value, list):
        return ", ".join(str(item) for item in value) or "(empty)"
    return str(value)


def change_comment_text(changes):
    """A short, one-line-per-field summary of a plan's changes.

    Rendered as the body of a Notion comment so the seller sees an
    activity-log of exactly what the sync touched, and when, on the page
    itself. Fields are sorted for stable, readable output. The result is
    capped at Notion's single-block rich_text limit.
    """
    plural = "" if len(changes) == 1 else "s"
    lines = ["Etsy sync updated {} field{}:".format(len(changes), plural)]
    for prop_name in sorted(changes):
        delta = changes[prop_name]
        lines.append("• {}: {} → {}".format(
            prop_name, _format_value(delta.get("from")), _format_value(delta.get("to"))
        ))
    return "\n".join(lines)[:RICH_TEXT_LIMIT]


def ensure_properties(client, db_schema, database_id, extra_fields, dry_run):
    """Create any missing extra-field properties on the Notion database.

    Returns a schema with the new properties merged in, so planning can use
    them in the same run. Dry-run only logs what would be created (the merged
    schema still lets the plan preview those fields).
    """
    db_props = db_schema.get("properties") or {}
    missing = {}
    for field in extra_fields:
        name, field_type = field["property"], field["type"]
        if name in db_props:
            continue
        if field_type not in CREATABLE_TYPES:
            log.warning("Cannot auto-create property %r of type %r — create it manually",
                        name, field_type)
            continue
        missing[name] = {field_type: {}}
    if not missing:
        return db_schema
    if dry_run:
        log.info("DRY RUN — would create Notion properties: %s", sorted(missing))
    else:
        client.update_database(database_id, missing)
        log.info("Created Notion properties: %s", sorted(missing))
    merged = dict(db_props)
    for name, spec in missing.items():
        prop_type = next(iter(spec))
        merged[name] = {"type": prop_type, prop_type: {}}
    return dict(db_schema, properties=merged)


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
            unmatched.append({"listing_id": listing_id, "skus": skus, "parsed": parsed})
            continue

        desired = {
            config["price_property"]: parsed.get("price"),
            config["quantity_property"]: parsed.get("quantity"),
        }
        desired.update(_extra_desired(parsed, config["extra_fields"]))
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


def plan_creates(unmatched, db_schema, config):
    """Build create plans so unmatched Etsy listings appear in Notion.

    Etsy is the source of truth: a listing with no Notion row (e.g. created
    on the fly from the Etsy app) gets a new row carrying its listing id,
    title, price, quantity, and status. Subsequent runs match it by id.
    """
    db_props = db_schema.get("properties") or {}
    status_options = _status_options(db_schema, config["status_property"])
    state_to_status = config["state_to_status"]

    missing = [p for p in (config["listing_id_property"], config["title_property"])
               if p not in db_props]
    if missing:
        log.warning(
            "Notion database is missing properties %s — cannot create rows for unmatched listings",
            missing,
        )
        return []

    creates = []
    for miss in unmatched:
        parsed = miss.get("parsed") or {}
        listing_id = miss["listing_id"]
        desired = {
            config["listing_id_property"]: str(listing_id),
            config["title_property"]: parsed.get("title") or "Etsy listing {}".format(listing_id),
            config["price_property"]: parsed.get("price"),
            config["quantity_property"]: parsed.get("quantity"),
        }
        desired.update(_extra_desired(parsed, config["extra_fields"]))
        state = parsed.get("state")
        if state is not None:
            status = state_to_status.get(state)
            if status is not None and (status_options is None or status in status_options):
                desired[config["status_property"]] = status

        properties = {}
        values = {}
        for prop_name, new_value in desired.items():
            if new_value is None:
                continue
            schema_prop = db_props.get(prop_name)
            if schema_prop is None:
                continue
            payload = _payload_for(schema_prop.get("type"), new_value)
            if payload is None:
                continue
            properties[prop_name] = payload
            values[prop_name] = new_value
        # Without a written listing id the row can never match, so the next
        # run would create a duplicate — skip rather than write an orphan.
        if config["listing_id_property"] not in properties:
            log.warning(
                "Listing id property %r is not writable — skipping create for listing %s",
                config["listing_id_property"], listing_id,
            )
            continue
        creates.append({"listing_id": listing_id, "properties": properties, "values": values})
    return creates


def apply_creates(client, creates, database_id, dry_run):
    for plan in creates:
        log.info(
            "%s Notion row for listing %s: %s",
            "DRY RUN — would create" if dry_run else "Creating",
            plan["listing_id"],
            json.dumps(plan["values"]),
        )
        if not dry_run:
            client.create_page(database_id, plan["properties"])


def _post_change_comment(client, plan):
    """Best-effort activity-log comment on the just-updated page.

    A comment is a nicety layered on top of the write that already
    succeeded, so a failure here is logged and swallowed rather than
    aborting the run.
    """
    text = change_comment_text(plan["changes"])
    try:
        client.create_comment(plan["page_id"], [{"text": {"content": text}}])
    except Exception:  # noqa: BLE001 — never fail the sync over a comment
        log.warning("Failed to post change comment on page %s", plan["page_id"], exc_info=True)


def apply_updates(client, plans, dry_run, post_comments=True):
    for plan in plans:
        log.info(
            "%s %s (listing %s): %s",
            "DRY RUN — would update" if dry_run else "Updating",
            plan["matched_by"],
            plan["listing_id"],
            json.dumps(plan["changes"]),
        )
        if dry_run:
            continue
        client.update_page(plan["page_id"], plan["properties"])
        if post_comments:
            _post_change_comment(client, plan)


def run_sync(client, backend, database_id, config, dry_run=True):
    latest = backend.latest_parsed_by_listing(LISTINGS_ENDPOINT_TEMPLATE)
    if not latest:
        log.warning("No captured listings in the store — run capture.py first.")
        return {"listings": 0, "notion_pages": 0, "updates": 0, "created": 0,
                "unmatched": 0, "dry_run": dry_run}

    db_schema = client.get_database(database_id)
    db_schema = ensure_properties(client, db_schema, database_id,
                                  config["extra_fields"], dry_run)
    pages = list(client.query_database_all(database_id))
    indexes = build_page_indexes(pages, config["listing_id_property"], config["sku_property"])

    plans, unmatched = plan_updates(latest, indexes, db_schema, config)
    for miss in unmatched:
        log.warning("No Notion row matched listing %s (skus=%s)", miss["listing_id"], miss["skus"])
    creates = plan_creates(unmatched, db_schema, config)
    post_comments = config.get("post_change_comments", True)
    apply_updates(client, plans, dry_run, post_comments=post_comments)
    apply_creates(client, creates, database_id, dry_run)

    summary = {
        "listings": len(latest),
        "notion_pages": len(pages),
        "updates": len(plans),
        "comments": len(plans) if post_comments else 0,
        "created": len(creates),
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
        "title_property": os.environ.get("NOTION_TITLE_PROPERTY", "Short Title"),
        "sku_property": os.environ.get("NOTION_SKU_PROPERTY", "SKU"),
        "price_property": os.environ.get("NOTION_PRICE_PROPERTY", "Etsy price"),
        "quantity_property": os.environ.get("NOTION_QUANTITY_PROPERTY", "Inventory level"),
        "status_property": os.environ.get("NOTION_STATUS_PROPERTY", "Status"),
        "state_to_status": json.loads(
            os.environ.get("ETSY_STATE_TO_STATUS_JSON", json.dumps(DEFAULT_STATE_TO_STATUS))
        ),
        "extra_fields": json.loads(
            os.environ.get("NOTION_EXTRA_FIELDS_JSON", json.dumps(DEFAULT_EXTRA_FIELDS))
        ),
        # Post an activity-log comment on each page the sync updates, listing
        # what changed. On by default; set NOTION_POST_CHANGE_COMMENTS=false to
        # skip (e.g. to keep chatty pages quiet).
        "post_change_comments": os.environ.get(
            "NOTION_POST_CHANGE_COMMENTS", "true"
        ).strip().lower() != "false",
    }


def main():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    load_env()

    token = _require_env("NOTION_TOKEN")
    database_id = _require_env("NOTION_INVENTORY_DB_ID")
    dry_run = os.environ.get("DRY_RUN", "true").strip().lower() != "false"
    if dry_run:
        log.info("DRY_RUN is on (default) — no Notion writes will happen. Set DRY_RUN=false to write.")

    client = NotionClient(token)
    run_sync(client, make_backend(), database_id, config_from_env(), dry_run=dry_run)


if __name__ == "__main__":
    main()
