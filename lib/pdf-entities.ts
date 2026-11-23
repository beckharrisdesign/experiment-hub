/**
 * People and organisations for AI suggestions, from the Notion Entities database.
 * openspec/changes/pdf-metadata-viewer-cloud — task 6.5; design.md "port across
 * essentially unchanged". Ported from the v1 prototype's `lib/entities-notion.js`.
 *
 * What changed in the port: the on-disk snapshot is gone (serverless has no
 * disk), so a Notion failure is cache-or-error, which is acceptable when the
 * operator can retry. The allowlist, the projection and the shaping are as v1.
 */
import { Client } from "@notionhq/client";
import { hasNotionAuth, resolveNotionToken } from "@experiment-hub/notion-auth";

const CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * The ONLY properties ever read out of Notion.
 *
 * The Entities database also carries Account Number, Address, Phone and Email.
 * Those must never be fetched: this data is put into the OpenAI prompt, so
 * anything read here leaves the server. Widening this list means shipping
 * household account numbers to a third-party API. Don't.
 */
export const ALLOWED_PROPERTIES = Object.freeze([
  "Slug",
  "Name",
  "Aliases",
  "Kind",
  "Relationship",
  "Category",
  "Status",
  "Location",
] as const);

export const DENIED_PROPERTIES = Object.freeze([
  "Account Number",
  "Address",
  "Phone",
  "Email",
  "Website",
  "Notes",
  "Log",
  "Tasks",
  "Projects",
  "Next Date",
  "Last Touch",
] as const);

type AllowedProperty = (typeof ALLOWED_PROPERTIES)[number];

interface NotionText {
  title?: Array<{ plain_text: string }>;
  rich_text?: Array<{ plain_text: string }>;
  select?: { name: string } | null;
  multi_select?: Array<{ name: string }>;
}

export interface NotionPage {
  properties?: Record<string, unknown>;
}

export interface Entity {
  slug: string;
  name: string;
  aliases: string[];
  kind: string;
  relationship: string;
  categories: string[];
  status: string;
  location: string;
}

export interface NamedSlug {
  name: string;
  slug: string;
  aliases: string[];
}

export interface Entities {
  people: string[];
  peopleWithNames: NamedSlug[];
  vendors: string[];
  vendorsWithNames: NamedSlug[];
  locations: string[];
  fetchedAt: string;
}

function plainText(property: NotionText | undefined): string {
  if (!property) return "";
  const runs = property.title ?? property.rich_text;
  if (!Array.isArray(runs)) return "";
  return runs.map((run) => run.plain_text).join("").trim();
}

function selectName(property: NotionText | undefined): string {
  return property?.select?.name ?? "";
}

function multiSelectNames(property: NotionText | undefined): string[] {
  if (!Array.isArray(property?.multi_select)) return [];
  return property.multi_select.map((option) => option.name);
}

/**
 * Reduce a Notion page to the allowlisted fields. Reads only ALLOWED_PROPERTIES
 * by name — properties absent from that list are never touched, so new columns
 * added in Notion cannot leak in by default.
 */
export function projectEntity(page: NotionPage): Entity | null {
  const props = (page.properties ?? {}) as Record<string, NotionText>;
  const pick = (name: AllowedProperty) =>
    (ALLOWED_PROPERTIES as readonly string[]).includes(name) ? props[name] : undefined;

  const slug = plainText(pick("Slug"));
  if (!slug) return null;

  return {
    slug,
    name: plainText(pick("Name")) || slug,
    // Aliases are hand-entered and mixed: most rows separate with semicolons,
    // a few with commas, and ampersands appear inside business names rather
    // than between them. Split on ; , and newlines only.
    aliases: plainText(pick("Aliases"))
      .split(/[;,\n]/)
      .map((alias) => alias.trim())
      .filter(Boolean),
    kind: selectName(pick("Kind")),
    relationship: selectName(pick("Relationship")),
    categories: multiSelectNames(pick("Category")),
    status: selectName(pick("Status")),
    location: selectName(pick("Location")),
  };
}

/**
 * Shape the flat entity list into what the taxonomy and the prompt expect.
 * Former entities are excluded from suggestions but still contribute locations.
 */
export function shapeEntities(entities: Entity[]): Entities {
  const active = entities.filter((entity) => entity.status !== "Former");
  const people = active.filter((entity) => entity.kind === "Person");
  const organizations = active.filter((entity) => entity.kind === "Organization");
  const locations = [...new Set(entities.map((entity) => entity.location).filter(Boolean))].sort();
  const named = (entity: Entity): NamedSlug => ({
    name: entity.name,
    slug: entity.slug,
    aliases: entity.aliases,
  });

  return {
    people: people.map((entity) => entity.slug),
    peopleWithNames: people.map(named),
    vendors: organizations.map((entity) => entity.slug),
    vendorsWithNames: organizations.map(named),
    locations,
    fetchedAt: new Date().toISOString(),
  };
}

/** Notion is not set up here, so there are no people or organisations to match. */
export class EntitiesUnavailable extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EntitiesUnavailable";
  }
}

let cache: Entities | null = null;
let cachedAt = 0;

type QueryDataSource = (args: {
  data_source_id: string;
  page_size: number;
  start_cursor?: string;
}) => Promise<{ results: NotionPage[]; has_more: boolean; next_cursor: string | null }>;

async function queryAll(query: QueryDataSource, dataSourceId: string): Promise<Entity[]> {
  const entities: Entity[] = [];
  let cursor: string | undefined;
  do {
    const response = await query({
      data_source_id: dataSourceId,
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    });
    for (const page of response.results) {
      const entity = projectEntity(page);
      if (entity) entities.push(entity);
    }
    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
  } while (cursor);
  return entities;
}

/**
 * Load entities: in-memory cache, else Notion. Errors propagate rather than
 * degrading to an empty list — an empty list would silently produce suggestions
 * with no person or vendor tags, which reads as a bad model rather than a broken
 * integration.
 */
export async function loadEntities({ force = false }: { force?: boolean } = {}): Promise<Entities> {
  if (!force && cache && Date.now() - cachedAt < CACHE_TTL_MS) return cache;

  const dataSourceId = process.env.NOTION_ENTITIES_DATA_SOURCE_ID;
  if (!dataSourceId || !hasNotionAuth()) {
    const missing = [
      dataSourceId ? null : "NOTION_ENTITIES_DATA_SOURCE_ID",
      hasNotionAuth() ? null : "NOTION_TOKEN",
    ]
      .filter(Boolean)
      .join(" and ");
    throw new EntitiesUnavailable(`Notion is not configured (missing ${missing})`);
  }

  const notion = new Client({ auth: await resolveNotionToken() });
  const query = notion.dataSources.query.bind(notion.dataSources) as unknown as QueryDataSource;
  const shaped = shapeEntities(await queryAll(query, dataSourceId));
  cache = shaped;
  cachedAt = Date.now();
  return shaped;
}

export function clearEntityCache(): void {
  cache = null;
  cachedAt = 0;
}
