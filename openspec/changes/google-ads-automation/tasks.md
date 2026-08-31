# Tasks — google-ads-automation

## 1. User outcomes (from spec scenarios)

- [ ] 1.1 Authenticated client from vault-resolved env — a session under `op run` gets a working Ads client with no secret read from any file
- [ ] 1.2 Missing credential names itself — an unset key fails fast with its registry name and a runbook pointer, not a Google stack trace
- [ ] 1.3 One call creates a complete paused campaign — budget, campaign, ad group, ads, and keywords exist in the account, status PAUSED, IDs returned
- [ ] 1.4 Pause and enable by ID — campaign status round-trips through the module and the returned state reflects it
- [ ] 1.5 Change a daily budget — a dollar amount in, updated budget confirmed back
- [ ] 1.6 Metrics for a date range — per-campaign impressions, clicks, cost, and conversions for an explicit range
- [ ] 1.7 Refresh token minted locally into the vault — Katy runs the helper, clicks consent once, and the output lands as vault items with every key registered

## 2. One-time Google-side setup (Katy, in browser — start early, the review is the long pole)

- [ ] 2.1 Create a free Google Ads Manager (MCC) account and link the existing Ads account under it
- [ ] 2.2 In the MCC API Center: copy the developer token (works against test accounts immediately) → vault
- [ ] 2.3 Submit the Basic access application from the API Center (short form; unblocks live-account use when approved)
- [ ] 2.4 Create a test manager + test client account for development while the review runs
- [ ] 2.5 In the Cloud console project: enable the Google Ads API and create a new OAuth client (do not reuse the pdf-metadata-viewer client)
- [ ] 2.6 Publish the OAuth consent screen to "In production" (prevents the 7-day refresh-token expiry)
- [ ] 2.7 Run the consent helper script (task 3.5) and store its outputs as BHD Labs vault items

## 3. Implementation

- [x] 3.1 Add pinned `google-ads-api` dependency (pnpm)
- [x] 3.2 `lib/google-ads/client.ts` — env-only client factory with named-missing-key errors (1.1, 1.2)
- [x] 3.3 `lib/google-ads/campaigns.ts` — `createCampaign` (full chain, born PAUSED, dollars→micros), `listCampaigns`, `pauseCampaign`, `enableCampaign`, `setBudget` (1.3–1.5)
- [x] 3.4 `lib/google-ads/reporting.ts` — `getPerformance` over GAQL with typed rows (1.6)
- [x] 3.5 `scripts/google-ads-auth.ts` — local OAuth consent flow that prints the refresh token and its exact vault destination (1.7)
- [x] 3.6 Register all `GOOGLE_ADS_*` keys in `.env.example` with `op://` provenance; extend the `scripts/sync-secrets.sh` manifest
- [x] 3.7 `docs/GOOGLE_ADS_SETUP.md` runbook covering §2 end-to-end, written so credentials can be re-derived from documentation alone
- [x] 3.8 Unit tests with the API layer mocked (vitest); live-optional suite against the test account under the `vitest.live.config.ts` pattern (never CI)

## 4. QA

- [ ] 4.1 Manual walkthrough on the test account: create (verify PAUSED in the Ads UI) → enable → change budget → pull report — the full Outcomes loop
- [x] 4.2 Automated smoke: `pnpm vitest` unit suite green; live suite documented in the runbook with its run command
- [ ] 4.3 Live-account cutover checklist: Basic access approved → set `GOOGLE_ADS_CUSTOMER_ID` in the vault → rerun walkthrough read-only verbs first
