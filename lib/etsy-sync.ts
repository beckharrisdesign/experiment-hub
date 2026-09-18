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

interface LatestSnapshotRow {
  raw_response: RawListing | null;
  captured_at: string | null;
}

/**
 * Per-server-instance cache, same posture as `app/etsy-listing-kit/api/evaluate/route.ts`'s
 * cache/throttle: `/keyword-explorer` is `force-dynamic` (design.md § Decisions
 * — Targeting must reflect the current tags on every request), so every
 * anonymous page load would otherwise trigger its own service-role Supabase
 * read with no guard against a crawler or a burst of refreshes. A short TTL
 * keeps that load bounded without meaningfully compromising "current" —
 * listing tags don't change on a sub-minute cadence, and this is still far
 * fresher than the corpus's own `ingest-pulls.py --apply` cadence. On
 * serverless this is per-warm-instance, not a global guarantee — acceptable
 * insurance, same caveat as the precedent it follows.
 *
 * `inFlight` coalesces concurrent callers onto the same read: the cache is
 * only populated *after* an awaited Supabase call completes, so without this,
 * every request that lands while the first read is still in flight (the
 * exact burst this cache exists to absorb) would see no cache yet and start
 * its own duplicate query, defeating the TTL for the case that matters most.
 */
const SNAPSHOT_CACHE_TTL_MS = 60 * 1000;
let snapshotCache: { at: number; result: RawListing[] } | null = null;
let snapshotFetchInFlight: Promise<RawListing[]> | null = null;

/** Test-only: clears the cache and any in-flight read so each test exercises a real one. */
export function resetLatestListingSnapshotsCacheForTests(): void {
  snapshotCache = null;
  snapshotFetchInFlight = null;
}

/**
 * Latest snapshot per listing, as raw Etsy JSON — restricted to the most
 * recent capture run.
 *
 * Reads `etsy_latest_listing_snapshots` (the view already exposes
 * `raw_response` and `captured_at`; only the Python client narrows its
 * select to `parsed`). That view is "newest row per listing across all
 * history" and has no idea whether a listing still exists on Etsy — a
 * listing deleted there keeps its final snapshot in the view forever. Rows
 * whose `captured_at` isn't the newest in the batch are dropped here: that
 * means "not in the latest capture" (deleted, deactivated, or a partial
 * capture run), the same rule and reasoning as
 * `experiments/etsy-notion-sync/prototype/store_supabase.py`'s
 * `latest_from_current_capture`, kept consistent across the Python and TS
 * sides of this pipeline rather than diverging.
 *
 * Server-only — the service-role key is required and `raw_response` may carry
 * `user`/buyer fields via the `User` include, so callers must project to
 * scores before sending anything to the browser.
 */
export async function getLatestListingSnapshots(): Promise<RawListing[]> {
  if (snapshotCache && Date.now() - snapshotCache.at < SNAPSHOT_CACHE_TTL_MS) {
    return snapshotCache.result;
  }
  if (snapshotFetchInFlight) {
    return snapshotFetchInFlight;
  }

  snapshotFetchInFlight = (async () => {
    try {
      const { data, error } = await getServiceClient()
        .from("etsy_latest_listing_snapshots")
        .select("raw_response,captured_at")
        .eq("endpoint", LISTINGS_ENDPOINT);
      if (error) {
        throw new Error(
          `Failed to load etsy listing snapshots: ${error.message}`,
        );
      }
      const rows = (data ?? []) as LatestSnapshotRow[];
      const newest = rows.reduce<string | null>((max, row) => {
        if (!row.captured_at) return max;
        return !max || row.captured_at > max ? row.captured_at : max;
      }, null);
      // If every row's captured_at is null (or there are no rows at all),
      // newest stays null — and `row.captured_at === newest` would then
      // match every null-timestamp row, passing all of them through as
      // "current" instead of none. An all-null batch means the capture can't
      // be identified as latest, so it must resolve to no rows, not to all
      // rows.
      if (newest === null) {
        snapshotCache = { at: Date.now(), result: [] };
        return [];
      }
      const result = rows
        .filter((row) => row.captured_at === newest)
        .map((row) => row.raw_response)
        .filter(
          (raw): raw is RawListing =>
            !!raw && typeof raw.listing_id === "number",
        );
      snapshotCache = { at: Date.now(), result };
      return result;
    } finally {
      // Cleared whether the read succeeded or threw: a failure must not
      // leave later callers permanently coalesced onto a dead promise, and
      // must not be cached either (see the failure-mode tests) — the next
      // call, concurrent or not, gets a real retry.
      snapshotFetchInFlight = null;
    }
  })();
  return snapshotFetchInFlight;
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
