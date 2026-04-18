#!/bin/bash
set -euo pipefail

# Only run in remote Claude Code on the web environments
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

echo "Installing root dependencies..."
npm install

echo "Installing shared skills..."
find "$CLAUDE_PROJECT_DIR/skills" -name "*.md" -exec cp -f {} "$CLAUDE_PROJECT_DIR/.claude/skills/" \;

echo "Session start hook complete."
