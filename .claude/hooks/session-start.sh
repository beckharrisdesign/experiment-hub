#!/bin/bash
set -euo pipefail

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"

# Always sync project skills so `/skill-name` works in local Claude Code, not only on web.
# Source of truth: skills/ — .claude/skills/*.md is gitignored (see .gitignore).
mkdir -p "$CLAUDE_PROJECT_DIR/.claude/skills"
if [ -d "$CLAUDE_PROJECT_DIR/skills" ]; then
  echo "Syncing skills to .claude/skills/..."
  find "$CLAUDE_PROJECT_DIR/skills" -name "*.md" -exec cp -f {} "$CLAUDE_PROJECT_DIR/.claude/skills/" \;
fi

# Only run in remote Claude Code on the web environments
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  echo "Session start hook complete (local)."
  exit 0
fi

echo "Installing root dependencies..."
npm install

echo "Session start hook complete."
