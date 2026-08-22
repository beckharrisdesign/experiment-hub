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
 *   Date        date       — start orders the log; an optional end date turns
 *                            the display into a span (see formatDateSpan).
 *                            No end date renders month-level, which keeps
 *                            generator-written monthly entries unchanged.
 *   Experiment  relation   — page-id array pointing at BHD Labs Projects rows
 *   Approved    checkbox    — unchecked rows never render publicly
 *   Receipt URL url        — optional; rendered as a small receipt link
 *                            (un-deferred 2026-07-22 at Katy's request)
 *   Source      rich_text   — optional generator provenance
 */
import { getUncachableNotionClient } from "@/lib/notion";
import { hasNotionAuth } from "@experiment-hub/notion-auth";
import { getExperimentPageIdFromNotion } from "@/lib/notion-experiments";

type NotionProperty = Record<string, any>;
type NotionPage = {
  id: string;
  properties?: Record<string, NotionProperty>;
};

/** One styled fragment of a source line. */
export interface SourceSpan {
  text: string;
  bold: boolean;
  code: boolean;
  href: string | null;
}

/** One line of an entry's source log (a paragraph from the Notion page body). */
export type SourceLine = SourceSpan[];

/** One approved milestone, ready to render. */
export interface HistoryEntry {
  /** Notion page id of the entry — the key for fetching its body. */
  id: string;
  /** Raw ISO date from Notion (`Date.start`), retained for stable sorting. */
  date: string;
  /** Display date at its natural grain, e.g. "Mar 9, 2026", "Mar 10–30, 2026", "Apr–Jun 2026", "Apr 2026". */
  when: string;
  /** The one-sentence milestone. */
  milestone: string;
  /** Optional provenance link (usually a GitHub commit/PR); null when unset. */
  receiptUrl: string | null;
  /**
   * The entry's source log — the page body paragraphs (gh/supabase/notion/Katy
   * voices with their links), rendered under the milestone. Empty when the
   * entry has no body or the body fetch failed.
   */
  sources: SourceLine[];
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

/** Parsed calendar parts of an ISO date, or null when unparseable. */
function parseIsoParts(
  iso: string | undefined | null,
): { year: number; monthIndex: number; day: number } | null {
  if (!iso) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return null;
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  if (monthIndex < 0 || monthIndex > 11 || day < 1 || day > 31) return null;
  return { year: Number(match[1]), monthIndex, day };
}

/**
 * Formats a date (or date range) at its natural grain. Decided 2026-08-22:
 * month-only display was the accumulation generator's convenience leaking
 * into hand-authored narratives — a one-day launch should read as one day.
 *
 *   start only              → "Mar 2026"        (month-wide; generator entries)
 *   end === start           → "Mar 9, 2026"     (a single day, shown as one)
 *   same month              → "Mar 10–30, 2026"
 *   same year               → "Apr–Jun 2026"
 *   across years            → "Jul 2024–Mar 2026"
 *
 * Returns null for an unparseable start so callers skip the entry. An
 * unparseable or out-of-order end degrades to the start's month rather than
 * dropping an otherwise-valid entry.
 */
export function formatDateSpan(
  start: string | undefined | null,
  end: string | undefined | null,
): string | null {
  const s = parseIsoParts(start);
  if (!s) return formatMonthYear(start);
  const e = parseIsoParts(end);
  if (!e || end! < start!) return formatMonthYear(start);
  if (s.year === e.year && s.monthIndex === e.monthIndex) {
    if (s.day === e.day) return `${MONTHS[s.monthIndex]} ${s.day}, ${s.year}`;
    return `${MONTHS[s.monthIndex]} ${s.day}–${e.day}, ${s.year}`;
  }
  if (s.year === e.year) {
    return `${MONTHS[s.monthIndex]}–${MONTHS[e.monthIndex]} ${s.year}`;
  }
  return `${MONTHS[s.monthIndex]} ${s.year}–${MONTHS[e.monthIndex]} ${e.year}`;
}

interface RawHistoryRow {
  id: string;
  date: string;
  endDate: string | null;
  milestone: string;
  approved: boolean;
  experimentIds: string[];
  receiptUrl: string | null;
}

/**
 * Maps Notion block-children results to source lines: paragraph blocks only,
 * each rich-text fragment carrying its bold/code annotation and link; empty
 * paragraphs dropped. Pure — exported for tests.
 */
export function mapBodyBlocks(blocks: any[]): SourceLine[] {
  return blocks
    .filter((b) => b?.type === "paragraph")
    .map((b): SourceLine =>
      (b.paragraph?.rich_text ?? [])
        .map((rt: any): SourceSpan => ({
          text: rt?.plain_text ?? "",
          bold: rt?.annotations?.bold === true,
          code: rt?.annotations?.code === true,
          href: typeof rt?.href === "string" && rt.href !== "" ? rt.href : null,
        }))
        .filter((span: SourceSpan) => span.text !== ""),
    )
    .filter((line) => line.length > 0);
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
  const endDate = props["Date"]?.date?.end;
  return {
    id: page.id,
    date: props["Date"]?.date?.start ?? "",
    endDate: typeof endDate === "string" && endDate !== "" ? endDate : null,
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
      const when = formatDateSpan(row.date, row.endDate);
      return when
        ? {
            id: row.id,
            date: row.date,
            when,
            milestone: row.milestone,
            receiptUrl: row.receiptUrl,
            sources: [] as SourceLine[],
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
let bodyCache = new Map<string, { lines: SourceLine[]; fetchedAt: number }>();

/** Exported for tests. */
export function clearNotionHistoryCache() {
  cache = null;
  bodyCache = new Map();
}

/**
 * The source log from one entry's page body, cached on the same TTL as rows.
 * A failed fetch yields [] — a missing source log must never take down the
 * page's History band.
 */
async function getEntrySources(pageId: string): Promise<SourceLine[]> {
  const cached = bodyCache.get(pageId);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.lines;
  }
  try {
    const notion = await getUncachableNotionClient();
    const blocks: any[] = [];
    let cursor: string | undefined;
    do {
      const response: any = await notion.blocks.children.list({
        block_id: pageId,
        ...(cursor ? { start_cursor: cursor } : {}),
      });
      blocks.push(...(response.results ?? []));
      cursor = response.has_more ? response.next_cursor : undefined;
    } while (cursor);
    const lines = mapBodyBlocks(blocks);
    bodyCache.set(pageId, { lines, fetchedAt: Date.now() });
    return lines;
  } catch {
    return [];
  }
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
  const entries = selectApprovedEntries(rows, experimentPageId);
  return Promise.all(
    entries.map(async (entry) => ({
      ...entry,
      sources: await getEntrySources(entry.id),
    })),
  );
}
