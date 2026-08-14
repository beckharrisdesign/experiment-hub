#!/bin/bash
set -euo pipefail

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"

# Skills: edit skills/ only. Run scripts/link-agent-dirs.sh after clone if .claude/skills is missing.

# Secrets: point this worktree's .env.local at the canonical file in the main
# checkout. Runs locally as well as remotely and before the remote-only exit
# below, because a freshly created worktree starts with no env file at all —
# which is how sessions used to lose an afternoon hunting for keys that were
# already on the machine. Quiet unless something needs a human.
# -f not -x, invoked via bash: the executable bit does not survive every clone
# or platform, and gating on -x would skip this silently — the exact failure
# this is meant to prevent.
if [ -f scripts/link-worktree-env.sh ]; then
  bash scripts/link-worktree-env.sh --quiet || true
fi

# Only run in remote Claude Code on the web environments
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  echo "Session start hook complete (local)."
  exit 0
fi

# GitHub Packages auth for @beckharrisdesign/mvds (see docs in the MVDS repo).
# NODE_AUTH_TOKEN must be set in the Claude environment settings (PAT with
# read:packages). Written to ~/.npmrc, never committed.
if [ -n "${NODE_AUTH_TOKEN:-}" ]; then
  AUTH_LINE='//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}'
  touch "$HOME/.npmrc"
  chmod 600 "$HOME/.npmrc"
  grep -qxF "$AUTH_LINE" "$HOME/.npmrc" || echo "$AUTH_LINE" >> "$HOME/.npmrc"
else
  echo "NODE_AUTH_TOKEN not set — @beckharrisdesign/* packages cannot be installed this session."
fi

echo "Installing root dependencies..."
npm install

echo "Session start hook complete."
