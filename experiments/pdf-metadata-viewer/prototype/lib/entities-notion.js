import { Client } from '@notionhq/client';
import { readFile, writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// On-disk fallback so the app still works offline and so a Notion outage can't
// break metadata editing. Gitignored — it mirrors personal entity data.
const SNAPSHOT_FILE = join(__dirname, '..', '.entities-snapshot.json');

const CACHE_TTL_MS = 10 * 60 * 1000;

// The ONLY properties ever read out of Notion.
//
// The Entities database also carries Account Number, Address, Phone, and Email.
// Those must never be fetched: this data is interpolated into the OpenAI Vision
// prompt in server.js, so anything read here leaves the machine. Widening this
// list means shipping household account numbers to a third-party API. Don't.
const ALLOWED_PROPERTIES = Object.freeze([
  'Slug',
  'Name',
  'Aliases',
  'Kind',
  'Relationship',
  'Category',
  'Status',
  'Location'
]);

const DENIED_PROPERTIES = Object.freeze([
  'Account Number',
  'Address',
  'Phone',
  'Email',
  'Website',
  'Notes',
  'Log',
  'Tasks',
  'Projects',
  'Next Date',
  'Last Touch'
]);

let cache = null;
let cachedAt = 0;

function plainText(property) {
  if (!property) return '';
  const runs = property.title || property.rich_text;
  if (!Array.isArray(runs)) return '';
  return runs.map(run => run.plain_text).join('').trim();
}

function selectName(property) {
  return property?.select?.name || '';
}

function multiSelectNames(property) {
  if (!Array.isArray(property?.multi_select)) return [];
  return property.multi_select.map(option => option.name);
}

/**
 * Reduce a Notion page to the allowlisted fields. Reads only ALLOWED_PROPERTIES
 * by name — properties absent from that list are never touched, so new columns
 * added in Notion cannot leak in by default.
 */
export function projectEntity(page) {
  const props = page.properties || {};
  const pick = name => (ALLOWED_PROPERTIES.includes(name) ? props[name] : undefined);

  const slug = plainText(pick('Slug'));
  if (!slug) return null;

  return {
    slug,
    name: plainText(pick('Name')) || slug,
    // Aliases are hand-entered and mixed: most rows separate with semicolons,
    // a few with commas, and ampersands appear inside business names rather
    // than between them. Split on ; , and newlines only.
    aliases: plainText(pick('Aliases'))
      .split(/[;,\n]/)
      .map(alias => alias.trim())
      .filter(Boolean),
    kind: selectName(pick('Kind')),
    relationship: selectName(pick('Relationship')),
    categories: multiSelectNames(pick('Category')),
    status: selectName(pick('Status')),
    location: selectName(pick('Location'))
  };
}

async function queryAllPages(notion, dataSourceId) {
  const entities = [];
  let cursor;

  do {
    const response = await notion.dataSources.query({
      data_source_id: dataSourceId,
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {})
    });

    for (const page of response.results) {
      const entity = projectEntity(page);
      if (entity) entities.push(entity);
    }

    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);

  return entities;
}

/**
 * Shape the flat entity list into the structure the taxonomy loader and the
 * AI prompt expect. Former entities are excluded from suggestions but their
 * slugs stay resolvable, so historical tags on old documents still read back.
 */
export function shapeEntities(entities) {
  const active = entities.filter(entity => entity.status !== 'Former');

  const people = active.filter(entity => entity.kind === 'Person');
  const organizations = active.filter(entity => entity.kind === 'Organization');

  const locations = [...new Set(entities.map(entity => entity.location).filter(Boolean))].sort();

  return {
    people: people.map(entity => entity.slug),
    peopleWithNames: people.map(entity => ({
      name: entity.name,
      slug: entity.slug,
      aliases: entity.aliases
    })),
    vendors: organizations.map(entity => entity.slug),
    vendorsWithNames: organizations.map(entity => ({
      name: entity.name,
      slug: entity.slug,
      aliases: entity.aliases
    })),
    locations,
    fetchedAt: new Date().toISOString()
  };
}

async function readSnapshot() {
  try {
    return JSON.parse(await readFile(SNAPSHOT_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

async function writeSnapshot(shaped) {
  try {
    await writeFile(SNAPSHOT_FILE, JSON.stringify(shaped, null, 2), 'utf-8');
  } catch (error) {
    console.warn('⚠ Could not write entity snapshot:', error.message);
  }
}

/**
 * Load entities from the Notion Entities database.
 *
 * Resolution order: in-memory cache → Notion → on-disk snapshot. A Notion
 * failure degrades to the snapshot rather than breaking the app; only a cold
 * start with no snapshot throws.
 *
 * @param {{ force?: boolean }} options
 */
export async function loadEntities({ force = false } = {}) {
  if (!force && cache && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cache;
  }

  const token = process.env.NOTION_TOKEN;
  const dataSourceId = process.env.NOTION_ENTITIES_DATA_SOURCE_ID;

  if (!token || !dataSourceId) {
    const snapshot = await readSnapshot();
    if (snapshot) {
      console.warn('⚠ NOTION_TOKEN or NOTION_ENTITIES_DATA_SOURCE_ID not set — using entity snapshot');
      cache = snapshot;
      cachedAt = Date.now();
      return cache;
    }
    throw new Error(
      'Notion is not configured and no entity snapshot exists. Set NOTION_TOKEN and ' +
        'NOTION_ENTITIES_DATA_SOURCE_ID in .env — see .env.example.'
    );
  }

  try {
    const notion = new Client({ auth: token });
    const shaped = shapeEntities(await queryAllPages(notion, dataSourceId));

    console.log(
      `✓ Loaded ${shaped.people.length} people and ${shaped.vendors.length} organizations from Notion`
    );

    await writeSnapshot(shaped);
    cache = shaped;
    cachedAt = Date.now();
    return cache;
  } catch (error) {
    console.error('✗ Notion entity fetch failed:', error.message);

    const snapshot = await readSnapshot();
    if (snapshot) {
      console.warn(`⚠ Falling back to entity snapshot from ${snapshot.fetchedAt}`);
      cache = snapshot;
      cachedAt = Date.now();
      return cache;
    }

    throw new Error(`Could not load entities from Notion and no snapshot exists: ${error.message}`);
  }
}

export function clearEntityCache() {
  cache = null;
  cachedAt = 0;
}

export { ALLOWED_PROPERTIES, DENIED_PROPERTIES };
