# google-ads-automation

## Human anchor

> "I become the friction when we assume my own manual effort is part of that workflow. […] I want to do the API so this process has way less friction in future use cases."

## Outcomes

- **Who:** Katy, and any hub session or experiment that needs a Google Ads campaign started, paused, budgeted, or measured.
- **Job:** Control Google Ads campaigns programmatically through one shared hub module, so campaign operations become function calls instead of Katy navigating the Ads UI.
- **Done when:** A hub session can create a campaign end-to-end (budget, campaign, ad group, ads, keywords), list campaigns, pause/enable a campaign, change a budget, and pull a performance report through `lib/google-ads` against the real account, with credentials resolved from the BHD Labs vault — and the one-time Google-side setup is documented well enough that it never has to be reverse-engineered again.
- **Not doing:** Headless-Chrome automation of the Ads UI; Google Ads Scripts living inside Google's editor; billing/payment setup; automated bid-strategy optimization; any hub UI surface (module first — a dashboard can be a later change if the module earns it).

## Why

Every future use case that touches Google Ads currently routes through manual clicks in a UI that resists repetition. The official Google Ads API covers campaign control completely, and the hub already has the pattern for this shape of problem: the Etsy sync — a shared, vault-keyed service module that experiments and agent sessions call directly. Doing the API once, properly, converts a recurring per-campaign cost into a one-time setup cost.

The setup has a known long pole: the developer token needs "Basic access" approval from Google before it works against real accounts (instant for test accounts). The change is sequenced around that — build and prove against a test account while the application processes.

## What changes

- New `lib/google-ads/` module wrapping the official Google Ads API: auth (OAuth refresh token + developer token from the vault), campaign verbs (create — the full chain of budget, campaign, ad group, ads, keywords — plus list, pause, enable, set budget), and performance reporting.
- New credentials follow the established 1Password workflow end-to-end: items in the BHD Labs vault, keys registered in `.env.example` with `op://` provenance, `.env.local` holding op:// references (never literals) resolved by `op run` at dev start, and the `scripts/sync-secrets.sh` manifest extended so deployed copies push from the vault (per `docs/SECRETS_RUNBOOK.md`).
- A one-time-setup runbook (MCC account, developer token, Basic access application, OAuth consent) so the Google-side ceremony is documented, not tribal knowledge.
- A small OAuth helper script that produces the refresh token locally — Katy clicks the consent screen once, the script prints the token for the vault.

## Capabilities

### New Capabilities

- `google-ads-client`: shared module for authenticated Google Ads campaign control and reporting, callable from any hub experiment or agent session.

### Modified Capabilities

_None._

## Impact

- No existing hub code changes; purely additive (`lib/`, `.env.example`, `scripts/`, docs).
- New secrets: Google Ads developer token, OAuth client id/secret, refresh token, customer IDs — all vault-first per the secrets rule; the module reads them from the environment only, so `op run` remains the single resolution path locally.
- External dependency: Google's Basic access review gates live-account use; test-account coverage keeps the change unblocked until then.

## Optional links

- Secrets registry: `.env.example` (Google OAuth precedent: pdf-metadata-viewer entries)
- Secrets workflow: `docs/SECRETS_RUNBOOK.md` + `scripts/sync-secrets.sh`
- Prior art for the module shape: `lib/etsy-sync.ts`
