#!/bin/bash
# Push credentials from 1Password to the environments that cannot resolve
# op:// references at runtime: Vercel and GitHub Actions.
#
# 1Password is the source of truth. Everything written here is DERIVED — this
# script only ever pushes outward, never reads a deployed value back into the
# vault. That direction is the whole point: it is what stopped the GitHub
# Actions OPENAI_API_KEY sitting five months stale with nobody noticing.
#
#   ./scripts/sync-secrets.sh            preview — reports, writes nothing
#   ./scripts/sync-secrets.sh --apply    write the changes
#
# Preview is the default deliberately. This targets production Vercel, and a
# command that writes by default is a foot-gun for the sake of one flag on
# something run a few times a year.
#
# ---------------------------------------------------------------------------
# Why a state file
#
# GitHub Actions secrets are WRITE-ONLY — `gh secret list` returns names and
# timestamps, never values. So "did this value change?" cannot be answered by
# reading the target. Instead, each successful sync records a SHA-256 of the
# value it wrote to .secrets-sync-state (hashes only, no secrets, gitignored).
# A variable is unchanged when the vault's hash matches the recorded one.
#
# The honest limitation: if a value is changed in the Vercel or GitHub UI
# directly, this script cannot see it and will report "unchanged" until the
# vault value moves. Do not edit those dashboards by hand — that is the habit
# this replaces.
# ---------------------------------------------------------------------------

set -euo pipefail

VAULT="BHD Labs"
STATE_FILE=".secrets-sync-state"
APPLY=false
[ "${1:-}" = "--apply" ] && APPLY=true

# ---------------------------------------------------------------------------
# Manifest — variable | op:// reference | targets (comma-separated)
#
# Targets: vercel, gh (repo secret), gh-env:<environment>
# Keep in step with .env.example, which is the registry of record.
# ---------------------------------------------------------------------------
MANIFEST=$(cat <<'EOF'
OPENAI_API_KEY|op://BHD Labs/OpenAI/credential|vercel
STRIPE_SECRET_KEY_LIVE|op://BHD Labs/Stripe/secret key live|vercel
STRIPE_SECRET_KEY_TEST|op://BHD Labs/Stripe/secret key test|vercel
STRIPE_WEBHOOK_SECRET_LIVE|op://BHD Labs/Stripe/webhook secret live|vercel
STRIPE_WEBHOOK_SECRET_TEST|op://BHD Labs/Stripe/webhook secret test|vercel
SUPABASE_URL|op://BHD Labs/Supabase/url|vercel,gh,gh-env:Production – experiment-hub
SUPABASE_SERVICE_ROLE_KEY|op://BHD Labs/Supabase/service role key|vercel,gh,gh-env:Production – experiment-hub
# Publishable key is safe-by-design (RLS still applies) but ci.yml's live tests
# need it as a repo secret — surfaced 2026-08-17, when the first apply created
# SUPABASE_URL in repo scope and un-skipped a suite that had silently skipped
# on the missing URL since sso-zip-code-persistence.
SUPABASE_PUBLISHABLE_KEY|op://BHD Labs/Supabase/publishable key|gh
# Simple Seed Organizer is a second Supabase project (orlpgxqbesxvlhlkbnqy),
# item-per-scope like "Google OAuth pdf-metadata-viewer". Keys must match
# their project: the 2026-08-17 500s were the hub URL paired with the SSO
# publishable key.
SSO_SUPABASE_URL|op://BHD Labs/Supabase simple-seed-organizer/url|gh
SSO_SUPABASE_SERVICE_ROLE_KEY|op://BHD Labs/Supabase simple-seed-organizer/service role key|gh
FIGMA_ACCESS_TOKEN|op://BHD Labs/Figma/access token|vercel
GITHUB_DISPATCH_TOKEN|op://BHD Labs/GitHub/dispatch token|vercel
GITHUB_TOKEN|op://BHD Labs/GitHub/api token|vercel
PDF_GOOGLE_CLIENT_ID|op://BHD Labs/Google OAuth pdf-metadata-viewer/client id|vercel
PDF_GOOGLE_CLIENT_SECRET|op://BHD Labs/Google OAuth pdf-metadata-viewer/client secret|vercel
PDF_GOOGLE_API_KEY|op://BHD Labs/Google OAuth pdf-metadata-viewer/api key|vercel
PDF_SESSION_SECRET|op://BHD Labs/PDF session/secret|vercel
ETSY_API_KEY|op://BHD Labs/Etsy/api key|gh
ETSY_SHARED_SECRET|op://BHD Labs/Etsy/shared secret|gh
ETSY_SHOP_ID|op://BHD Labs/Etsy/shop id|gh
# Notion: four databases, names that do not disambiguate themselves. See the
# "which database is which" table in docs/SECRETS_RUNBOOK.md before changing any
# of these — two of them render parts of labs.beckharrisdesign.com.
#   experiments data source -> "BHD Labs Database"  : hub experiment list + detail pages
#   history data source     -> "BHD Labs History"   : History band on detail pages
#   inventory db            -> Etsy listings        : etsy-notion-sync only, not the website
# One token can serve all three, but only if every database is shared with that
# same integration — Notion grants access per page, not per workspace.
NOTION_TOKEN|op://BHD Labs/Notion/token|gh
NOTION_INVENTORY_DB_ID|op://BHD Labs/Notion/inventory db id|gh
NOTION_EXPERIMENTS_DATA_SOURCE_ID|op://BHD Labs/Notion/experiments data source id|vercel,gh
NOTION_HISTORY_DATA_SOURCE_ID|op://BHD Labs/Notion/history data source id|vercel,gh
VERCEL_TOKEN|op://BHD Labs/Vercel/token|gh
VERCEL_ORG_ID|op://BHD Labs/Vercel/org id|gh
VERCEL_PROJECT_ID|op://BHD Labs/Vercel/project id|gh
EOF
)

# ---------------------------------------------------------------------------
# Preflight — fail with a cause, not a stack trace
# ---------------------------------------------------------------------------
fail() { echo "  ✗ $1" >&2; exit 1; }

command -v op >/dev/null 2>&1 || fail "1Password CLI not found. brew install 1password-cli"
op vault get "$VAULT" >/dev/null 2>&1 \
  || fail "Cannot read vault '$VAULT'. Unlock the 1Password app, then verify with: op vault list"
command -v gh >/dev/null 2>&1 || fail "GitHub CLI not found. brew install gh"

VERCEL_OK=true
if ! command -v vercel >/dev/null 2>&1; then
  VERCEL_OK=false
  echo "  ! Vercel CLI not found — Vercel targets will be skipped. Install: npm i -g vercel"
fi

# `vercel env` needs a project context, and no checkout here is `vercel link`ed
# — deploys go through Actions, and each worktree would need its own link
# anyway (found on the first real --apply, 2026-08-17: "Your codebase isn't
# linked to a project"). The CLI's documented link-free alternative is the
# VERCEL_ORG_ID + VERCEL_PROJECT_ID environment variables, and both are already
# manifest entries in the vault. Resolve them once here; refuse the same
# non-values the sync loop refuses.
vercel_org=""; vercel_project=""
if $VERCEL_OK; then
  vercel_org=$(op read "op://$VAULT/Vercel/org id" 2>/dev/null || true)
  vercel_project=$(op read "op://$VAULT/Vercel/project id" 2>/dev/null || true)
  for v in "$vercel_org" "$vercel_project"; do
    case "$v" in ""|PASTE_VALUE_HERE|"[SENSITIVE]")
      VERCEL_OK=false
      echo "  ! Vercel org/project id not filled in the vault — Vercel targets will be skipped."
      break;;
    esac
  done
fi

$APPLY && echo "== APPLYING ==" || echo "== PREVIEW (no writes; re-run with --apply) =="
echo

# ---------------------------------------------------------------------------
# Sync
# ---------------------------------------------------------------------------
touch "$STATE_FILE"
added=0; updated=0; unchanged=0; skipped=0
synced_names=""

while IFS='|' read -r name ref targets; do
  [ -z "$name" ] && continue
  # The manifest carries explanatory comments; without this they are read as
  # variable names and reported as unfilled credentials.
  case "$name" in \#*) continue;; esac
  synced_names="$synced_names $name"

  # Values that are not values. Pushing any of these would replace working
  # credentials with nonsense.
  #
  #   PASTE_VALUE_HERE  the placeholder scaffolded vault items ship with —
  #                     1Password will not store an empty field, so a fresh item
  #                     has to hold something.
  #   [SENSITIVE]       what `vercel env pull` writes for any variable marked
  #                     Sensitive. Vercel will not decrypt those, so a migration
  #                     that reads from Vercel silently harvests this string
  #                     instead of the credential. Found the hard way on
  #                     2026-08-16: five vault fields were filled with it, all
  #                     carrying the same 11-character fingerprint.
  #
  # Anything else short and constant that shows up here belongs in this list.
  if ! value=$(op read "$ref" 2>/dev/null) || [ -z "$value" ] \
     || [ "$value" = "PASTE_VALUE_HERE" ] || [ "$value" = "[SENSITIVE]" ]; then
    echo "  ? $name — not filled in yet ($ref)"
    skipped=$((skipped + 1))
    continue
  fi

  hash=$(printf '%s' "$value" | shasum -a 256 | cut -d' ' -f1)
  prev=$(grep "^$name " "$STATE_FILE" 2>/dev/null | cut -d' ' -f2 || true)

  if [ "$hash" = "$prev" ]; then
    echo "  = $name — unchanged"
    unchanged=$((unchanged + 1))
    continue
  fi

  verb="updated"; [ -z "$prev" ] && verb="added"
  echo "  ${verb:0:1} $name — $verb → $targets"

  if $APPLY; then
    IFS=',' read -ra target_list <<< "$targets"
    for target in "${target_list[@]}"; do
      case "$target" in
        vercel)
          if $VERCEL_OK; then
            VERCEL_ORG_ID="$vercel_org" VERCEL_PROJECT_ID="$vercel_project" \
              vercel env rm "$name" production --yes >/dev/null 2>&1 || true
            printf '%s' "$value" | VERCEL_ORG_ID="$vercel_org" VERCEL_PROJECT_ID="$vercel_project" \
              vercel env add "$name" production >/dev/null
          fi
          ;;
        gh)
          printf '%s' "$value" | gh secret set "$name" >/dev/null
          ;;
        gh-env:*)
          printf '%s' "$value" | gh secret set "$name" --env "${target#gh-env:}" >/dev/null
          ;;
      esac
    done
    # Record only after every target succeeded, so a partial failure retries.
    grep -v "^$name " "$STATE_FILE" > "$STATE_FILE.tmp" 2>/dev/null || true
    echo "$name $hash" >> "$STATE_FILE.tmp"
    mv "$STATE_FILE.tmp" "$STATE_FILE"
  fi

  [ "$verb" = "added" ] && added=$((added + 1)) || updated=$((updated + 1))
done <<< "$MANIFEST"

# ---------------------------------------------------------------------------
# Orphans — reported, never deleted.
#
# A secret with no vault counterpart may still be consumed by something outside
# the workflow files. The stale OPENAI_API_KEY found on 2026-08-16 was exactly
# this shape: five months old, no workflow referencing it. Worth a human look,
# not an automatic delete.
# ---------------------------------------------------------------------------
echo
for existing in $(gh secret list --json name -q '.[].name' 2>/dev/null || true); do
  case " $synced_names " in
    *" $existing "*) ;;
    *) echo "  ! $existing — in GitHub Actions, not in the manifest (orphan?)" ;;
  esac
done

echo
echo "  added $added · updated $updated · unchanged $unchanged · not-in-vault $skipped"
$APPLY || echo "  Preview only — nothing was written."
