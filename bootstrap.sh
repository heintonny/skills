#!/usr/bin/env bash
# bootstrap.sh — set up Hein's Claude Code skills/agents/commands on a new machine.
# Idempotent: safe to run multiple times. Works on macOS, Linux and VMs.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/heintonny/skills/main/bootstrap.sh | bash
#   or: git clone … && ./bootstrap.sh
#
# Requires: claude (Claude Code CLI). No GitHub auth needed for the public marketplaces.

set -euo pipefail

say() { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!! \033[0m %s\n' "$*"; }

# --- public marketplaces (auth-free) ---
PUBLIC_MARKETPLACES=(
  "heintonny/skills"        # marketplace name: heintonny
)

# --- plugins to install: <plugin>@<marketplace> ---
# 'skills' contains own skills/agents/commands + a curated set vendored
# from mattpocock/skills (MIT — see licenses/).
PLUGINS=(
  "skills@heintonny"
)

require_claude() {
  if ! command -v claude >/dev/null 2>&1; then
    warn "Could not find 'claude' (Claude Code CLI) in PATH. Install it first:"
    warn "  https://docs.claude.com/en/docs/claude-code"
    exit 1
  fi
}

add_marketplace() {
  local repo="$1"
  if claude plugin marketplace list 2>/dev/null | grep -q "$repo"; then
    say "Marketplace already added: $repo"
  else
    say "Adding marketplace: $repo"
    claude plugin marketplace add "$repo"
  fi
}

install_plugin() {
  local spec="$1"
  if claude plugin list 2>/dev/null | grep -q "${spec%@*}"; then
    say "Plugin already installed: $spec"
  else
    say "Installing plugin: $spec"
    claude plugin install "$spec"
  fi
}

main() {
  require_claude

  say "Updating/adding marketplaces…"
  for m in "${PUBLIC_MARKETPLACES[@]}"; do
    add_marketplace "$m"
  done

  say "Installing plugins…"
  for p in "${PLUGINS[@]}"; do
    install_plugin "$p"
  done

  say "Done. Verify with:  claude plugin list"
  cat <<'EOF'

Optional — private content (requires GitHub auth on the machine):
  claude plugin marketplace add heintonny/agent-system-admin
  # then install any private plugins from there with:  claude plugin install <name>@<marketplace>
EOF
}

main "$@"
