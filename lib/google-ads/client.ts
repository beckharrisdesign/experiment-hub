/**
 * Env-only Google Ads client factory (openspec/changes/google-ads-automation).
 *
 * Credentials resolve exclusively from the environment so `op run` (locally)
 * and vault-synced env (deployed) stay the single credential path — never
 * import this with literal keys, never read a file for secrets. Key names
 * are registered in .env.example; one-time setup lives in
 * docs/GOOGLE_ADS_SETUP.md.
 */
import { GoogleAdsApi, type Customer } from "google-ads-api";

const RUNBOOK = "docs/GOOGLE_ADS_SETUP.md";

const REQUIRED_KEYS = [
  "GOOGLE_ADS_DEVELOPER_TOKEN",
  "GOOGLE_ADS_CLIENT_ID",
  "GOOGLE_ADS_CLIENT_SECRET",
  "GOOGLE_ADS_REFRESH_TOKEN",
] as const;

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `${key} is not set. It is registered in .env.example (vault-backed via op://); see ${RUNBOOK} for how it is minted.`,
    );
  }
  return value;
}

/** Google displays customer IDs as 671-160-6591; the API wants digits only. */
function digitsOnly(id: string): string {
  return id.replace(/\D/g, "");
}

/**
 * The account campaigns operate on: GOOGLE_ADS_CUSTOMER_ID (live) when set,
 * otherwise GOOGLE_ADS_TEST_CUSTOMER_ID — so cutover to the live account is a
 * vault key change, not a code change.
 */
export function resolveCustomerId(explicitId?: string): string {
  // || (not ??): an env var set to the empty string means "unset" here, so a
  // blank GOOGLE_ADS_CUSTOMER_ID= line still falls through to the test account.
  const id =
    explicitId ||
    process.env.GOOGLE_ADS_CUSTOMER_ID ||
    process.env.GOOGLE_ADS_TEST_CUSTOMER_ID;
  if (!id) {
    throw new Error(
      `Neither GOOGLE_ADS_CUSTOMER_ID nor GOOGLE_ADS_TEST_CUSTOMER_ID is set. Both are registered in .env.example; see ${RUNBOOK}.`,
    );
  }
  return digitsOnly(id);
}

/**
 * Authenticated Customer for the resolved account. Server/script-side only.
 * GOOGLE_ADS_LOGIN_CUSTOMER_ID (the MCC) is required whenever the operating
 * account is accessed through a manager account — which is the normal setup
 * here — but stays optional so a directly-accessible account also works.
 */
export function getGoogleAdsCustomer(customerId?: string): Customer {
  const client = new GoogleAdsApi({
    developer_token: requireEnv("GOOGLE_ADS_DEVELOPER_TOKEN"),
    client_id: requireEnv("GOOGLE_ADS_CLIENT_ID"),
    client_secret: requireEnv("GOOGLE_ADS_CLIENT_SECRET"),
  });
  const loginCustomerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID;
  return client.Customer({
    customer_id: resolveCustomerId(customerId),
    refresh_token: requireEnv("GOOGLE_ADS_REFRESH_TOKEN"),
    ...(loginCustomerId ? { login_customer_id: digitsOnly(loginCustomerId) } : {}),
  });
}

export { REQUIRED_KEYS };
