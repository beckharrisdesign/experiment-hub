#!/bin/bash
# Upload the holiday drafts' gallery images to Etsy with alt text.
# Dry-run plan first, then asks you to type 'upload'.
#
# Run from Katy's own terminal (op resolves vault keys only there):
#   bash scripts/run-upload-images.sh [extra args, e.g. --listing 4576478333]
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
exec ./.venv/bin/python upload_listing_images.py --apply "$@"
