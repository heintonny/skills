#!/usr/bin/env bash
# link-skills.sh — expose every skill in this repo to Cursor and Codex agents.
#
# Claude Code loads skills via the plugin system (claude plugin update
# skills@heintonny) — do NOT link into ~/.claude/skills or skills would load
# twice. Cursor (~/.cursor/skills) and Codex (~/.codex/skills) have no plugin
# mechanism, so each skill is symlinked into their personal skills directory.
#
# Idempotent: re-running refreshes links and prunes stale links that point
# into this repo but whose source skill no longer exists. Foreign links and
# real directories are left alone.
#
# Usage: scripts/link-skills.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKILLS_SRC="$REPO_ROOT/plugins/skills/skills"

TARGETS=(
  "$HOME/.cursor/skills"
  "$HOME/.codex/skills"
)

for target in "${TARGETS[@]}"; do
  mkdir -p "$target"

  # Prune stale symlinks that point into this repo's skills dir.
  for link in "$target"/*; do
    [[ -L "$link" ]] || continue
    dest="$(readlink "$link")"
    if [[ "$dest" == "$SKILLS_SRC"/* && ! -d "$dest" ]]; then
      rm "$link"
      echo "pruned  $link"
    fi
  done

  # Link every skill; replace existing links, skip real directories.
  for skill in "$SKILLS_SRC"/*/; do
    name="$(basename "$skill")"
    link="$target/$name"
    if [[ -e "$link" && ! -L "$link" ]]; then
      echo "skip    $link (real directory, not managed here)"
      continue
    fi
    ln -sfn "${skill%/}" "$link"
    echo "linked  $link"
  done
done

echo "Done. Claude Code is updated separately: claude plugin update skills@heintonny"
