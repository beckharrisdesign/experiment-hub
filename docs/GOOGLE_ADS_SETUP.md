# Google Ads API — one-time setup runbook

Everything the `lib/google-ads` module needs, in order, so these credentials
can be re-derived from documentation alone. Change: `openspec/changes/google-ads-automation`.
Campaign-side context (the live ELK campaign, account history, hard-won
delivery lessons): `docs/AD_CAMPAIGN_GOOGLE.md`.

**The live Ads account is 671-160-6591** (runs `etsy-listing-kit-test1`; note
it is partly repurposed from SwiftSketchAI — not every conversion action in it
belongs to ELK). **The MCC is "Beck Harris Design", 963-853-9296** — created
and linked 2026-08-31. To enter it: click the account avatar (top right) →
pick "Beck Harris Design · Manager" in the account list; the picker at
ads.google.com/nav/selectaccount works too. (A second, abandoned manager
970-951-1282 sits at "Setup in progress" — deletable from that same menu.)

Secrets discipline throughout: values land in the **BHD Labs vault, item
"Google Ads API"**; `.env.local` gets `op://` references only (never
literals); `.env.example` is the registry of record. See `docs/SECRETS_RUNBOOK.md`.

## 1. Manager account + developer token (start here — the review is the long pole)

1. Create a free **Google Ads Manager (MCC) account** at <https://ads.google.com/home/tools/manager-accounts/> → "Create a manager account" (use the same Google login that owns 671-160-6591; pick "manage my own accounts"). There is no path to this from inside a regular Ads account's Tools menu — it is a standalone signup page.
2. From the MCC, **link the existing account 671-160-6591**: left-nav **Accounts** icon → **Sub-account settings** → blue **+** → **Link existing account** → enter the customer ID → Send request. Then **accept the invitation from inside the regular Ads account** (notification/email) — the link is pending until accepted.
3. MCC → **Admin → API Center**. There is no token until you ask for one: the first visit shows the **API Access form** (API contact email, company name/website, terms). Submitting it generates the **developer token** immediately at **Explorer Access** (2026 name for the test-accounts-only tier) → reveal with **View token** → vault field `developer token`. Live accounts need step 4. *(Done 2026-08-31: token exists; Developer Details filed as "Venture Validation and Development".)*
4. In the API Center, expand the **Access level** row and click **"Apply for Basic Access"** (external form). Describe the use case plainly: internal tooling for managing our own small campaigns — create/pause/budget/report; no third-party accounts, low request volume. Approval typically takes days; nothing else in this runbook waits on it.
5. While that processes, create a **test manager account** and a **test client account** under it (API Center links to the flow; test accounts are marked with a red "Test account" banner). Record the test client's ID → vault field `test customer id`, and the **test MCC's** ID → used as `login customer id` while developing against test (see §4).

## 2. Cloud console: API + OAuth client

1. In the existing console project: **Enable the Google Ads API** (APIs & Services → Library → "Google Ads API").
2. Create a **new OAuth client**, type **Desktop app** (Desktop clients may use the loopback redirect `http://127.0.0.1:53682/callback` without registering it). **Do not reuse the pdf-metadata-viewer client** — different scope, separate blast radius. → vault fields `client id`, `client secret`.
3. **Publish the consent screen to "In production"** (OAuth consent screen → Publish app). In "Testing" status Google expires refresh tokens after **7 days** — the classic silent breakage a week after everything works. The "unverified app" warning during your own consent click is expected and fine; this app is only ever used by this account.

## 3. Mint the refresh token

```bash
op run --env-file=.env.local -- pnpm tsx scripts/google-ads-auth.ts
```

Open the printed URL, approve with the Google account that can access the Ads
accounts, and the script prints the **refresh token** plus its exact vault
destination (`refresh token` field — paste in the 1Password app, not the CLI,
so it never touches shell history).

Prerequisite: `.env.local` already carries the `GOOGLE_ADS_CLIENT_ID` /
`GOOGLE_ADS_CLIENT_SECRET` op:// references so the script can resolve them.

## 4. Wire `.env.local`

```
GOOGLE_ADS_DEVELOPER_TOKEN="op://BHD Labs/Google Ads API/developer token"
GOOGLE_ADS_CLIENT_ID="op://BHD Labs/Google Ads API/client id"
GOOGLE_ADS_CLIENT_SECRET="op://BHD Labs/Google Ads API/client secret"
GOOGLE_ADS_REFRESH_TOKEN="op://BHD Labs/Google Ads API/refresh token"
GOOGLE_ADS_LOGIN_CUSTOMER_ID="op://BHD Labs/Google Ads API/login customer id"
GOOGLE_ADS_TEST_CUSTOMER_ID="op://BHD Labs/Google Ads API/test customer id"
# GOOGLE_ADS_CUSTOMER_ID stays UNSET until live cutover (§5).
```

Account selection is by env alone: the module uses `GOOGLE_ADS_CUSTOMER_ID`
when set, else `GOOGLE_ADS_TEST_CUSTOMER_ID`. `login customer id` is the MCC
the operating account is reached through — the **test MCC** while developing
against test accounts, the real MCC after cutover. Dashed or plain digits both
work; the module strips formatting.

## 5. Live cutover (after Basic access is approved)

1. Confirm the approval email / API Center status shows **Basic access**.
2. Set vault `customer id` = 671-160-6591 and `login customer id` = the real MCC; add the `GOOGLE_ADS_CUSTOMER_ID` reference to `.env.local`.
3. Re-run the walkthrough **read-only verbs first** (`listCampaigns`, `getPerformance`) before any mutate — per tasks.md §4.3.

## Module contract (what these keys feed)

- `lib/google-ads` — env-only client; a missing key fails fast naming the key and this runbook.
- `createCampaign` always creates campaigns **PAUSED**; `enableCampaign` is the only money-on switch.
- Budgets/costs are **dollars** at the module surface, micros only internally.
- Live-optional tests: `pnpm test:live` pattern, test account only, never CI.
