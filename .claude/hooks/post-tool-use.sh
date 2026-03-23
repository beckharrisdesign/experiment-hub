#!/bin/bash
# PostToolUse hook — lint/format after file edits
#
# Fires after every successful tool call. Use this to auto-format changed
# files, run quick lint checks, or validate output before Claude continues.
#
# Input: JSON on stdin with keys: tool_name, tool_input, tool_output
# Stdout is shown to Claude as feedback — use it to surface issues.
# Exit 0 = continue | Exit 2 = signal problem back to Claude
#
# Common extensions:
#   - Run prettier on written/edited files
#   - Run eslint --fix on changed TS/TSX files
#   - Validate JSON files after writes
#   - Check for console.log left in production code

set -euo pipefail

input=$(cat)
tool=$(echo "$input" | jq -r '.tool_name // ""')
file=$(echo "$input" | jq -r '.tool_input.file_path // ""')

# Only act on file write/edit tools
if [[ "$tool" != "Write" && "$tool" != "Edit" ]]; then
  exit 0
fi

# Only act on TS/TSX/JS/JSX files
if [[ "$file" != *.ts && "$file" != *.tsx && "$file" != *.js && "$file" != *.jsx ]]; then
  exit 0
fi

# Run prettier if available
if command -v prettier &>/dev/null; then
  prettier --write "$file" --log-level silent 2>/dev/null || true
fi

exit 0
