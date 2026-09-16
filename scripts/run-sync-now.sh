#!/bin/bash
# Run the Etsy -> Supabase -> Notion sync on demand (the same sequence the
# daily scheduled job runs): refresh tokens, capture listings, sync Notion.
#
# DRY RUN BY DEFAULT — logs the plan and writes nothing to Notion.
# Pass --apply to actually write.
#
# Captures active listings by default; add drafts with:
#   ETSY_LISTING_STATES="active,draft" bash scripts/run-sync-now.sh --apply
#
# Run from Katy's own terminal (op resolves vault keys only there):
#   bash scripts/run-sync-now.sh            # plan only
#   bash scripts/run-sync-now.sh --apply    # write to Notion
set -euo pipefail
cd "$(dirname "$0")/../experiments/etsy-notion-sync/prototype"

DRY_RUN=true
for arg in "$@"; do
  case "$arg" in
    --apply) DRY_RUN=false ;;
    *) echo "unknown argument: $arg" >&2; exit 2 ;;
  esac
done

if [ ! -x .venv/bin/python ]; then
  echo "Bootstrapping prototype venv..."
  python3 -m venv .venv
  ./.venv/bin/pip -q install -r requirements.txt
fi

export ETSY_API_KEY="$(op read 'op://BHD Labs/Etsy/api key')"
export ETSY_SHARED_SECRET="$(op read 'op://BHD Labs/Etsy/shared secret')"
export ETSY_SHOP_ID="$(op read 'op://BHD Labs/Etsy/shop id')"
export SUPABASE_URL="https://ulqdjuiffpazzixnwwso.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="$(op read 'op://BHD Labs/Supabase experiment-hub/service role key')"
export NOTION_TOKEN="$(op read 'op://BHD Labs/Notion/token')"
export NOTION_INVENTORY_DB_ID="$(op read 'op://BHD Labs/Notion/inventory db id')"
export ETSY_LISTING_STATES="${ETSY_LISTING_STATES:-active,draft}"
export TRIGGER_SOURCE="manual"
export DRY_RUN

if [ "$DRY_RUN" = "true" ]; then
  echo "DRY RUN — planning only, nothing will be written to Notion."
  echo "Re-run with --apply to write."
else
  echo "APPLYING — this writes to the live Notion Inventory database."
fi
echo "Capturing states: $ETSY_LISTING_STATES"
exec ./.venv/bin/python scheduled_run.py
