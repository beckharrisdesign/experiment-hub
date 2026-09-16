#!/bin/bash
# Create the 9 holiday DRAFT listings on Etsy (4 classic singles, 4
# personalizable snow globes, 1 Christmas Classics bundle). Drafts are
# invisible to buyers; activation stays a manual step after images and
# files. Shows the plan, then asks you to type 'create'.
#
# Run from Katy's own terminal (op resolves vault keys only there):
#   bash scripts/run-create-drafts.sh
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
exec ./.venv/bin/python create_draft_listings.py --apply
