# Google Ads API Tool — Design Document (Basic Access application, Q8)

> Source for the PDF submitted with the Basic Access application on 2026-08-31.
> Regenerate as PDF if Google asks again; keep in step with lib/google-ads reality.

**Company:** Beck Harris Design (BHD Labs) · www.beckharrisdesign.com
**API contact:** katy@beckharrisdesign.com
**Manager account (MCC):** 963-853-9296 · **Operating client account:** 671-160-6591
**Google Cloud project number:** 970660313007
**Access requested:** Basic Access · **Users:** Internal only (single owner-operator)

## 1. Business context

Beck Harris Design is a solo product design and development studio. Under the name BHD Labs, it builds and releases small SaaS product experiments (for example, an Etsy listing-image generator at labs.beckharrisdesign.com). Each experiment is validated with a small, short-lived Google Ads Search campaign — typically one campaign at a time with a budget of $5–$25 per day.

Today these campaigns are managed by hand in the Google Ads web interface. The tool described here replaces that manual work with a small internal software module, for our own two accounts only. There are no clients, no third-party accounts, no resale, and no public interface of any kind.

## 2. What the tool is

A TypeScript library module (`lib/google-ads`) inside our private product monorepo, invoked from command-line scripts by the account owner. Not a web application, not SaaS, no UI. Entire surface is six functions:

| Function | What it does |
| --- | --- |
| `createCampaign` | One atomic mutate: shared budget, campaign, ad group, one RSA, keywords (+ optional negatives). Every campaign created **PAUSED**; going live is a separate call. |
| `listCampaigns` | Campaigns with status and daily budget. |
| `pauseCampaign` / `enableCampaign` | Status by campaign ID. |
| `setBudget` | Updates a campaign's shared daily budget. |
| `getPerformance` | Per-campaign impressions/clicks/cost/conversions for a date range via GAQL. |

**Campaign types supported: Search only** (`advertising_channel_type = SEARCH`; search partners and display disabled on every created campaign).

## 3. Intended audience

One internal user: the company owner (same person owns the MCC, the client account, and the Cloud project). No external users, contractors, or clients. Token not used with any third-party tool. App Conversion Tracking and Remarketing API: not used.

## 4. Architecture and data flow

Owner runs a script locally → `lib/google-ads` (credentials resolved from environment at runtime; 1Password-managed: developer token, OAuth client id/secret, refresh token, login customer id, customer id) → pinned `google-ads-api` client library → Google Ads API (login_customer_id 963-853-9296; operating customer 671-160-6591, or a test account during development) → typed results back to the script; reporting rows used for internal experiment evaluation only.

- **Authentication:** OAuth 2.0, refresh token minted once by the owner through a local consent flow (loopback redirect). OAuth client in Cloud project 970660313007. All credentials in the 1Password vault, injected as env vars; nothing hard-coded.
- **API services used:** GoogleAdsService (search/mutate), CampaignBudgetService, CampaignService, AdGroupService, AdGroupAdService, AdGroupCriterionService, CampaignCriterionService.
- **Development approach:** built and unit-tested against mocked responses; verified against a test manager/client account under Explorer Access before live use.

## 5. Expected volumes

1 MCC, 1 client account. Typically 1–3 campaigns at a time, a handful created per year. Interactive, owner-initiated operations only — well under 1,000 operations/day, usually a few dozen. No polling or scheduled bulk jobs in v1.

## 6. Data handling and policy

Reporting data (campaign-level metrics) is used internally to evaluate our own experiments; no end-user personal data. No data shared, sold, or displayed to any third party. Safety default: campaigns always created paused; spend begins only via explicit owner enable. RMF: internal owner-only tool managing the owner's own accounts — internal-tool provisions apply.
