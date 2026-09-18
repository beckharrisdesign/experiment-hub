#!/usr/bin/env bash
# Land eRank/Etsy exports from your local machine in one command, no agent
# session needed. Wraps ingest-pulls.py with the git side of the ritual:
# pull, land, regenerate the corpus, commit, push.
#
#   scripts/land-pulls.sh                    # lands ~/Downloads
#   scripts/land-pulls.sh ~/Desktop/pulls     # lands a specific folder
#   scripts/land-pulls.sh ~/Downloads --date 2026-09-20
#
# Needs no secrets and no 1Password -- unlike `pnpm dev`, ingest-pulls.py
# reads no env vars, so this runs the same from a plain terminal.
#
# Never commits to main: pushes to data/keyword-pulls, a standing branch for
# this ritual, and prints the compare URL to open or update a PR.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"
BRANCH="data/keyword-pulls"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree is dirty -- commit or stash first, then re-run." >&2
  exit 1
fi

git fetch origin main >/dev/null 2>&1 || true

# Reuse the branch if it already exists (local or remote), so a second run
# the same week adds to the same PR instead of opening a new one each time.
if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  git checkout "$BRANCH"
  git merge --ff-only origin/main 2>/dev/null || git merge origin/main -m "merge: catch up to main"
elif git ls-remote --exit-code --heads origin "$BRANCH" >/dev/null 2>&1; then
  git checkout -b "$BRANCH" "origin/$BRANCH"
  git merge origin/main -m "merge: catch up to main"
else
  git checkout -b "$BRANCH" origin/main
fi

echo "Running ingest-pulls.py --apply ..."
python3 scripts/ingest-pulls.py "$@" --apply

if [[ -z "$(git status --porcelain -- docs/pulls data/keyword-corpus.json)" ]]; then
  echo "Nothing new landed."
  exit 0
fi

# Two eRank exports of the same query, re-downloaded minutes apart, can differ
# byte-for-byte (pagination/order) even though content-hash dedup only catches
# an exact re-download. If that happened, the collision suffix on the target
# filename is the tell -- surface it instead of committing it silently, the
# same check a human would do before landing "foo-2.csv".
COLLIDED=$(git status --porcelain -- docs/pulls \
  | awk '{print $2}' \
  | grep -E '\-[0-9]+\.csv$' || true)
if [[ -n "$COLLIDED" ]]; then
  echo
  echo "⚠️  Possible same-seed re-download, not a new query -- check before pushing:"
  echo "$COLLIDED" | sed 's/^/    /'
  echo "If confirmed a duplicate: rm the newer file, re-run"
  echo "  python3 scripts/ingest-pulls.py --apply"
  echo "to regenerate the corpus and index without it, then re-run this script."
  echo
fi

QUERIES=$(git status --porcelain -- docs/pulls \
  | awk '{print $2}' \
  | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}-erank-keywords-[a-z0-9-]+\.csv$' \
  | sed -E 's/^[0-9-]+-erank-keywords-//; s/\.csv$//' \
  | tr '\n' ',' | sed 's/,$//')
N=$(git status --porcelain -- docs/pulls | grep -c '^??' || true)

git add -A -- docs/pulls data/keyword-corpus.json
git commit -q -m "docs(pulls): land ${N} eRank keyword exports" \
  -m "Queries: ${QUERIES:-see diff}" \
  -m "Landed locally via scripts/land-pulls.sh."
git push -u origin "$BRANCH"

REMOTE_URL=$(git remote get-url origin | sed -E 's#git@github.com:#https://github.com/#; s#\.git$##')
echo
echo "Landed ${N} file(s). Pushed to ${BRANCH}."
echo "Open or update the PR: ${REMOTE_URL}/compare/main...${BRANCH}?expand=1"
