#!/usr/bin/env bash
# bootstrap.sh — sett opp Heins Claude Code skills/agents/commands på en ny maskin.
# Idempotent: trygt å kjøre flere ganger. Fungerer på macOS, Linux og VM-er.
#
# Bruk:
#   curl -fsSL https://raw.githubusercontent.com/heintonny/skills/main/bootstrap.sh | bash
#   eller: git clone … && ./bootstrap.sh
#
# Krever: claude (Claude Code CLI). Ingen GitHub-auth nødvendig for de public marketplacene.

set -euo pipefail

say() { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!! \033[0m %s\n' "$*"; }

# --- public marketplaces (auth-fritt) ---
PUBLIC_MARKETPLACES=(
  "heintonny/skills"        # marketplace-navn: heintonny
  "mattpocock/skills"       # marketplace-navn: mattpocock-skills
)

# --- plugins å installere: <plugin>@<marketplace> ---
PLUGINS=(
  "skills@heintonny"
  "mattpocock-skills@mattpocock-skills"
)

require_claude() {
  if ! command -v claude >/dev/null 2>&1; then
    warn "Fant ikke 'claude' (Claude Code CLI) i PATH. Installer den først:"
    warn "  https://docs.claude.com/en/docs/claude-code"
    exit 1
  fi
}

add_marketplace() {
  local repo="$1"
  if claude plugin marketplace list 2>/dev/null | grep -q "$repo"; then
    say "Marketplace allerede lagt til: $repo"
  else
    say "Legger til marketplace: $repo"
    claude plugin marketplace add "$repo"
  fi
}

install_plugin() {
  local spec="$1"
  if claude plugin list 2>/dev/null | grep -q "${spec%@*}"; then
    say "Plugin allerede installert: $spec"
  else
    say "Installerer plugin: $spec"
    claude plugin install "$spec"
  fi
}

main() {
  require_claude

  say "Oppdaterer/legger til marketplaces…"
  for m in "${PUBLIC_MARKETPLACES[@]}"; do
    add_marketplace "$m"
  done

  say "Installerer plugins…"
  for p in "${PLUGINS[@]}"; do
    install_plugin "$p"
  done

  say "Ferdig. Verifiser med:  claude plugin list"
  cat <<'EOF'

Valgfritt — privat innhold (krever GitHub-auth på maskinen):
  claude plugin marketplace add heintonny/agent-system-admin
  # installer ev. private plugins derfra med:  claude plugin install <navn>@<marketplace>
EOF
}

main "$@"
