#!/bin/bash
# Stop hook — end-of-turn quality gate
#
# Fires when Claude finishes responding. Use this to enforce completion
# criteria, check for uncommitted work, or trigger notifications.
#
# Exit 0 = allow Claude to stop
# Exit 2 = block stop + return message to Claude via stderr (Claude will continue)

set -euo pipefail

# Claude Code re-runs this hook every time it blocks the turn from ending, and
# sets `stop_hook_active: true` on the stdin payload while that retry is in
# flight. Without this guard the gate reaches the identical verdict on every
# retry and blocks forever, until the harness hits its consecutive-block cap
# and overrides the hook — a loop no amount of agent work can exit, because the
# condition being reported is never one the retry can change.
# Only the TOP-LEVEL flag counts, and only when it is literally `true`. A
# substring match would also fire on the key nested anywhere in the payload,
# and standing down here skips EVERY gate below — so a loose match is a way to
# switch the whole gate off. Fails closed: no jq, unparseable payload, or flag
# absent all fall through and run the checks normally.
if [ ! -t 0 ]; then
  payload=$(cat || true)
  if [ -n "$payload" ] && command -v jq >/dev/null 2>&1; then
    active=$(printf '%s' "$payload" \
      | jq -r 'if type == "object" and .stop_hook_active == true then "1" else "0" end' \
        2>/dev/null || echo "0")
    if [ "$active" = "1" ]; then
      exit 0
    fi
  fi
fi

# Audit the tree this session is actually working in.
#
# CLAUDE_PROJECT_DIR points at the MAIN checkout. In a git worktree session that
# is not where the work is happening, so the gate audits a directory the session
# never touched and reports the main checkout's unrelated dirt as this session's
# — a false positive on every worktree run, which together with the missing
# stop_hook_active guard above is what produces the block loop.
cd "$(git rev-parse --show-toplevel 2>/dev/null || echo "${CLAUDE_PROJECT_DIR:-.}")"

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "There are uncommitted changes in the repository. Please commit and push these changes to the remote branch." >&2
  exit 2
fi

# Require that local commits are pushed before ending the turn.
if ! git rev-parse --abbrev-ref --symbolic-full-name "@{upstream}" >/dev/null 2>&1; then
  # A missing upstream only matters when there is something to push. Scratch
  # worktrees start on a fresh branch at main's tip with zero commits, and
  # blocking there strands the turn — the only way to satisfy the gate is to
  # publish an empty branch to the shared remote. Guard on the same
  # origin/main..HEAD count the PR check below already uses.
  unpushed=$(git rev-list --count "origin/main..HEAD" 2>/dev/null || echo "0")
  if [ "$unpushed" -gt 0 ]; then
    branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
    # Single-quote the branch in the suggested command: git rejects spaces and
    # glob characters in refnames, but permits $, ; and &, so an unquoted name
    # pasted into a shell could execute rather than just push.
    echo "Branch '$branch' has no upstream. Push with: git push -u origin '$branch'" >&2
    exit 2
  fi
else
  ahead_count=$(git rev-list --count "@{upstream}..HEAD")
  if [ "$ahead_count" -gt 0 ]; then
    echo "There are $ahead_count unpushed commit(s). Push before stopping." >&2
    exit 2
  fi
fi

# Require an open PR for any non-main branch that has commits beyond main.
# Uses a .git/claude-pr-verified-<branch> marker file (not tracked by git)
# so the check only blocks once per branch until Claude confirms a PR exists.
branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
if [ "$branch" != "main" ] && [ "$branch" != "master" ] && [ "$branch" != "HEAD" ]; then
  commits_ahead=$(git rev-list --count "origin/main..HEAD" 2>/dev/null || echo "0")
  if [ "$commits_ahead" -gt 0 ]; then
    # Resolve the actual git directory — in a worktree .git is a file
    # pointing to the real dir; dereference it so the marker path is valid.
    git_dir=".git"
    if [ -f ".git" ]; then
      git_dir=$(grep '^gitdir:' .git | sed 's/^gitdir: //')
    fi
    marker="${git_dir}/claude-pr-verified-${branch//\//-}"
    if [ ! -f "$marker" ]; then
      echo "Branch '$branch' has $commits_ahead commit(s) ahead of main. Use your GitHub MCP tools to check whether an open pull request exists for this branch in beckharrisdesign/experiment-hub. If no open PR exists, create one following the PR guidelines in CLAUDE.md. Once confirmed, run: touch ${marker}" >&2
      exit 2
    fi
  fi
fi

# Block stop while the branch's open PR has unresolved review threads
# (Copilot comments must be addressed, replied to, and resolved — see
# rules/github-workflow.mdc "Copilot review loop").
if [ "$branch" != "main" ] && [ "$branch" != "master" ] && [ "$branch" != "HEAD" ] && command -v gh >/dev/null 2>&1; then
  pr=$(gh pr view --json number,state -q 'select(.state=="OPEN") | .number' 2>/dev/null || true)
  if [ -n "$pr" ]; then
    unresolved=$(gh api graphql -f query="{repository(owner:\"beckharrisdesign\",name:\"experiment-hub\"){pullRequest(number:$pr){reviewThreads(first:50){nodes{isResolved}}}}}" \
      -q '[.data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved==false)] | length' 2>/dev/null || echo 0)
    if [ "${unresolved:-0}" -gt 0 ]; then
      echo "PR #$pr has $unresolved unresolved review thread(s). Address each Copilot comment, reply, and resolve the threads before stopping." >&2
      exit 2
    fi
  fi
fi

exit 0
