#!/usr/bin/env bash
# Agent-runnable test: site accessibility, resolution, and load time
# Usage: ./scripts/test-site.sh <URL>
# Exit 0 if all pass; non-zero if any fail
# Output: JSON-like summary for agent parsing

set -e
URL="${1:?Usage: $0 <URL>}"

# Ensure URL has scheme
[[ "$URL" =~ ^https?:// ]] || URL="https://$URL"

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 --max-time 15 "$URL")
TIME_TOTAL=$(curl -s -o /dev/null -w "%{time_total}" --connect-timeout 10 --max-time 15 "$URL")

ACCESSIBLE=false
RESOLVES=false
FAST=false

[[ "$HTTP_CODE" == "200" ]] && ACCESSIBLE=true
[[ "$HTTP_CODE" =~ ^[23] ]] && RESOLVES=true
# Portable float compare: time < 1.0
awk -v t="$TIME_TOTAL" 'BEGIN { exit (t >= 1.0) }' 2>/dev/null && FAST=true

echo "url=$URL"
echo "http_code=$HTTP_CODE"
echo "time_total=${TIME_TOTAL}s"
echo "accessible=$ACCESSIBLE"
echo "resolves=$RESOLVES"
echo "fast=$FAST"

[[ "$ACCESSIBLE" == "true" ]] && [[ "$RESOLVES" == "true" ]] && [[ "$FAST" == "true" ]] && exit 0 || exit 1
