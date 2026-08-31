/**
 * Performance reporting for the shared Google Ads module
 * (openspec/changes/google-ads-automation): per-campaign metrics over an
 * explicit date range, costs returned in dollars (micros stay internal).
 */
import { fromMicros } from "google-ads-api";
import { getGoogleAdsCustomer } from "./client";

export interface PerformanceRow {
  campaignId: string;
  campaignName: string;
  impressions: number;
  clicks: number;
  costUsd: number;
  conversions: number;
}

export interface PerformanceQuery {
  /** YYYY-MM-DD, inclusive. */
  startDate: string;
  /** YYYY-MM-DD, inclusive. */
  endDate: string;
  /** Restrict to these campaign IDs; omit for all campaigns. */
  campaignIds?: string[];
}

const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;

export async function getPerformance(
  query: PerformanceQuery,
): Promise<PerformanceRow[]> {
  if (!DATE_FORMAT.test(query.startDate) || !DATE_FORMAT.test(query.endDate)) {
    throw new Error("startDate and endDate must be YYYY-MM-DD.");
  }
  const idFilter = query.campaignIds?.length
    ? ` AND campaign.id IN (${query.campaignIds.map((id) => Number(id)).join(", ")})`
    : "";
  const customer = getGoogleAdsCustomer();
  const rows = (await customer.query(`
    SELECT campaign.id, campaign.name,
           metrics.impressions, metrics.clicks,
           metrics.cost_micros, metrics.conversions
    FROM campaign
    WHERE segments.date BETWEEN '${query.startDate}' AND '${query.endDate}'${idFilter}
    ORDER BY campaign.id
  `)) as Array<{
    campaign?: { id?: number | string; name?: string };
    metrics?: {
      impressions?: number | string;
      clicks?: number | string;
      cost_micros?: number | string;
      conversions?: number | string;
    };
  }>;
  return rows.map((row) => ({
    campaignId: String(row.campaign?.id ?? ""),
    campaignName: row.campaign?.name ?? "",
    impressions: Number(row.metrics?.impressions ?? 0),
    clicks: Number(row.metrics?.clicks ?? 0),
    costUsd: fromMicros(Number(row.metrics?.cost_micros ?? 0)),
    conversions: Number(row.metrics?.conversions ?? 0),
  }));
}
