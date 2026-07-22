#!/bin/bash
# UserPromptSubmit hook — inject the current branch's live PR state into
# context each turn, so the model reports real merge status instead of a
# stale in-session assumption ("waiting for you to merge" after it merged).
#
# stdout from this hook is added to the model's context. Keep it to one line.
# Fail open: any error (no repo, no gh, no PR, network) exits 0 with no output.

set -uo pipefail

cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0

branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null) || exit 0
if [ "$branch" = "main" ] || [ "$branch" = "master" ] || [ "$branch" = "HEAD" ]; then
  exit 0
fi

command -v gh >/dev/null 2>&1 || exit 0

state=$(gh pr view --json number,state,mergedAt \
  -q '"PR #\(.number) for this branch is \(.state)" + (if .mergedAt then " (merged \(.mergedAt))" else "" end)' \
  2>/dev/null) || exit 0

if [ -n "$state" ]; then
  echo "[live github state, queried at prompt time — trust this over any earlier in-session assumption] branch: ${branch} — ${state}"
fi

exit 0
