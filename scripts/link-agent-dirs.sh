#!/usr/bin/env bash
# Idempotent symlinks: IDE paths → root rules/ and skills/
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

link_dir() {
  local link_path="$1"
  local target="$2"
  if [[ -e "$link_path" && ! -L "$link_path" ]]; then
    rm -rf "$link_path"
  fi
  mkdir -p "$(dirname "$link_path")"
  ln -sfn "$target" "$link_path"
}

link_dir ".cursor/rules" "../rules"
link_dir ".cursor/skills" "../skills"
link_dir ".claude/skills" "../skills"

echo "Linked .cursor/rules, .cursor/skills, .claude/skills → rules/ and skills/"
