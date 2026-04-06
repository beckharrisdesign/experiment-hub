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

cd "${CLAUDE_PROJECT_DIR:-.}"

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "There are uncommitted changes in the repository. Please commit and push these changes to the remote branch." >&2
  exit 2
fi

# Require that local commits are pushed before ending the turn.
if ! git rev-parse --abbrev-ref --symbolic-full-name "@{upstream}" >/dev/null 2>&1; then
  branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
  echo "Branch '$branch' has no upstream. Push with: git push -u origin $branch" >&2
  exit 2
fi

ahead_count=$(git rev-list --count "@{upstream}..HEAD")
if [ "$ahead_count" -gt 0 ]; then
  echo "There are $ahead_count unpushed commit(s). Push before stopping." >&2
  exit 2
fi

# Require an open PR for any non-main branch that has commits beyond main.
branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
if [ "$branch" != "main" ] && [ "$branch" != "master" ] && [ "$branch" != "HEAD" ]; then
  # Only check if this branch has commits not in main (i.e. real work was done).
  commits_ahead=$(git rev-list --count "origin/main..HEAD" 2>/dev/null || echo "0")
  if [ "$commits_ahead" -gt 0 ]; then
    # Check for an open PR using the GitHub API.
    repo="beckharrisdesign/experiment-hub"
    pr_found=false

    if [ -n "${GITHUB_TOKEN:-}" ]; then
      response=$(curl -sf \
        -H "Authorization: Bearer $GITHUB_TOKEN" \
        -H "Accept: application/vnd.github+json" \
        "https://api.github.com/repos/${repo}/pulls?state=open&head=beckharrisdesign:${branch}" \
        2>/dev/null || echo "[]")
      if [ "$response" != "[]" ] && [ "$response" != "" ] && echo "$response" | grep -q '"number"'; then
        pr_found=true
      fi

      if [ "$pr_found" = false ]; then
        echo "Branch '$branch' has $commits_ahead commit(s) ahead of main but no open pull request. Please create a PR for this branch before finishing." >&2
        exit 2
      fi
    fi
    # If GITHUB_TOKEN is not set, skip the API check — the push requirement above
    # is still enforced. Set GITHUB_TOKEN to enable full PR verification.
  fi
fi

exit 0
