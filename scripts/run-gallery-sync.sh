#!/bin/bash
# Sync all W+H mockup galleries from the local Drive mount into Notion
# Listing Inventory rows. Dry-run plan first, then asks before uploading.
#
# Run from Katy's own terminal (op resolves vault keys only there):
#   bash scripts/run-gallery-sync.sh [optional-local-gallery-root]
#
# The optional argument points GALLERY_ROOT at a local copy of the
# W+H Listings tree (e.g. an unzipped Drive download) instead of the
# CloudStorage mount.
set -euo pipefail
cd "$(dirname "$0")/.."
export NOTION_TOKEN="$(op read 'op://BHD Labs/Notion/token')"
export NOTION_INVENTORY_DB_ID="$(op read 'op://BHD Labs/Notion/inventory db id')"
if [ -n "${1:-}" ]; then export GALLERY_ROOT="$1"; fi
node scripts/notion-gallery-sync.mjs
echo
read -r -p "Type 'sync' to upload the galleries above to Notion: " ANSWER
if [ "$ANSWER" = "sync" ]; then
  node scripts/notion-gallery-sync.mjs --apply
else
  echo "aborted — nothing uploaded"
fi
