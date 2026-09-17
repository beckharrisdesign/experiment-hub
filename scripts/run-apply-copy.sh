#!/bin/bash
# Apply the approved tag-experiment copy to Etsy (13 listings: treatment,
# hygiene, fall-leaves seasonal). Shows the full before/after plan, then
# asks you to type 'apply'. The day this runs is day 0 of the experiment.
#
# Run from Katy's own terminal (op resolves vault keys only there):
#   bash scripts/run-apply-copy.sh
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
exec ./.venv/bin/python apply_listing_copy.py --apply
