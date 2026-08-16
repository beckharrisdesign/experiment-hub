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

# Dependencies: a freshly created worktree has no node_modules, so repo tooling
# installed as a devDependency (openspec, turbo, vitest) is simply absent until
# someone remembers to install by hand — which is why change scaffolds were
# being written against openspec/schemas/ instead of the CLI. Runs before the
# remote-only exit so local worktrees provision themselves too.
#
# Guarded rather than unconditional: an install on every session start would
# add seconds to a machine that does not have them to spare.
#
# The stamp records the lockfile's HASH, not a timestamp. Two earlier attempts
# failed on timestamps: comparing against node_modules never re-quiets (pnpm
# leaves that mtime alone when the install is already satisfied), and comparing
# against a touched stamp is unreliable because both files routinely land in the
# same wall-clock second, where `-nt` does not answer consistently. A content
# hash has no granularity problem and reinstalls exactly when dependencies
# actually changed. The stamp lives inside node_modules so a fresh worktree
# starts without one and provisions itself.
# Non-fatal — a failed install should degrade the session, not block it.
if [ -f pnpm-lock.yaml ] && command -v pnpm >/dev/null 2>&1; then
  stamp="node_modules/.session-start-install-stamp"
  want=$(shasum -a 256 pnpm-lock.yaml | cut -d' ' -f1)
  have=$([ -f "$stamp" ] && cat "$stamp" || echo "none")
  if [ "$want" != "$have" ]; then
    echo "Installing dependencies (pnpm)..."
    if pnpm install --frozen-lockfile; then
      mkdir -p node_modules && printf '%s' "$want" > "$stamp"
    else
      echo "pnpm install failed — run it manually if tooling is missing."
    fi
  fi
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

# package.json declares packageManager: pnpm, and pnpm-lock.yaml is the real
# lockfile. This ran `npm install` against a stale package-lock.json, building a
# different tree than every local checkout — a standing source of phantom
# failures in remote sessions. The guarded block above already installs when
# needed; this is the unconditional remote pass, after the registry auth above.
echo "Installing root dependencies (pnpm)..."
pnpm install --frozen-lockfile

echo "Session start hook complete."
