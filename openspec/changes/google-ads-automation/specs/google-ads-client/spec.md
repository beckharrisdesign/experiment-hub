# google-ads-client

## Outcomes

See [proposal Outcomes](../../proposal.md#outcomes) — who: Katy + any hub session; job: campaign operations as function calls; done when: create, control, and report on real campaigns via `lib/google-ads` with vault-resolved credentials.

## ADDED Requirements

### Requirement: Vault-keyed authentication

The module authenticates to the Google Ads API using only environment variables, so `op run` (locally) and vault-synced env (deployed) are the single credential path and no secret ever lives in code or plaintext files.

**Fails until:** `lib/google-ads` can build an authenticated client from env keys registered in `.env.example`, and errors with a message naming the missing key (not a Google stack trace) when one is absent.

#### Scenario: Authenticated client from vault-resolved env

- **WHEN** a hub script running under `op run` calls the module's client factory
- **THEN** it returns a client authenticated against the Ads account, without reading any file for secrets

#### Scenario: Missing credential names itself

- **WHEN** a required key (developer token, OAuth client id/secret, refresh token, customer ID) is unset
- **THEN** the module fails fast with the missing key's registry name and a pointer to the setup runbook

### Requirement: Create a campaign end-to-end

A single module call creates a working campaign — budget, campaign, ad group, ads, and keywords — and every campaign is created **paused**, so nothing spends money until it is explicitly enabled.

**Fails until:** one function call against the test account produces a complete paused campaign visible in the Ads UI.

#### Scenario: One call creates a complete paused campaign

- **WHEN** a session calls `createCampaign` with name, daily budget, ad copy, and keywords
- **THEN** the full chain (budget → campaign → ad group → ads → keywords) exists in the account, the campaign status is PAUSED, and the call returns the new resource IDs

### Requirement: Control existing campaigns

Campaigns can be listed, paused, enabled, and re-budgeted by ID, replacing the manual UI round-trip for routine operations.

**Fails until:** each verb round-trips against the test account and returns the campaign's post-change state.

#### Scenario: Pause and enable by ID

- **WHEN** a session calls `pauseCampaign` (or `enableCampaign`) with a campaign ID
- **THEN** the campaign's status changes in the account and the returned state reflects it

#### Scenario: Change a daily budget

- **WHEN** a session calls `setBudget` with a campaign ID and a daily amount
- **THEN** the campaign's shared budget is updated to that amount and the new value is returned

### Requirement: Performance reporting

Campaign performance (impressions, clicks, cost, conversions) is queryable per campaign and date range, so experiment evaluation reads numbers instead of screenshots.

**Fails until:** a report call returns per-campaign metric rows for an explicit date range.

#### Scenario: Metrics for a date range

- **WHEN** a session calls `getPerformance` with a date range (and optionally campaign IDs)
- **THEN** it returns rows of campaign ID, name, impressions, clicks, cost, and conversions for that range

### Requirement: One-time setup is documented and repeatable

The Google-side ceremony (Manager account, developer token, Basic access application, OAuth consent → refresh token) lives in a runbook plus a helper script, so credentials can be re-derived from documentation alone.

**Fails until:** the runbook exists and the helper script prints a refresh token after a local consent flow, with instructions that end in vault items — never pasted literals.

#### Scenario: Refresh token minted locally into the vault

- **WHEN** Katy runs the OAuth helper script and completes Google's consent screen in her browser
- **THEN** the script prints the refresh token with the exact vault item to store it in, and the runbook's registry entries in `.env.example` name every key it produced
