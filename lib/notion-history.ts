/**
 * Read-only Notion adapter for the "BHD Labs History" database.
 *
 * Each row is one dated milestone belonging to an experiment, related to the
 * "BHD Labs Projects" database by the `Experiment` relation. The hub reads
 * approved rows only and renders them as the History band on the public
 * detail page. This module NEVER writes — accumulation lives in a separate
 * repo-local script (scripts/), not in the hub app.
 *
 * Setup:
 *   1. Share the "BHD Labs History" database with the hub's Notion integration
 *      (integrations are granted per-page; a new DB is invisible until shared).
 *   2. Set NOTION_HISTORY_DATA_SOURCE_ID.
 *
 * Storage shape (decided 2026-07-21): a related database, not row properties
 * or child blocks — only a per-row `Approved` checkbox satisfies the spec's
 * per-entry approval gate cleanly. Property types (REST API names):
 *   Milestone   title      — the one-sentence entry
 *   Date        date       — month-level; the day is ignored on render
 *   Experiment  relation   — page-id array pointing at BHD Labs Projects rows
 *   Approved    checkbox    — unchecked rows never render publicly
 *   Receipt URL url        — optional; rendered as a small receipt link
 *                            (un-deferred 2026-07-22 at Katy's request)
 *   Source      rich_text   — optional generator provenance
 */
import { getUncachableNotionClient } from "@/lib/notion";
import { getExperimentPageIdFromNotion } from "@/lib/notion-experiments";

type NotionProperty = Record<string, any>;
type NotionPage = {
  id: string;
  properties?: Record<string, NotionProperty>;
};

/** One approved milestone, ready to render. */
export interface HistoryEntry {
  /** Raw ISO date from Notion (`Date.start`), retained for stable sorting. */
  date: string;
  /** Month-level display date, e.g. "Mar 2026". */
  month: string;
  /** The one-sentence milestone. */
  milestone: string;
  /** Optional provenance link (usually a GitHub commit/PR); null when unset. */
  receiptUrl: string | null;
}

/** Mirrors notion-experiments' auth check. */
function hasNotionAuth(): boolean {
  return !!(
    process.env.NOTION_TOKEN ||
    (process.env.REPLIT_CONNECTORS_HOSTNAME &&
      (process.env.REPL_IDENTITY || process.env.WEB_REPL_RENEWAL))
  );
}

export function hasNotionHistory(): boolean {
  // The experiments data source is also required: getHistoryForExperiment
  // resolves slug -> experiment page id through the experiments adapter, so
  // without it every request would fetch history, fail to resolve, and log.
  // Gating on both keeps a half-configured deploy quiet instead of noisy.
  return !!(
    hasNotionAuth() &&
    process.env.NOTION_HISTORY_DATA_SOURCE_ID &&
    process.env.NOTION_EXPERIMENTS_DATA_SOURCE_ID
  );
}

// ---------------------------------------------------------------------------
// Pure helpers (exported for tests — no Notion client involved)
// ---------------------------------------------------------------------------

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/**
 * Formats an ISO date string as "Mon YYYY" (month-level; the day is dropped).
 * Returns null for a missing or unparseable date so callers can skip the
 * entry rather than render "Invalid Date". Parses the year/month off the
 * string directly to stay timezone-agnostic — a "2026-03-01" date must read
 * as March regardless of the server's zone.
 */
export function formatMonthYear(iso: string | undefined | null): string | null {
  if (!iso) return null;
  const match = /^(\d{4})-(\d{2})/.exec(iso);
  if (!match) return null;
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) return null;
  return `${MONTHS[monthIndex]} ${year}`;
}

interface RawHistoryRow {
  date: string;
  milestone: string;
  approved: boolean;
  experimentIds: string[];
  receiptUrl: string | null;
}

/** Flattens a Notion history page to the fields this adapter needs. */
export function mapHistoryPage(page: NotionPage): RawHistoryRow {
  const props = page.properties ?? {};
  const titleFragments = props["Milestone"]?.title;
  const milestone = Array.isArray(titleFragments)
    ? titleFragments
        .map((f: { plain_text?: string }) => f.plain_text ?? "")
        .join("")
        .trim()
    : "";
  const relation = props["Experiment"]?.relation;
  const experimentIds = Array.isArray(relation)
    ? relation.map((r: { id?: string }) => r.id ?? "").filter(Boolean)
    : [];
  const receiptUrl = props["Receipt URL"]?.url;
  return {
    date: props["Date"]?.date?.start ?? "",
    milestone,
    approved: props["Approved"]?.checkbox === true,
    experimentIds,
    receiptUrl: typeof receiptUrl === "string" && receiptUrl !== "" ? receiptUrl : null,
  };
}

/**
 * The approved, renderable entries for one experiment page id, oldest first.
 * Drops rows that are unapproved, unrelated, empty, or carry an unparseable
 * date. Pure — this is where filtering/sorting/formatting is verified.
 */
export function selectApprovedEntries(
  rows: RawHistoryRow[],
  experimentPageId: string,
): HistoryEntry[] {
  return rows
    .filter(
      (row) =>
        row.approved &&
        row.milestone !== "" &&
        row.experimentIds.includes(experimentPageId),
    )
    .map((row) => {
      const month = formatMonthYear(row.date);
      return month
        ? {
            date: row.date,
            month,
            milestone: row.milestone,
            receiptUrl: row.receiptUrl,
          }
        : null;
    })
    .filter((entry): entry is HistoryEntry => entry !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ---------------------------------------------------------------------------
// Fetching with a short TTL cache (mirrors notion-experiments)
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 60_000;

let cache: { rows: RawHistoryRow[]; fetchedAt: number } | null = null;

/** Exported for tests. */
export function clearNotionHistoryCache() {
  cache = null;
}

async function fetchAllHistoryRows(): Promise<RawHistoryRow[]> {
  const dataSourceId = process.env.NOTION_HISTORY_DATA_SOURCE_ID;
  if (!dataSourceId) {
    throw new Error(
      "NOTION_HISTORY_DATA_SOURCE_ID is not set; cannot query Notion history.",
    );
  }
  const notion = await getUncachableNotionClient();
  const rows: RawHistoryRow[] = [];
  let cursor: string | undefined;

  do {
    const response: any = await notion.dataSources.query({
      data_source_id: dataSourceId,
      ...(cursor ? { start_cursor: cursor } : {}),
    });
    for (const page of response.results ?? []) {
      rows.push(mapHistoryPage(page));
    }
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);

  return rows;
}

async function getHistoryRows(): Promise<RawHistoryRow[]> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.rows;
  }
  const rows = await fetchAllHistoryRows();
  cache = { rows, fetchedAt: Date.now() };
  return rows;
}

/**
 * Approved History entries for `slug`, oldest first. Returns [] when the
 * experiment has no approved entries or no matching row. History relates to
 * experiments by Notion page id, not slug, so resolve the id first.
 */
export async function getHistoryForExperiment(
  slug: string,
): Promise<HistoryEntry[]> {
  const experimentPageId = await getExperimentPageIdFromNotion(slug);
  if (!experimentPageId) return [];
  const rows = await getHistoryRows();
  return selectApprovedEntries(rows, experimentPageId);
}
