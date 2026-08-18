#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Preflight for `pnpm dev` — fail loudly when 1Password cannot resolve the
# op:// references in .env.local, instead of letting Next start with empty
# credentials and fail three layers deep with an unrelated-looking error.
#
# specs/secret-references, scenario "A broken CLI integration fails loudly":
# start-up must name 1Password as the cause and point at the documented
# bypass. The bypass documentation of record is docs/SECRETS_RUNBOOK.md,
# section "If 1Password is unavailable".
#
# `op vault get` is the readiness check on purpose: with desktop-app
# integration, `op whoami` reports "account is not signed in" even when
# everything works (see the runbook), and `op vault list` succeeding does not
# prove the one vault the references point at is visible.
# ---------------------------------------------------------------------------
set -uo pipefail

VAULT="BHD Labs"
RUNBOOK="docs/SECRETS_RUNBOOK.md"

fail() {
  local cause="$1" detail="${2:-}"
  {
    echo ""
    echo "✗ dev did not start: 1Password cannot resolve the op:// references in .env.local."
    echo "  Cause: ${cause}"
    if [ -n "$detail" ]; then
      # op's own stderr, indented — the specific cause lives here.
      echo "$detail" | sed 's/^/    op: /'
    fi
    echo ""
    echo "  Checks, in order of likelihood (details: \"If 1Password is unavailable\" in ${RUNBOOK}):"
    echo "    1. Desktop app quit or locked → open and unlock 1Password."
    echo "    2. Integration off → 1Password → Settings → Developer → \"Integrate with 1Password CLI\","
    echo "       then quit fully (⌘Q) and reopen."
    echo "    3. macOS denying this app access to 1Password's data (op reports \"No accounts"
    echo "       configured\") → run from a terminal that has the permission, or grant it in"
    echo "       System Settings → Privacy & Security."
    echo ""
    echo "  Need to work right now? Bypass for this shell only:"
    echo "    export KEY=\"\$(op read 'op://${VAULT}/<item>/<field>')\""
    echo "  Never paste values back into .env.local — that plaintext copy is the exact"
    echo "  problem this system removed."
    echo ""
  } >&2
  exit 1
}

command -v op >/dev/null 2>&1 \
  || fail "the 1Password CLI (op) is not installed — brew install 1password-cli"

if ! detail="$(op vault get "$VAULT" 2>&1 >/dev/null)"; then
  fail "op cannot see the \"${VAULT}\" vault." "$detail"
fi
