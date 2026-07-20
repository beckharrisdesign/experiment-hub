/**
 * Server-side helpers for the etsy-notion-sync experiment surface
 * (openspec/changes/etsy-notion-sync-build): run history from the
 * service-role-only etsy_runs table, and workflow dispatch for "Sync now".
 */
import { createClient } from "@supabase/supabase-js";
import type { RawListing } from "@/lib/etsy-scorecard";

export interface EtsySyncRun {
  id: number;
  started_at: string;
  finished_at: string | null;
  status: string;
  trigger_source: string;
  summary: Record<string, unknown> | null;
}

// The etsy_* tables have RLS enabled with no policies, so reads require the
// service-role key; this module must only be imported server-side.
function getServiceClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }
  return createClient(url, key);
}

export async function getEtsySyncRuns(limit = 20): Promise<EtsySyncRun[]> {
  const { data, error } = await getServiceClient()
    .from("etsy_runs")
    .select("*")
    .order("id", { ascending: false })
    .limit(limit);
  if (error) {
    throw new Error(`Failed to load etsy sync runs: ${error.message}`);
  }
  return (data ?? []) as EtsySyncRun[];
}

/**
 * The endpoint value stored on snapshot rows. It is the *un-interpolated*
 * template, not a formatted path — matching it with `like '%listings%'` would
 * also match `/v3/application/listings/{listing_id}/inventory` and silently
 * double the row count with objects that carry none of the scored fields.
 */
const LISTINGS_ENDPOINT = "/v3/application/shops/{shop_id}/listings";

/**
 * Latest snapshot per listing, as raw Etsy JSON.
 *
 * Reads `etsy_latest_listing_snapshots` (the view already exposes
 * `raw_response`; only the Python client narrows its select to `parsed`).
 * Server-only — the service-role key is required and `raw_response` may carry
 * `user`/buyer fields via the `User` include, so callers must project to
 * scores before sending anything to the browser.
 */
export async function getLatestListingSnapshots(): Promise<RawListing[]> {
  const { data, error } = await getServiceClient()
    .from("etsy_latest_listing_snapshots")
    .select("raw_response")
    .eq("endpoint", LISTINGS_ENDPOINT);
  if (error) {
    throw new Error(`Failed to load etsy listing snapshots: ${error.message}`);
  }
  return (data ?? [])
    .map((row) => (row as { raw_response: RawListing | null }).raw_response)
    .filter((raw): raw is RawListing => !!raw && typeof raw.listing_id === "number");
}

const WORKFLOW_FILE = "etsy-notion-sync.yml";

export async function dispatchEtsySyncWorkflow(): Promise<void> {
  const token = process.env.GITHUB_DISPATCH_TOKEN;
  if (!token) {
    throw new Error("GITHUB_DISPATCH_TOKEN must be set");
  }
  const repo = process.env.ETSY_SYNC_REPO ?? "beckharrisdesign/experiment-hub";
  const response = await fetch(
    `https://api.github.com/repos/${repo}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({ ref: "main" }),
    },
  );
  // GitHub returns 204 No Content on a successful dispatch.
  if (response.status !== 204) {
    const text = await response.text();
    throw new Error(
      `Workflow dispatch failed (${response.status}): ${text.slice(0, 300)}`,
    );
  }
}
