#!/bin/bash
# Put each holiday listing in its Etsy shop section (Holiday / Personalized).
# Dry-run plan first, then asks you to type 'assign'.
#
# Create the two sections in Shop Manager first and put their numeric ids in
# experiments/etsy-notion-sync/prototype/holiday_listing_ids.json under
# "shop_sections" — creating sections needs the shops_w scope, which this
# token does not have.
#
# Run from Katy's own terminal (op resolves vault keys only there):
#   bash scripts/run-assign-sections.sh            # plan only
#   bash scripts/run-assign-sections.sh --apply    # assign
set -euo pipefail
cd "$(dirname "$0")/../experiments/etsy-notion-sync/prototype"
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
exec ./.venv/bin/python assign_listing_sections.py "$@"
