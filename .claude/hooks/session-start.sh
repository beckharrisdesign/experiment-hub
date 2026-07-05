#!/bin/bash
set -euo pipefail

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"

# Skills: edit skills/ only. Run scripts/link-agent-dirs.sh after clone if .claude/skills is missing.

# Only run in remote Claude Code on the web environments
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  echo "Session start hook complete (local)."
  exit 0
fi

# GitHub Packages auth for @beckharrisdesign/mvds (see docs in the MVDS repo).
# NODE_AUTH_TOKEN must be set in the Claude environment settings (PAT with
# read:packages). Written to ~/.npmrc, never committed.
if [ -n "${NODE_AUTH_TOKEN:-}" ]; then
  echo "//npm.pkg.github.com/:_authToken=\${NODE_AUTH_TOKEN}" >> "$HOME/.npmrc"
else
  echo "NODE_AUTH_TOKEN not set — @beckharrisdesign/* packages cannot be installed this session."
fi

echo "Installing root dependencies..."
npm install

echo "Session start hook complete."
