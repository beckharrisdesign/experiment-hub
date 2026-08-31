/**
 * Live-optional suite for lib/google-ads (openspec/changes/google-ads-automation).
 * Runs only when Google Ads credentials are present in the environment —
 * i.e. under `op run` against the TEST account. Never CI (vitest.live.config.ts
 * is invoked only by `pnpm test:live`), and read-only: no mutates here.
 */
import { describe, it, expect } from "vitest";
import { listCampaigns, getPerformance } from "@/lib/google-ads";

const hasCredentials =
  !!process.env.GOOGLE_ADS_DEVELOPER_TOKEN &&
  !!process.env.GOOGLE_ADS_REFRESH_TOKEN &&
  !!(process.env.GOOGLE_ADS_CUSTOMER_ID || process.env.GOOGLE_ADS_TEST_CUSTOMER_ID);

describe.skipIf(!hasCredentials)("google-ads live (read-only)", () => {
  it("lists campaigns from the account", async () => {
    const campaigns = await listCampaigns();
    expect(Array.isArray(campaigns)).toBe(true);
    for (const campaign of campaigns) {
      expect(campaign.id).toMatch(/^\d+$/);
      expect(typeof campaign.dailyBudgetUsd).toBe("number");
    }
  });

  it("pulls a performance report for the last 7 days", async () => {
    const end = new Date();
    const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const rows = await getPerformance({ startDate: fmt(start), endDate: fmt(end) });
    expect(Array.isArray(rows)).toBe(true);
  });
});
