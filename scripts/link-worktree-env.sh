#!/usr/bin/env bash
# Point every worktree's .env.local at the one canonical file in the main
# checkout, so there is a single place to add a secret and nothing to drift.
#
# Why this exists: worktrees are separate directories and Next.js reads
# .env.local from whichever directory it runs in, so each worktree used to keep
# its own hand-maintained copy. They diverged — one worktree held the only copy
# of the live Stripe keys, another had no env file at all, and secrets died
# whenever a worktree was recycled. Symlinks mean one file, edited once.
#
# Safe by default: a worktree holding keys the canonical file lacks is reported
# and skipped, never overwritten. Merge those keys up, then re-run. Pass
# --force to link anyway (a timestamped backup is always taken first).
#
# Idempotent. Run it as often as you like.

set -euo pipefail

FORCE=0
QUIET=0
for arg in "$@"; do
  case "$arg" in
    --force) FORCE=1 ;;
    --quiet) QUIET=1 ;;   # hook use: warnings only, no per-worktree chatter
  esac
done

say() { [[ $QUIET -eq 1 ]] || echo "$@"; }

# The main checkout, found from anywhere — including from inside a worktree,
# where .git is a file rather than a directory.
MAIN_ROOT="$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")"
CANON="$MAIN_ROOT/.env.local"

if [[ ! -f "$CANON" ]]; then
  # Not routed through say(): --quiet is for hook use, and this is exactly the
  # case a hook must not swallow — it explains why nothing got linked.
  echo "No canonical env file at $CANON — nothing to link." >&2
  echo "Create it (see .env.example) and re-run." >&2
  exit 0
fi

# Key names only. Values are never read, printed, or compared.
keys_of() {
  grep -oE '^[[:space:]]*[A-Za-z_][A-Za-z0-9_]*=' "$1" 2>/dev/null \
    | tr -d ' =' | sort -u
}

linked=0 skipped=0

while read -r wt; do
  [[ -z "$wt" ]] && continue
  [[ "$wt" == "$MAIN_ROOT" ]] && continue   # the canonical file lives here
  target="$wt/.env.local"

  if [[ -L "$target" ]]; then
    ln -sfn "$CANON" "$target"              # re-point; may be a stale link
    say "  relinked  $(basename "$wt")"
    linked=$((linked + 1))
    continue
  fi

  if [[ -f "$target" ]]; then
    orphans="$(comm -23 <(keys_of "$target") <(keys_of "$CANON") | tr '\n' ' ')"
    if [[ -n "${orphans// /}" && $FORCE -eq 0 ]]; then
      echo "  SKIPPED   $(basename "$wt") — holds keys the canonical file does not:"
      echo "              ${orphans}"
      echo "              Merge these into $CANON, then re-run."
      skipped=$((skipped + 1))
      continue
    fi
    # Named to end in .local so the existing .gitignore rule (.env*.local)
    # already covers it. "$target.bak-<ts>" would NOT be ignored, which is a
    # backup full of secrets sitting in the tree waiting for a git add -A.
    cp "$target" "$(dirname "$target")/.env.bak-$(date +%Y%m%d-%H%M%S).local"
    rm -f "$target"
  fi

  ln -sfn "$CANON" "$target"
  say "  linked    $(basename "$wt")"
  linked=$((linked + 1))
done < <(git worktree list --porcelain | awk '/^worktree /{print substr($0, 10)}')

say "env: $linked worktree(s) linked to $CANON, $skipped skipped."
[[ $skipped -gt 0 ]] && echo "Re-run with --force to link the skipped ones anyway (a backup is kept)."
exit 0
