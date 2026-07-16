#!/usr/bin/env python3
"""Server-side runner for scheduled and dispatched syncs (GitHub Actions).

Sequence: refresh Etsy tokens from Supabase custody → capture → Notion sync.
TRIGGER_SOURCE distinguishes scheduled runs from hub-initiated ones.
"""
import logging
import os
from datetime import datetime, timezone

import capture
import oauth_helper
import sync_notion
from etsy_api import EtsyClient
from notion_api import NotionClient
from store_supabase import SupabaseStore

log = logging.getLogger("scheduled_run")


def refresh_tokens_from_store(backend, api_key, refresh=oauth_helper.refresh_tokens):
    """Rotate Etsy tokens held in Supabase; return a fresh access token."""
    tokens = backend.get_tokens()
    if not tokens:
        raise SystemExit(
            "No Etsy tokens in Supabase — seed once with:"
            " python oauth_helper.py --to-supabase"
        )
    fresh = refresh(api_key, tokens["refresh_token"])
    backend.set_tokens(
        fresh["access_token"],
        # A refresh response may omit refresh_token; keep the current one then.
        fresh.get("refresh_token") or tokens["refresh_token"],
        expires_in=fresh.get("expires_in"),
    )
    return fresh["access_token"]


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
    shared_secret = _require_env("ETSY_SHARED_SECRET")
    shop_id = _require_env("ETSY_SHOP_ID")
    backend = SupabaseStore(_require_env("SUPABASE_URL"), _require_env("SUPABASE_SERVICE_ROLE_KEY"))

    access_token = refresh_tokens_from_store(backend, api_key)
    client = EtsyClient(api_key, access_token, shared_secret=shared_secret,
                        quota_floor=float(os.environ.get("QUOTA_SAFETY_FLOOR", "0.1")))

    trigger_source = os.environ.get("TRIGGER_SOURCE", "scheduled")
    states = [s.strip() for s in os.environ.get("ETSY_LISTING_STATES", "active").split(",") if s.strip()]
    summary = capture.run_capture(client, backend, shop_id, states=states,
                                  trigger_source=trigger_source)

    if summary.get("quota_low"):
        log.warning("Skipping Notion sync — capture paused on low quota; resume next cycle.")
        return

    dry_run = os.environ.get("DRY_RUN", "true").strip().lower() != "false"
    if dry_run:
        log.info("DRY_RUN is on — Notion step logs the plan only. Set DRY_RUN=false to write.")
    notion = NotionClient(_require_env("NOTION_TOKEN"))
    sync_summary = sync_notion.run_sync(notion, backend, _require_env("NOTION_INVENTORY_DB_ID"),
                                        sync_notion.config_from_env(), dry_run=dry_run)
    # Fold the Notion result into the run row so the hub page can show
    # "N Notion updates" alongside the capture stats.
    if summary.get("run_id"):
        summary["notion"] = sync_summary
        backend.finish_run(summary["run_id"], datetime.now(timezone.utc).isoformat(),
                           "ok", summary)
    log.info("Run complete at %s (trigger=%s)", datetime.now(timezone.utc).isoformat(), trigger_source)


if __name__ == "__main__":
    main()
