#!/usr/bin/env bash
# Creates (first run only) and deploys the `dither-halftone-generator` Vercel project from this
# folder, to production. Run it from Katy's own terminal: the Vercel token lives only in the
# 1Password vault, and `op` only works there (agent shells fail closed). Prints statuses and the
# deployment URL, never the token.
#
#   bash experiments/image-dithering/prototype/scripts/deploy-vercel.sh
set -euo pipefail
cd "$(dirname "$0")/.."

TEAM="team_UhPjDkhxW0b4JX399pdc4iYs"   # katy-beckharrisdes-projects (not a secret)
PROJECT="dither-halftone-generator"
VERCEL_TOKEN="$(op read 'op://BHD Labs/Vercel/token')" || { echo "✗ could not read the Vercel token from 1Password"; exit 1; }
export VERCEL_TOKEN
# The CLI reads the exported VERCEL_TOKEN itself; never pass it as an argument, where other local
# processes could read it from the process list (Copilot review, PR #591).
V() { npx --yes vercel@latest "$@" --scope "$TEAM"; }

echo "→ project: $PROJECT"
# `project inspect` exits non-zero when the project doesn't exist. (A `project ls | grep -q` check
# misfired under pipefail: grep closed the pipe early and the script "created" an existing project.)
if V project inspect "$PROJECT" >/dev/null 2>&1; then echo "  exists"; else V project create "$PROJECT" >/dev/null && echo "  created"; fi

echo "→ linking this folder (writes .vercel/, which is git-ignored)"
V link --yes --project "$PROJECT" >/dev/null && echo "  linked"

echo "→ deploying to production (Vercel builds it: pnpm install, astro build)"
URL="$(V deploy --prod --yes 2>/dev/null | tail -1)"
echo "  deployment: $URL"
echo "→ production domains:"
V project inspect "$PROJECT" 2>/dev/null | grep -iE "vercel\.app|domain" | head -5 || true
echo "✓ done"
