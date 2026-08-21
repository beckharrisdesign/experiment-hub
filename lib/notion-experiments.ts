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
import { hasNotionAuth } from "@experiment-hub/notion-auth";
import type {
  Experiment,
  ExperimentKind,
  ExperimentScores,
  ExperimentStatus,
  ImpactRationale,
  ImpactScores,
} from "@/types";

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
// The `?? "Active"` fallback at the read site means any Notion status missing
// from this map renders as live work. That made the dead statuses below more
// than a gap: the moment "Archived" was added as a Notion option, an archived
// row would have appeared in the Active tab. They are mapped here so the
// vocabulary is complete before it is used.
const STATUS_MAP: Record<string, ExperimentStatus> = {
  Ideation: "Active",
  Discovery: "Active",
  "Business Case": "Active",
  PRD: "Active",
  Validating: "Active",
  Launched: "Completed",
  Graduated: "Graduated",
  "On Hold": "On Hold",
  Archived: "Archived",
  Abandoned: "Abandoned",
};

const TYPE_MAP: Record<string, ExperimentKind> = {
  "R+D": "personal",
  Tool: "tool",
  Business: "commercial",
};

// Reverse maps for the write path. Notion's Status is the richer vocabulary
// (five pre-launch phases collapse into hub "Active"), so only unambiguous
// hub statuses can be written back; Notion phase names are accepted as-is so
// callers can set a specific phase directly.
//
// The three dead statuses map 1:1 in both directions. They require the matching
// options to exist on the Notion Status property — Notion's API cannot create
// status options (only the UI can), so adding them is a manual step. Until it is
// done a write here fails at the API with an invalid-option error rather than
// silently writing the wrong phase, which is the safer failure.
const HUB_TO_NOTION_STATUS: Record<string, string> = {
  Completed: "Launched",
  Graduated: "Graduated",
  "On Hold": "On Hold",
  Archived: "Archived",
  Abandoned: "Abandoned",
};

const HUB_TO_NOTION_TYPE: Record<string, string> = {
  personal: "R+D",
  tool: "Tool",
  commercial: "Business",
};

/** Notion Status phase for a hub status or raw phase name; null if unwritable. */
export function toNotionStatus(status: string): string | null {
  // Object.hasOwn, not `in`/direct access: inherited keys like "toString"
  // must not pass validation or return prototype members.
  if (Object.hasOwn(STATUS_MAP, status)) return status;
  return Object.hasOwn(HUB_TO_NOTION_STATUS, status)
    ? HUB_TO_NOTION_STATUS[status]
    : null;
}

/** Notion Type option for a hub ExperimentKind; null if unknown. */
export function toNotionType(type: string): string | null {
  return Object.hasOwn(HUB_TO_NOTION_TYPE, type)
    ? HUB_TO_NOTION_TYPE[type]
    : null;
}

/**
 * v3 impact score columns on the Labs database and the conventional titles of
 * the per-dimension justification child pages. These names are the contract
 * between Notion and the hub — renaming a column or a `Why:` page silently
 * drops the score/tab, so tests pin them.
 */
export const IMPACT_SCORE_COLUMNS = {
  personal: "Score:PI",
  social: "Score:SI",
  business: "Score:BI",
} as const;

export const IMPACT_WHY_PAGE_TITLES = {
  personal: "Why: Personal",
  social: "Why: Social",
  business: "Why: Business",
} as const;

export type ImpactDimension = keyof typeof IMPACT_SCORE_COLUMNS;

function mapImpactScores(
  properties: Record<string, NotionProperty>,
): ImpactScores | undefined {
  const personal = numberValue(properties[IMPACT_SCORE_COLUMNS.personal]);
  const social = numberValue(properties[IMPACT_SCORE_COLUMNS.social]);
  const business = numberValue(properties[IMPACT_SCORE_COLUMNS.business]);
  // All three or nothing; partial rows must not fabricate a profile.
  if (personal === null || social === null || business === null) {
    return undefined;
  }
  return { personal, social, business };
}

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

/**
 * Exported for tests. Returns null for rows without a slug.
 * The slug lives in the `repo` text property ("Slug" is accepted as a legacy
 * fallback from the pre-rename schema); `Name` is the title property.
 */
export function mapNotionPageToExperiment(page: NotionPage): Experiment | null {
  const properties = page.properties ?? {};
  const slug =
    richTextToPlain(properties["repo"]) || richTextToPlain(properties["Slug"]);
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
    impactScores: mapImpactScores(properties),
    // Notion `Public` is a checkbox; an unset box reads as false, so rows are
    // private-by-default and only an explicitly-checked row renders publicly.
    public: properties["Public"]?.checkbox === true,
  };
}

// ---------------------------------------------------------------------------
// Full-row field extraction for the experiment detail page
// ---------------------------------------------------------------------------

export interface ExperimentField {
  label: string;
  value: string;
}

/** Flattens any Notion property value to a display string; "" when empty. */
export function formatNotionProperty(prop: NotionProperty): string {
  if (prop.title || prop.rich_text) return richTextToPlain(prop);
  if (prop.select || prop.status) return selectName(prop);
  if (Array.isArray(prop.multi_select)) {
    return prop.multi_select
      .map((option: { name?: string }) => option.name ?? "")
      .filter(Boolean)
      .join(", ");
  }
  if (typeof prop.number === "number") return String(prop.number);
  if (typeof prop.checkbox === "boolean") return prop.checkbox ? "Yes" : "No";
  if (prop.date?.start) {
    return prop.date.end
      ? `${prop.date.start} → ${prop.date.end}`
      : prop.date.start;
  }
  if (typeof prop.url === "string") return prop.url;
  if (typeof prop.email === "string") return prop.email;
  if (typeof prop.phone_number === "string") return prop.phone_number;
  if (Array.isArray(prop.people)) {
    return prop.people
      .map((person: { name?: string }) => person.name ?? "")
      .filter(Boolean)
      .join(", ");
  }
  if (typeof prop.created_time === "string") return prop.created_time;
  if (typeof prop.last_edited_time === "string") return prop.last_edited_time;
  if (prop.formula) return formatNotionProperty(prop.formula);
  if (typeof prop.string === "string") return prop.string;
  if (typeof prop.boolean === "boolean") return prop.boolean ? "Yes" : "No";
  return "";
}

/**
 * The ONLY Notion properties allowed to render on a public experiment detail
 * page, in display order. Everything else — bookkeeping (`Last edited time`,
 * `Name Alt`, `Public`), scores, tags, slug, dates — never reaches a public
 * route. `Status` is intentionally absent: it renders as a hero chip, not a
 * narrative row. This allowlist is the single source of truth for what a
 * detail page may show; adding a Notion column does not surface it publicly
 * unless it is added here.
 */
export const PUBLIC_FIELD_ALLOWLIST = [
  "Why this matters",
  "Hypothesis",
  "Exec Summary",
] as const;

/**
 * The allowlisted narrative statements for `slug`, in `PUBLIC_FIELD_ALLOWLIST`
 * order, skipping any that are empty. Returns null when no row matches the
 * slug. Only these three fields are ever returned — no bookkeeping or scores.
 */
export async function getExperimentFieldsFromNotion(
  slug: string,
): Promise<ExperimentField[] | null> {
  await getExperimentsFromNotion();
  const page = cache?.pageBySlug[slug];
  if (!page) return null;

  const properties = page.properties ?? {};
  const fields: ExperimentField[] = [];
  for (const label of PUBLIC_FIELD_ALLOWLIST) {
    const prop = properties[label];
    const value = prop ? formatNotionProperty(prop) : "";
    if (value) fields.push({ label, value });
  }
  return fields;
}

// ---------------------------------------------------------------------------
// Impact justification `Why:` pages (v3 scoring)
// ---------------------------------------------------------------------------

type NotionBlock = Record<string, any>;

function blockRichText(block: NotionBlock, type: string): string {
  const fragments = block[type]?.rich_text;
  if (!Array.isArray(fragments)) return "";
  return fragments
    .map((f: { plain_text?: string }) => f.plain_text ?? "")
    .join("");
}

/**
 * Exported for tests. Renders a Notion block list to markdown-ish plain text.
 * Allowlist per design.md: paragraphs, headings 1-3, bulleted/numbered lists,
 * quotes, dividers. Unknown block types keep their plain text (or vanish when
 * they have none). Blocks are separated by blank lines so `whitespace-pre-wrap`
 * rendering preserves the structure.
 */
export function renderBlocksToText(blocks: NotionBlock[]): string {
  const out: string[] = [];
  for (const block of blocks) {
    const type = block.type as string;
    switch (type) {
      case "paragraph": {
        const text = blockRichText(block, type);
        if (text) out.push(text);
        break;
      }
      case "heading_1":
      case "heading_2":
      case "heading_3": {
        const text = blockRichText(block, type);
        if (text) out.push(`${"#".repeat(Number(type.slice(-1)))} ${text}`);
        break;
      }
      case "bulleted_list_item": {
        const text = blockRichText(block, type);
        if (text) out.push(`- ${text}`);
        break;
      }
      case "numbered_list_item": {
        const text = blockRichText(block, type);
        if (text) out.push(`1. ${text}`);
        break;
      }
      case "quote": {
        const text = blockRichText(block, type);
        if (text) out.push(`> ${text}`);
        break;
      }
      case "divider":
        out.push("---");
        break;
      default: {
        const text = type ? blockRichText(block, type) : "";
        if (text) out.push(text);
      }
    }
  }
  // Consecutive list items group without blank lines; everything else gets one.
  return out
    .map((line, i) => {
      const listy = /^(- |1\. )/;
      const prev = out[i - 1];
      if (i === 0) return line;
      return listy.test(line) && prev !== undefined && listy.test(prev)
        ? `\n${line}`
        : `\n\n${line}`;
    })
    .join("");
}

async function listAllBlocks(blockId: string): Promise<NotionBlock[]> {
  const notion = await getUncachableNotionClient();
  const blocks: NotionBlock[] = [];
  let cursor: string | undefined;
  do {
    const response: any = await notion.blocks.children.list({
      block_id: blockId,
      ...(cursor ? { start_cursor: cursor } : {}),
    });
    blocks.push(...(response.results ?? []));
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);
  return blocks;
}

// Same reasoning as the experiments cache: force-dynamic pages, slow
// rate-limited API. Justifications are one child-block listing plus one page
// fetch per existing `Why:` page.
let rationaleCache: Record<
  string,
  { value: ImpactRationale; fetchedAt: number }
> = {};

/** Exported for tests. */
export function clearImpactRationaleCache() {
  rationaleCache = {};
}

/**
 * The per-dimension justification content for `slug`, from the `Why:` child
 * pages of its Notion row. Dimensions without a page are absent. Returns {}
 * when the row has no matching child pages (every tab then shows its
 * empty-state note).
 */
export async function getImpactRationaleFromNotion(
  slug: string,
): Promise<ImpactRationale> {
  const cached = rationaleCache[slug];
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.value;
  }

  await getExperimentsFromNotion();
  const page = cache?.pageBySlug[slug];
  if (!page) return {};

  const children = await listAllBlocks(page.id);
  const value: ImpactRationale = {};
  for (const [dimension, title] of Object.entries(IMPACT_WHY_PAGE_TITLES)) {
    const childPage = children.find(
      (block) =>
        block.type === "child_page" && block.child_page?.title === title,
    );
    if (!childPage) continue;
    const text = renderBlocksToText(await listAllBlocks(childPage.id));
    if (text) value[dimension as ImpactDimension] = text;
  }

  rationaleCache[slug] = { value, fetchedAt: Date.now() };
  return value;
}

// ---------------------------------------------------------------------------
// Fetching with a short in-memory TTL cache
// ---------------------------------------------------------------------------

// Pages are force-dynamic and Notion's API is slow (~300-600ms) and
// rate-limited (~3 req/s), so cache the full list briefly per server
// instance. Edits in Notion appear within CACHE_TTL_MS.
const CACHE_TTL_MS = 60_000;

let cache: {
  experiments: Experiment[];
  pageBySlug: Record<string, NotionPage>;
  fetchedAt: number;
} | null = null;

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
  const pageBySlug: Record<string, NotionPage> = {};
  const experiments: Experiment[] = [];
  for (const page of pages) {
    const experiment = mapNotionPageToExperiment(page);
    if (!experiment) continue;
    experiments.push(experiment);
    pageBySlug[experiment.id] = page;
  }
  experiments.sort((a, b) => b.lastModified.localeCompare(a.lastModified));

  // A schema rename in Notion (e.g. the slug property changing name) makes
  // every row unmappable while the query still "succeeds", so the site goes
  // blank with no fallback and no error. Make that state visible.
  if (pages.length > 0 && experiments.length === 0) {
    console.warn(
      `[notion-experiments] Query returned ${pages.length} page(s) but none mapped to experiments — check that the data source still has "repo" (slug) and "Name" properties.`,
    );
  }

  cache = { experiments, pageBySlug, fetchedAt: Date.now() };
  return experiments;
}

export async function getExperimentBySlugFromNotion(
  slug: string,
): Promise<Experiment | null> {
  const experiments = await getExperimentsFromNotion();
  return experiments.find((exp) => exp.id === slug) ?? null;
}

/**
 * The Notion page id backing `slug`, or null. The `Experiment` relation in the
 * BHD Labs History database points at these ids, so the history adapter needs
 * this to match rows to an experiment. Reads the same cache as the list.
 */
export async function getExperimentPageIdFromNotion(
  slug: string,
): Promise<string | null> {
  await getExperimentsFromNotion();
  return cache?.pageBySlug[slug]?.id ?? null;
}

// ---------------------------------------------------------------------------
// Writing back to Notion
// ---------------------------------------------------------------------------

export interface NotionExperimentUpdate {
  name?: string;
  statement?: string;
  /** Hub status or raw Notion phase name; must pass toNotionStatus. */
  status?: string;
  /** Hub ExperimentKind; must pass toNotionType. */
  type?: string;
}

/**
 * Updates the Notion page for `slug` and returns the updated experiment.
 * Returns null when no row matches the slug, so callers can fall through to
 * Supabase for experiments that haven't been migrated to Notion yet.
 * Throws on unmappable status/type values — validate with toNotionStatus /
 * toNotionType first for a friendlier error.
 */
export async function updateExperimentInNotion(
  slug: string,
  fields: NotionExperimentUpdate,
): Promise<Experiment | null> {
  await getExperimentsFromNotion();
  const pageId = cache?.pageBySlug[slug]?.id;
  if (!pageId) return null;

  const properties: Record<string, NotionProperty> = {};
  if (fields.name !== undefined) {
    // Name is the database's title property, so it takes a title payload.
    properties["Name"] = { title: [{ text: { content: fields.name } }] };
  }
  if (fields.statement !== undefined) {
    properties["Tagline"] = {
      rich_text: [{ text: { content: fields.statement } }],
    };
  }
  if (fields.status !== undefined) {
    const phase = toNotionStatus(fields.status);
    if (!phase) {
      throw new Error(
        `Status "${fields.status}" has no Notion equivalent; edit the phase in Notion instead.`,
      );
    }
    properties["Status"] = { status: { name: phase } };
  }
  if (fields.type !== undefined) {
    const option = toNotionType(fields.type);
    if (!option) {
      throw new Error(`Unknown experiment type "${fields.type}".`);
    }
    properties["Type"] = { select: { name: option } };
  }

  if (Object.keys(properties).length === 0) {
    return getExperimentBySlugFromNotion(slug);
  }

  const notion = await getUncachableNotionClient();
  const updated = (await notion.pages.update({
    page_id: pageId,
    // Cast at the SDK boundary: its property-request union is stricter than
    // the adapter's generic NotionProperty map, but these payloads match the
    // schema's property types (title / rich_text / status / select).
    properties: properties as Parameters<
      typeof notion.pages.update
    >[0]["properties"],
  })) as NotionPage;
  clearNotionExperimentsCache();
  return (
    mapNotionPageToExperiment(updated) ?? getExperimentBySlugFromNotion(slug)
  );
}
