import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { loadEntities } from './entities-notion.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Generic tag vocabulary. Entity slugs are NOT in this file — they come from
// the Notion Entities database via entities-notion.js.
const VOCABULARY_FILE = join(__dirname, '..', 'config', 'tag-vocabulary.md');

let vocabularyCache = null;

// Match table rows of the form: | `tag-slug` | ... |
const extractTagsFromTable = (sectionContent) => {
  const allMatches = [...sectionContent.matchAll(/\| `([^`]+)` \|/g)];
  return allMatches
    .map(m => m[1])
    .filter(tag => !tag.includes('---') && tag !== 'Tag Slug');
};

async function loadVocabulary() {
  if (vocabularyCache) {
    return vocabularyCache;
  }

  const content = await readFile(VOCABULARY_FILE, 'utf-8');

  const docTypesMatch = content.match(/### 1\. DOCUMENT TYPE TAGS[\s\S]*?(?=### 2\.|$)/);
  const docTypes = docTypesMatch ? extractTagsFromTable(docTypesMatch[0]) : [];

  const categoryMatch = content.match(/### 2\. CATEGORY TAGS[\s\S]*?(?=### 3\.|$)/);
  const categories = categoryMatch ? extractTagsFromTable(categoryMatch[0]) : [];

  const statusActionMatch = content.match(/### 3\. STATUS\/ACTION TAGS[\s\S]*?(?=### 4\.|$)/);
  const statusActions = statusActionMatch ? extractTagsFromTable(statusActionMatch[0]) : [];

  // Split the combined status/action table into the two lists the prompt uses.
  const actions = statusActions.filter(tag =>
    tag.includes('needs-') || tag.includes('keep-') || tag === 'paid' ||
    tag === 'reimbursable' || tag === 'tax-deductible' || tag === 'scan-only' ||
    tag === 'original-required' || tag === 'follow-up-needed'
  );

  const statuses = statusActions.filter(tag =>
    tag === 'active' || tag === 'expired' || tag === 'superseded' ||
    tag.includes('duplicate') || tag === 'void' || tag === 'draft' ||
    tag === 'needs-deleting'
  );

  const specialMatch = content.match(/### 5\. SPECIAL FLAGS[\s\S]*?(?=### 6\.|$)/);
  const specials = specialMatch ? extractTagsFromTable(specialMatch[0]) : [];

  vocabularyCache = { documentTypes: docTypes, categories, actions, statuses, specials };
  return vocabularyCache;
}

/**
 * Loads the complete taxonomy: generic vocabulary from config/tag-vocabulary.md
 * merged with named entities from the Notion Entities database.
 *
 * Errors propagate rather than degrading to an empty taxonomy. An empty entity
 * list would silently produce suggestions with no person or vendor tags, which
 * reads as a bad model rather than a broken integration.
 *
 * @returns {Promise<Object>} documentTypes, categories, actions, statuses,
 *   specials, locations, people, vendors, peopleWithNames, vendorsWithNames
 */
export async function loadTaxonomy() {
  const [vocabulary, entities] = await Promise.all([loadVocabulary(), loadEntities()]);

  return {
    ...vocabulary,
    locations: entities.locations,
    people: entities.people,
    vendors: entities.vendors,
    peopleWithNames: entities.peopleWithNames,
    vendorsWithNames: entities.vendorsWithNames
  };
}

/**
 * Clears the vocabulary cache. Entity caching is managed separately by
 * entities-notion.js — use clearEntityCache() from there to force a refetch.
 */
export function clearTaxonomyCache() {
  vocabularyCache = null;
}
