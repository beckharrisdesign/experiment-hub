#!/bin/bash
set -euo pipefail

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"

# Skills: edit skills/ only. Run scripts/link-agent-dirs.sh after clone if .claude/skills is missing.

# Only run in remote Claude Code on the web environments
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  echo "Session start hook complete (local)."
  exit 0
fi

echo "Installing root dependencies..."
npm install

echo "Session start hook complete."
