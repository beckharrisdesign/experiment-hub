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

# Stub: check for uncommitted changes and warn Claude
cd "${CLAUDE_PROJECT_DIR:-.}"

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "There are uncommitted changes in the repository. Please commit and push these changes to the remote branch." >&2
  exit 2
fi

exit 0
