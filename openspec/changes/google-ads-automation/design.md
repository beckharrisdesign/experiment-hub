# Design — google-ads-automation

## Context

A shared `lib/google-ads` module giving any hub session programmatic control of Google Ads campaigns via the official API, keyed from the BHD Labs vault. No UI ships in this change; the "design" here is the module's surface, the credential plumbing, and the one-time Google-side setup.

## Goals / Non-Goals

**Goals:**

- Campaign operations as typed function calls: create (full chain, born PAUSED), list, pause, enable, set budget, report.
- One credential path: env-only, `op run` locally, vault-synced everywhere else.
- Survive the waiting period: everything provable against a test account while Basic access review runs.

**Non-Goals:**

- No hub UI/dashboard (a later change if the module earns it).
- No bid-strategy automation, no billing setup, no non-Search campaign types in v1.
- No headless-browser fallback of any kind.

## User flow / IA

No rendered surface. Two flows:

1. **Operating flow (repeating):** session runs under `op run` → calls `lib/google-ads` verbs → module talks to the Ads API → returns typed results. Campaign creation always lands PAUSED; enabling is a separate, deliberate call.
2. **Setup flow (once, Katy in browser):** create free Manager (MCC) account → API Center: copy developer token + submit Basic access application → Cloud console: enable Google Ads API on the existing project, create a new OAuth client → run the consent helper script locally → paste outputs into BHD Labs vault items. Documented as a runbook; script prints the exact vault destinations.

## Visual design / Figma

| Item | Value |
| ---- | ----- |
| Primary file URL | N/A — no UI. Library module + scripts + runbook only; nothing renders. Per the micro-interactions/API exemption, behavior is fully specified here and in the spec scenarios. |

## Decisions

- **Client library: Opteo's `google-ads-api` (npm).** Google ships no official Node client; Opteo's is the de-facto standard TypeScript one (typed GAQL, mutation helpers). Pin the version — the Ads API sunsets versions roughly yearly, and the library major-versions with it. Fallback if it ever rots: the official REST endpoints with our own thin fetch layer; the module's public surface stays ours either way, so callers never see the library.
- **Module shape: `lib/google-ads/` directory** (`client.ts`, `campaigns.ts`, `reporting.ts`, `index.ts`) — the Etsy-sync precedent scaled up one notch; callers import verbs, never the underlying library.
- **New OAuth client, same console project.** Don't reuse the pdf-metadata-viewer client — different scope (`adwords`), different blast radius. Registry entries: `GOOGLE_ADS_DEVELOPER_TOKEN`, `GOOGLE_ADS_CLIENT_ID`, `GOOGLE_ADS_CLIENT_SECRET`, `GOOGLE_ADS_REFRESH_TOKEN`, `GOOGLE_ADS_LOGIN_CUSTOMER_ID` (MCC), `GOOGLE_ADS_CUSTOMER_ID` (live), `GOOGLE_ADS_TEST_CUSTOMER_ID`.
- **Publish the OAuth consent screen to "In production" immediately.** In "Testing" status Google expires refresh tokens after 7 days — the classic silent breakage. Publishing (no verification needed for own-account use; the unverified warning is acceptable) makes the refresh token long-lived.
- **Born-PAUSED creation, explicit enable.** The module never creates a spending campaign in one step. Same instinct as the confirm-before-DB-inserts rule: money-moving state changes are deliberate.
- **Dollars at the surface, micros inside.** Callers pass `dailyBudgetUsd: 10`; the module converts to micros. No caller ever reasons about `10_000_000`.
- **Test/live selection by env.** The same code path runs against `GOOGLE_ADS_TEST_CUSTOMER_ID` until Basic access clears; switching to live is a key change, not a code change.
- **Testing: mocked-unit + live-optional.** Vitest unit tests mock the API layer; a small live suite (test account only) runs under the existing `vitest.live.config.ts` pattern, never in CI.

## Risks / Trade-offs

- **Basic access review is Google's clock** (typically days, occasionally longer or bounced for a fuller use-case description). Mitigation: test-account development is fully unblocked; the application goes in on day one.
- **API version churn:** pinned library + a named upgrade chore beats silent breakage; the wrapper isolates callers from it.
- **Community library dependency:** Opteo's package is mature but third-party; the thin-wrapper decision caps the cost of ever replacing it.
- **Search-only v1** trades breadth for a provable end-to-end now; the verb surface was chosen so Performance Max or Display later extend rather than rework it.
