#!/bin/bash
# PreToolUse hook — safety guard
#
# Fires before every tool call. Use this to block dangerous operations,
# enforce conventions, or require confirmation before destructive actions.
#
# Input: JSON on stdin with keys: tool_name, tool_input
# Exit 0 = allow | Exit 2 = block (Claude sees the reason via stderr)
#
# Common extensions:
#   - Block `rm -rf` on src/app directories
#   - Block `git push --force` to main/master
#   - Block `--no-verify` on commits
#   - Require confirmation before dropping databases

set -euo pipefail

input=$(cat)
tool=$(echo "$input" | jq -r '.tool_name // ""')
command=$(echo "$input" | jq -r '.tool_input.command // ""')

if [ "$tool" = "Bash" ]; then
  # Block force push to main or master
  if echo "$command" | grep -qE 'git push.*(--force|-f).*(main|master)'; then
    echo "Blocked: force push to main/master is not allowed." >&2
    exit 2
  fi

  # Block --no-verify on commits
  if echo "$command" | grep -qE 'git commit.*--no-verify'; then
    echo "Blocked: --no-verify bypasses hooks. Fix the underlying issue instead." >&2
    exit 2
  fi

  # Block recursive force-delete of source directories
  if echo "$command" | grep -qE 'rm -rf.*(src|app|experiments|lib|agents)'; then
    echo "Blocked: rm -rf on source directories requires manual confirmation." >&2
    exit 2
  fi
fi

exit 0
