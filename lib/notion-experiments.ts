/**
 * Lightweight Notion adapter for the "BHD Labs Projects" database.
 *
 * Reads experiment rows from a Notion data source and maps them onto the
 * hub's `Experiment` type. This is a read-only alternative to the Supabase
 * `experiments` table — prototypes, documentation, notes, and PR sync stay
 * on their existing sources.
 *
 * Setup:
 *   1. Create an internal integration at notion.so/profile/integrations
 *   2. Share the database with the integration
 *   3. Set NOTION_TOKEN and NOTION_EXPERIMENTS_DATA_SOURCE_ID
 *      (on Replit, the connector supplies auth and NOTION_TOKEN can be omitted)
 */
import { getUncachableNotionClient } from "@/lib/notion";
import type {
  Experiment,
  ExperimentKind,
  ExperimentScores,
  ExperimentStatus,
} from "@/types";

// Mirrors the auth paths of getUncachableNotionClient: an explicit token, or
// the Replit connector (hostname + repl/depl identity).
function hasNotionAuth(): boolean {
  return !!(
    process.env.NOTION_TOKEN ||
    (process.env.REPLIT_CONNECTORS_HOSTNAME &&
      (process.env.REPL_IDENTITY || process.env.WEB_REPL_RENEWAL))
  );
}

export function hasNotionExperiments(): boolean {
  return !!(hasNotionAuth() && process.env.NOTION_EXPERIMENTS_DATA_SOURCE_ID);
}

// ---------------------------------------------------------------------------
// Property extraction — Notion property objects vary by type
// ---------------------------------------------------------------------------

type NotionProperty = Record<string, any>;
type NotionPage = {
  id: string;
  created_time?: string;
  last_edited_time?: string;
  properties?: Record<string, NotionProperty>;
};

function richTextToPlain(prop: NotionProperty | undefined): string {
  const fragments = prop?.title ?? prop?.rich_text;
  if (!Array.isArray(fragments)) return "";
  return fragments
    .map((f: { plain_text?: string }) => f.plain_text ?? "")
    .join("")
    .trim();
}

function selectName(prop: NotionProperty | undefined): string {
  return prop?.select?.name ?? prop?.status?.name ?? "";
}

function numberValue(prop: NotionProperty | undefined): number | null {
  return typeof prop?.number === "number" ? prop.number : null;
}

// ---------------------------------------------------------------------------
// Notion → hub vocabulary maps
// ---------------------------------------------------------------------------

// Notion tracks lifecycle phases; the hub tracks activity states. Anything
// pre-launch counts as Active so it shows up on the board.
const STATUS_MAP: Record<string, ExperimentStatus> = {
  Ideation: "Active",
  Discovery: "Active",
  "Business Case": "Active",
  PRD: "Active",
  Validating: "Active",
  Launched: "Completed",
  Graduated: "Graduated",
};

const TYPE_MAP: Record<string, ExperimentKind> = {
  "R+D": "personal",
  Tool: "tool",
  Business: "commercial",
};

function mapScores(
  properties: Record<string, NotionProperty>,
): ExperimentScores | undefined {
  const b = numberValue(properties["Score:B"]);
  const p = numberValue(properties["Score:P"]);
  const c = numberValue(properties["Score:C"]);
  const d = numberValue(properties["Score:D"]);
  const s = numberValue(properties["Score:S"]);
  // ExperimentScores requires all five dimensions; partial rows stay unscored.
  if (b === null || p === null || c === null || d === null || s === null) {
    return undefined;
  }
  return {
    businessOpportunity: b,
    personalImpact: p,
    competitiveAdvantage: c,
    platformCost: d,
    socialImpact: s,
  };
}

/** Exported for tests. Returns null for rows without a Slug (untitled rows). */
export function mapNotionPageToExperiment(page: NotionPage): Experiment | null {
  const properties = page.properties ?? {};
  const slug = richTextToPlain(properties["Slug"]);
  if (!slug) return null;

  const name = richTextToPlain(properties["Name"]) || slug;
  const statement =
    richTextToPlain(properties["Tagline"]) ||
    richTextToPlain(properties["Exec Summary"]);
  const type = TYPE_MAP[selectName(properties["Type"])];

  return {
    id: slug,
    name,
    statement,
    ...(type ? { type } : {}),
    directory: `experiments/${slug}`,
    documentationId: "",
    prototypeId: "",
    status: STATUS_MAP[selectName(properties["Status"])] ?? "Active",
    createdDate: page.created_time ?? "",
    lastModified: page.last_edited_time ?? page.created_time ?? "",
    tags: [],
    scores: mapScores(properties),
  };
}

// ---------------------------------------------------------------------------
// Fetching with a short in-memory TTL cache
// ---------------------------------------------------------------------------

// Pages are force-dynamic and Notion's API is slow (~300-600ms) and
// rate-limited (~3 req/s), so cache the full list briefly per server
// instance. Edits in Notion appear within CACHE_TTL_MS.
const CACHE_TTL_MS = 60_000;

let cache: { experiments: Experiment[]; fetchedAt: number } | null = null;

/** Exported for tests. */
export function clearNotionExperimentsCache() {
  cache = null;
}

async function fetchAllPages(): Promise<NotionPage[]> {
  const dataSourceId = process.env.NOTION_EXPERIMENTS_DATA_SOURCE_ID;
  if (!dataSourceId) {
    throw new Error(
      "NOTION_EXPERIMENTS_DATA_SOURCE_ID is not set; cannot query Notion experiments.",
    );
  }
  const notion = await getUncachableNotionClient();
  const pages: NotionPage[] = [];
  let cursor: string | undefined;

  do {
    const response: any = await notion.dataSources.query({
      data_source_id: dataSourceId,
      ...(cursor ? { start_cursor: cursor } : {}),
    });
    pages.push(...(response.results ?? []));
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);

  return pages;
}

export async function getExperimentsFromNotion(): Promise<Experiment[]> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.experiments;
  }

  const pages = await fetchAllPages();
  const experiments = pages
    .map(mapNotionPageToExperiment)
    .filter((exp): exp is Experiment => exp !== null)
    .sort((a, b) => b.lastModified.localeCompare(a.lastModified));

  cache = { experiments, fetchedAt: Date.now() };
  return experiments;
}

export async function getExperimentBySlugFromNotion(
  slug: string,
): Promise<Experiment | null> {
  const experiments = await getExperimentsFromNotion();
  return experiments.find((exp) => exp.id === slug) ?? null;
}
