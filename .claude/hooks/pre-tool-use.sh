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

if [ "$tool" = "Bash" ] || [ "$tool" = "Shell" ]; then
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

  # Block bulk reads of env files.
  #
  # On 2026-08-14 a `sed` range ran past its intended block and printed three
  # live credentials into a session transcript. Secret scanning and push
  # protection were both enabled and neither applied — the leak never went near
  # git. This closes that route.
  #
  # Deliberately narrow. It blocks commands that EMIT file contents and leaves
  # name-only inspection working, because a guard that blocks all env access
  # just pushes the same work outside the harness, where nothing watches it.
  # .env.example is exempt: it is the values-free registry, and reading it is
  # how you avoid hunting for a credential you already have.
  # Quoted sections are stripped before looking for a filename. Without this,
  # `grep -nE "\.env" some-workflow.yml` is blocked for merely MENTIONING .env
  # in its search pattern — a false positive that makes searching the codebase
  # for env references impossible.
  # Heredoc bodies are DATA, not commands — a commit message or doc that
  # merely describes reading an env file must not be blocked. Scanning stops at
  # the first `<<`. (Anything genuinely reading a file names it before the
  # heredoc, so `cat .env.local <<EOF` is still caught.)
  scan_target=${command%%<<*}
  unquoted=$(echo "$scan_target" | sed -e "s/'[^']*'//g" -e 's/"[^"]*"//g')
  env_ref=$(echo "$unquoted" \
    | grep -oE "[^[:space:]]*\.env[a-zA-Z0-9_.-]*" \
    | grep -v '\.env\.example' || true)
  if [ -n "$env_ref" ]; then
    if echo "$command" | grep -qE 'cut -d= -f1|grep -c |test -f |\[ -f '; then
      : # name-only inspection — allowed
    # grep/rg belong here: `grep OPENAI_API_KEY .env.local` prints the VALUE.
    # They were originally omitted, which left the guard's biggest hole.
    elif echo "$command" | grep -qE '(^|[|;&[:space:]])(cat|bat|less|more|head|tail|sed|awk|nl|tac|strings|xxd|od|pbcopy|grep|egrep|rg|ag)([[:space:]]|$)'; then
      echo "Blocked: that would print the contents of an env file." >&2
      echo "Secrets are op:// references resolved by 1Password, not values on disk." >&2
      echo "To list variable NAMES: grep -E '^[A-Z_]+=' <file> | cut -d= -f1" >&2
      echo "To read the registry:   cat .env.example" >&2
      echo "To use a value:         op read 'op://Experiment Hub/<item>/<field>'" >&2
      exit 2
    fi
  fi

  # Block pushing to a branch whose PR is already merged (prevents orphaned commits).
  # Matches both `git push` and the RTK-rewritten `rtk git push`. Push-only to keep
  # the gh network call off the more frequent `git commit` path.
  if echo "$command" | grep -qE 'git push( |$)'; then
    branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
    if [ -n "$branch" ] && [ "$branch" != "main" ] && [ "$branch" != "master" ]; then
      pr_state=$(gh pr view "$branch" --json state -q .state 2>/dev/null || echo "")
      if [ "$pr_state" = "MERGED" ]; then
        echo "Blocked: branch '$branch' already has a MERGED PR — new commits here will be orphaned. Start fresh: git checkout main && git pull && git checkout -b <new-branch>" >&2
        exit 2
      fi
    fi
  fi
fi

exit 0
