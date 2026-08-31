/**
 * Campaign verbs for the shared Google Ads module
 * (openspec/changes/google-ads-automation): create the full Search chain in
 * one atomic mutate, plus list / pause / enable / setBudget.
 *
 * Money-safety contract: createCampaign always creates the campaign PAUSED;
 * enabling spend is a separate, deliberate enableCampaign call. Budgets are
 * dollars at this surface and micros only inside.
 */
import {
  enums,
  toMicros,
  fromMicros,
  ResourceNames,
  type MutateOperation,
} from "google-ads-api";
import { getGoogleAdsCustomer, resolveCustomerId } from "./client";

export type KeywordMatchType = "EXACT" | "PHRASE" | "BROAD";

export interface CreateCampaignInput {
  name: string;
  dailyBudgetUsd: number;
  finalUrl: string;
  /** RSA slots — Google requires 3–15 headlines (≤30 chars) and 2–4 descriptions (≤90 chars). */
  headlines: string[];
  descriptions: string[];
  keywords: Array<{ text: string; matchType?: KeywordMatchType }>;
  negativeKeywords?: string[];
  /**
   * Optional Maximize-clicks CPC ceiling. Leave unset by default: the ELK
   * campaign's first week (docs/AD_CAMPAIGN_GOOGLE.md) showed a ceiling below
   * the auction price silently stops delivery — a rail, never a throttle.
   */
  maxCpcUsd?: number;
}

export interface CreatedCampaign {
  campaignId: string;
  campaignResourceName: string;
  budgetResourceName: string;
  adGroupResourceName: string;
  status: "PAUSED";
}

export interface CampaignSummary {
  id: string;
  name: string;
  status: string;
  dailyBudgetUsd: number;
  budgetResourceName: string;
}

/** Temp ids let one atomic mutate wire budget → campaign → ad group → ads → keywords. */
const TEMP = { budget: -1, campaign: -2, adGroup: -3 };

export async function createCampaign(
  input: CreateCampaignInput,
): Promise<CreatedCampaign> {
  if (input.headlines.length < 3 || input.descriptions.length < 2) {
    throw new Error(
      "Responsive Search Ads need at least 3 headlines and 2 descriptions.",
    );
  }
  if (input.keywords.length === 0) {
    throw new Error("A Search campaign needs at least one keyword.");
  }
  const customer = getGoogleAdsCustomer();
  const cid = resolveCustomerId();
  const budgetName = ResourceNames.campaignBudget(cid, TEMP.budget);
  const campaignName = ResourceNames.campaign(cid, TEMP.campaign);
  const adGroupName = ResourceNames.adGroup(cid, TEMP.adGroup);

  const operations: MutateOperation<Record<string, unknown>>[] = [
    {
      entity: "campaign_budget",
      operation: "create",
      resource: {
        resource_name: budgetName,
        name: `${input.name} budget`,
        amount_micros: toMicros(input.dailyBudgetUsd),
        explicitly_shared: false,
      },
    },
    {
      entity: "campaign",
      operation: "create",
      resource: {
        resource_name: campaignName,
        name: input.name,
        // Born PAUSED, always — spend starts only via enableCampaign().
        status: enums.CampaignStatus.PAUSED,
        advertising_channel_type: enums.AdvertisingChannelType.SEARCH,
        campaign_budget: budgetName,
        // Maximize clicks; optional ceiling per input (see docstring caveat).
        target_spend: input.maxCpcUsd
          ? { cpc_bid_ceiling_micros: toMicros(input.maxCpcUsd) }
          : {},
        // Search only — no search partners, no display (docs/AD_CAMPAIGN_GOOGLE.md).
        network_settings: {
          target_google_search: true,
          target_search_network: false,
          target_content_network: false,
          target_partner_search_network: false,
        },
        contains_eu_political_advertising:
          enums.EuPoliticalAdvertisingStatus
            .DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING,
      },
    },
    {
      entity: "ad_group",
      operation: "create",
      resource: {
        resource_name: adGroupName,
        name: `${input.name} ad group`,
        campaign: campaignName,
        type: enums.AdGroupType.SEARCH_STANDARD,
        status: enums.AdGroupStatus.ENABLED,
      },
    },
    {
      entity: "ad_group_ad",
      operation: "create",
      resource: {
        ad_group: adGroupName,
        status: enums.AdGroupAdStatus.ENABLED,
        ad: {
          final_urls: [input.finalUrl],
          responsive_search_ad: {
            headlines: input.headlines.map((text) => ({ text })),
            descriptions: input.descriptions.map((text) => ({ text })),
          },
        },
      },
    },
    ...input.keywords.map(
      (kw): MutateOperation<Record<string, unknown>> => ({
        entity: "ad_group_criterion",
        operation: "create",
        resource: {
          ad_group: adGroupName,
          status: enums.AdGroupCriterionStatus.ENABLED,
          keyword: {
            text: kw.text,
            match_type: enums.KeywordMatchType[kw.matchType ?? "PHRASE"],
          },
        },
      }),
    ),
    ...(input.negativeKeywords ?? []).map(
      (text): MutateOperation<Record<string, unknown>> => ({
        entity: "campaign_criterion",
        operation: "create",
        resource: {
          campaign: campaignName,
          negative: true,
          keyword: { text, match_type: enums.KeywordMatchType.BROAD },
        },
      }),
    ),
  ];

  const response = (await customer.mutateResources(operations)) as unknown as {
    mutate_operation_responses?: Array<Record<string, { resource_name?: string }>>;
  };
  const created = (response.mutate_operation_responses ?? []).flatMap((op) =>
    Object.values(op)
      .map((result) => result?.resource_name)
      .filter((name): name is string => !!name),
  );
  const campaignResourceName =
    created.find((name) => name.includes("/campaigns/")) ?? campaignName;
  return {
    campaignId: campaignResourceName.split("/").pop() ?? "",
    campaignResourceName,
    budgetResourceName:
      created.find((name) => name.includes("/campaignBudgets/")) ?? budgetName,
    adGroupResourceName:
      created.find((name) => name.includes("/adGroups/")) ?? adGroupName,
    status: "PAUSED",
  };
}

export async function listCampaigns(): Promise<CampaignSummary[]> {
  const customer = getGoogleAdsCustomer();
  const rows = (await customer.query(`
    SELECT campaign.id, campaign.name, campaign.status,
           campaign_budget.amount_micros, campaign_budget.resource_name
    FROM campaign
    WHERE campaign.status != 'REMOVED'
    ORDER BY campaign.id
  `)) as Array<{
    campaign?: { id?: number | string; name?: string; status?: number | string };
    campaign_budget?: { amount_micros?: number | string; resource_name?: string };
  }>;
  return rows.map((row) => ({
    id: String(row.campaign?.id ?? ""),
    name: row.campaign?.name ?? "",
    status: statusLabel(row.campaign?.status),
    dailyBudgetUsd: fromMicros(Number(row.campaign_budget?.amount_micros ?? 0)),
    budgetResourceName: row.campaign_budget?.resource_name ?? "",
  }));
}

function statusLabel(status: number | string | undefined): string {
  if (typeof status === "number") return enums.CampaignStatus[status] ?? String(status);
  return status ?? "";
}

async function setCampaignStatus(
  campaignId: string,
  status: (typeof enums.CampaignStatus)["PAUSED" | "ENABLED"],
): Promise<CampaignSummary> {
  const customer = getGoogleAdsCustomer();
  const resourceName = ResourceNames.campaign(resolveCustomerId(), campaignId);
  await customer.campaigns.update([{ resource_name: resourceName, status }]);
  return getCampaign(campaignId);
}

export function pauseCampaign(campaignId: string): Promise<CampaignSummary> {
  return setCampaignStatus(campaignId, enums.CampaignStatus.PAUSED);
}

/** The deliberate money-on switch — the only way a campaign starts spending. */
export function enableCampaign(campaignId: string): Promise<CampaignSummary> {
  return setCampaignStatus(campaignId, enums.CampaignStatus.ENABLED);
}

export async function setBudget(
  campaignId: string,
  dailyBudgetUsd: number,
): Promise<CampaignSummary> {
  const before = await getCampaign(campaignId);
  if (!before.budgetResourceName) {
    throw new Error(`Campaign ${campaignId} has no budget resource to update.`);
  }
  const customer = getGoogleAdsCustomer();
  await customer.campaignBudgets.update([
    {
      resource_name: before.budgetResourceName,
      amount_micros: toMicros(dailyBudgetUsd),
    },
  ]);
  return getCampaign(campaignId);
}

export async function getCampaign(campaignId: string): Promise<CampaignSummary> {
  const campaigns = await listCampaigns();
  const match = campaigns.find((c) => c.id === String(campaignId));
  if (!match) {
    throw new Error(`Campaign ${campaignId} not found in the account.`);
  }
  return match;
}
