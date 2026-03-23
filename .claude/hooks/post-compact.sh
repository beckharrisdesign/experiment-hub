#!/bin/bash
# PostCompact hook — re-inject context after compaction
#
# Fires after Claude's context window is compacted. Use this to remind
# Claude of critical project conventions that may have been summarised away,
# or to log that compaction occurred.
#
# Stdout is injected back into Claude's context as a system message.
# Exit 0 = continue normally
#
# Common extensions:
#   - Echo key conventions Claude should remember
#   - Re-state the active branch and task
#   - Log compaction event to a file for debugging long sessions

set -euo pipefail

# Stub: re-state the branch and core conventions after compaction
branch=$(git -C "${CLAUDE_PROJECT_DIR:-.}" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

echo "Context was compacted. Reminders:"
echo "- Active branch: $branch"
echo "- Commit and push all changes before stopping."
echo "- Follow Voice & Tone standards in agents/design-guidelines.md for all user-facing copy."

exit 0
