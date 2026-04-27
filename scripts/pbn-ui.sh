#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROTO="$ROOT/experiments/pbn-research/prototype"

cd "$PROTO"
if [[ ! -d node_modules ]]; then
  npm install
fi
exec npm run dev -- "$@"
