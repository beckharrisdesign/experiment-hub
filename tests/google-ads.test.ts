/**
 * Unit tests for lib/google-ads (openspec/changes/google-ads-automation).
 * The google-ads-api network layer is mocked; enums and micros helpers are
 * the real ones so conversions are tested against the actual library.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockCustomer = {
  query: vi.fn(),
  mutateResources: vi.fn(),
  campaigns: { update: vi.fn() },
  campaignBudgets: { update: vi.fn() },
};

vi.mock("google-ads-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("google-ads-api")>();
  return {
    ...actual,
    GoogleAdsApi: class {
      Customer() {
        return mockCustomer;
      }
    },
  };
});

import {
  createCampaign,
  listCampaigns,
  setBudget,
  pauseCampaign,
  getPerformance,
  resolveCustomerId,
  getGoogleAdsCustomer,
} from "@/lib/google-ads";

const FULL_ENV = {
  GOOGLE_ADS_DEVELOPER_TOKEN: "dev-token",
  GOOGLE_ADS_CLIENT_ID: "client-id",
  GOOGLE_ADS_CLIENT_SECRET: "client-secret",
  GOOGLE_ADS_REFRESH_TOKEN: "refresh-token",
  GOOGLE_ADS_TEST_CUSTOMER_ID: "123-456-7890",
};

const CAMPAIGN_ROW = {
  campaign: { id: 42, name: "camp", status: 3 },
  campaign_budget: {
    amount_micros: 5_000_000,
    resource_name: "customers/1234567890/campaignBudgets/9",
  },
};

function stubEnv(env: Record<string, string>) {
  for (const key of Object.keys(FULL_ENV)) vi.stubEnv(key, "");
  vi.stubEnv("GOOGLE_ADS_CUSTOMER_ID", "");
  vi.stubEnv("GOOGLE_ADS_LOGIN_CUSTOMER_ID", "");
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
}

beforeEach(() => {
  vi.clearAllMocks();
  stubEnv(FULL_ENV);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("client factory (spec 1.1, 1.2)", () => {
  it("builds an authenticated customer from env alone", () => {
    expect(() => getGoogleAdsCustomer()).not.toThrow();
  });

  it("names the missing key and points at the runbook", () => {
    stubEnv({ ...FULL_ENV, GOOGLE_ADS_DEVELOPER_TOKEN: "" });
    expect(() => getGoogleAdsCustomer()).toThrow(
      /GOOGLE_ADS_DEVELOPER_TOKEN.*GOOGLE_ADS_SETUP\.md/s,
    );
  });

  it("prefers the live customer id and strips dashes", () => {
    stubEnv({ ...FULL_ENV, GOOGLE_ADS_CUSTOMER_ID: "671-160-6591" });
    expect(resolveCustomerId()).toBe("6711606591");
  });

  it("falls back to the test customer id when live is unset", () => {
    expect(resolveCustomerId()).toBe("1234567890");
  });

  it("names both customer-id keys when neither is set", () => {
    stubEnv({ ...FULL_ENV, GOOGLE_ADS_TEST_CUSTOMER_ID: "" });
    expect(() => resolveCustomerId()).toThrow(
      /GOOGLE_ADS_CUSTOMER_ID.*GOOGLE_ADS_TEST_CUSTOMER_ID/s,
    );
  });
});

describe("createCampaign (spec 1.3)", () => {
  const input = {
    name: "test-campaign",
    dailyBudgetUsd: 5,
    finalUrl: "https://example.com/",
    headlines: ["One", "Two", "Three"],
    descriptions: ["First description", "Second description"],
    keywords: [{ text: "etsy listing photos" }],
    negativeKeywords: ["free"],
  };

  it("creates the full chain atomically with the campaign born PAUSED", async () => {
    mockCustomer.mutateResources.mockResolvedValue({
      mutate_operation_responses: [
        { campaign_budget_result: { resource_name: "customers/1234567890/campaignBudgets/11" } },
        { campaign_result: { resource_name: "customers/1234567890/campaigns/22" } },
        { ad_group_result: { resource_name: "customers/1234567890/adGroups/33" } },
      ],
    });
    const created = await createCampaign(input);

    const operations = mockCustomer.mutateResources.mock.calls[0][0];
    const entities = operations.map((op: { entity: string }) => op.entity);
    expect(entities).toEqual([
      "campaign_budget",
      "campaign",
      "ad_group",
      "ad_group_ad",
      "ad_group_criterion",
      "campaign_criterion",
    ]);
    const campaign = operations[1].resource;
    // enums.CampaignStatus.PAUSED === 3; born paused is the money-safety contract.
    expect(campaign.status).toBe(3);
    expect(operations[0].resource.amount_micros).toBe(5_000_000);
    expect(created).toMatchObject({ campaignId: "22", status: "PAUSED" });
  });

  it("rejects an RSA with too few headlines before touching the API", async () => {
    await expect(
      createCampaign({ ...input, headlines: ["only", "two"] }),
    ).rejects.toThrow(/3 headlines/);
    expect(mockCustomer.mutateResources).not.toHaveBeenCalled();
  });
});

describe("campaign control (spec 1.4, 1.5)", () => {
  it("pauses by id and returns the post-change state", async () => {
    mockCustomer.query.mockResolvedValue([CAMPAIGN_ROW]);
    const state = await pauseCampaign("42");
    expect(mockCustomer.campaigns.update).toHaveBeenCalledWith([
      { resource_name: "customers/1234567890/campaigns/42", status: 3 },
    ]);
    expect(state).toMatchObject({ id: "42", status: "PAUSED", dailyBudgetUsd: 5 });
  });

  it("setBudget converts dollars to micros on the campaign's budget", async () => {
    mockCustomer.query.mockResolvedValue([CAMPAIGN_ROW]);
    const state = await setBudget("42", 7.5);
    expect(mockCustomer.campaignBudgets.update).toHaveBeenCalledWith([
      {
        resource_name: "customers/1234567890/campaignBudgets/9",
        amount_micros: 7_500_000,
      },
    ]);
    expect(state.id).toBe("42");
  });

  it("listCampaigns maps rows with budgets back in dollars", async () => {
    mockCustomer.query.mockResolvedValue([CAMPAIGN_ROW]);
    const campaigns = await listCampaigns();
    expect(campaigns).toEqual([
      {
        id: "42",
        name: "camp",
        status: "PAUSED",
        dailyBudgetUsd: 5,
        budgetResourceName: "customers/1234567890/campaignBudgets/9",
      },
    ]);
  });
});

describe("getPerformance (spec 1.6)", () => {
  it("returns per-campaign metric rows with cost in dollars", async () => {
    mockCustomer.query.mockResolvedValue([
      {
        campaign: { id: 42, name: "camp" },
        metrics: { impressions: 129, clicks: 2, cost_micros: 6_590_000, conversions: 0 },
      },
    ]);
    const rows = await getPerformance({ startDate: "2026-08-07", endDate: "2026-08-08" });
    expect(rows).toEqual([
      {
        campaignId: "42",
        campaignName: "camp",
        impressions: 129,
        clicks: 2,
        costUsd: 6.59,
        conversions: 0,
      },
    ]);
    expect(mockCustomer.query.mock.calls[0][0]).toContain(
      "BETWEEN '2026-08-07' AND '2026-08-08'",
    );
  });

  it("rejects malformed dates before querying", async () => {
    await expect(
      getPerformance({ startDate: "08/07/2026", endDate: "2026-08-08" }),
    ).rejects.toThrow(/YYYY-MM-DD/);
    expect(mockCustomer.query).not.toHaveBeenCalled();
  });
});
