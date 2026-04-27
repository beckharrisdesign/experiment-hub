#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PBN="$ROOT/experiments/pbn-research"

cd "$PBN"
if [[ ! -d .venv ]]; then
  python3 -m venv .venv
fi
# shellcheck source=/dev/null
source .venv/bin/activate
# Editable pyproject-only installs need a recent pip (macOS system venvs ship ancient pip).
python3 -m pip install -q --upgrade pip
python3 -m pip install -q -e ".[dev]"
exec python3 -m pytest test_smoke.py -v "$@"
