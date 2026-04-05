#!/bin/bash
# Stop hook — end-of-turn quality gate
#
# Fires when Claude finishes responding. Use this to enforce completion
# criteria, check for uncommitted work, or trigger notifications.
#
# Exit 0 = allow Claude to stop
# Exit 2 = block stop + return message to Claude via stderr (Claude will continue)
#
# Common extensions:
#   - Block stop if there are failing tests
#   - Block stop if there are uncommitted changes (see example below)
#   - Send a Slack/email notification on task completion
#   - Log session summary to a file

set -euo pipefail

cd "${CLAUDE_PROJECT_DIR:-.}"

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "There are uncommitted changes in the repository. Please commit and push these changes to the remote branch." >&2
  exit 2
fi

# Require that local commits are pushed before ending the turn.
if ! git rev-parse --abbrev-ref --symbolic-full-name "@{upstream}" >/dev/null 2>&1; then
  branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
  echo "Branch '$branch' has no upstream. Push with: git push -u origin $branch" >&2
  exit 2
fi

ahead_count=$(git rev-list --count "@{upstream}..HEAD")
if [ "$ahead_count" -gt 0 ]; then
  echo "There are $ahead_count unpushed commit(s). Push before stopping." >&2
  exit 2
fi

exit 0
