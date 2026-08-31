/**
 * Shared Google Ads module (openspec/changes/google-ads-automation).
 *
 * Callers import verbs from here and never touch the underlying
 * google-ads-api library — the wrapper is the public surface, so the pinned
 * third-party dependency stays replaceable. Credentials are env-only via
 * `op run`; setup: docs/GOOGLE_ADS_SETUP.md.
 */
export { getGoogleAdsCustomer, resolveCustomerId } from "./client";
export {
  createCampaign,
  listCampaigns,
  getCampaign,
  pauseCampaign,
  enableCampaign,
  setBudget,
  type CreateCampaignInput,
  type CreatedCampaign,
  type CampaignSummary,
  type KeywordMatchType,
} from "./campaigns";
export { getPerformance, type PerformanceRow, type PerformanceQuery } from "./reporting";
