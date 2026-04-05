#!/bin/bash
# TaskCompleted hook — quality gate when a task is marked done
#
# Fires when Claude marks a TodoWrite task as completed. Use this to enforce
# that work meets quality criteria before the task is considered finished.
#
# Exit 0 = task completion accepted
# Exit 2 = block completion + return message to Claude via stderr
#
# Common extensions:
#   - Run the test suite and block if tests fail
#   - Run eslint and block if there are errors
#   - Check that changed files have no TypeScript errors
#   - Verify no debug code (console.log, debugger) was left in

set -euo pipefail

cd "${CLAUDE_PROJECT_DIR:-.}"

# Run a TypeScript type-check when this project is configured for TypeScript.
if command -v npx &>/dev/null && [ -f "tsconfig.json" ]; then
  if npx --no-install tsc --version >/dev/null 2>&1; then
    if ! npx --no-install tsc --noEmit --pretty false; then
      echo "TypeScript errors found. Fix type errors before marking this task complete." >&2
      exit 2
    fi
  fi
fi

exit 0
