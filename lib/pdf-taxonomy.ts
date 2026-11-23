/**
 * The tagging taxonomy AI suggestions choose from.
 * openspec/changes/pdf-metadata-viewer-cloud — task 6.5. Ported from the v1
 * prototype's `lib/taxonomy-loader.js`.
 *
 * Generic tags come from `config/pdf-metadata-viewer/tag-vocabulary.md`; people,
 * organisations and locations from Notion (lib/pdf-entities.ts).
 *
 * One deliberate change from v1 (design.md, "decisions, not descriptions"): the
 * four tags that record a decision about a document rather than describe it —
 * `needs-deleting`, `no-split-needed`, `already-split`, `from-split` — are not
 * offered. They become columns, and a model picking them from page imagery
 * was always noise.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadEntities, type Entities } from "@/lib/pdf-entities";

const VOCABULARY_FILE = path.join(process.cwd(), "config", "pdf-metadata-viewer", "tag-vocabulary.md");

export const DECISION_TAGS: readonly string[] = Object.freeze([
  "needs-deleting",
  "no-split-needed",
  "already-split",
  "from-split",
]);

export interface Vocabulary {
  documentTypes: string[];
  categories: string[];
  actions: string[];
  statuses: string[];
  specials: string[];
}

export type Taxonomy = Vocabulary & Omit<Entities, "fetchedAt">;

/** Table rows of the form `| \`tag-slug\` | ... |`. */
function tagsIn(section: string | undefined): string[] {
  if (!section) return [];
  return [...section.matchAll(/\| `([^`]+)` \|/g)]
    .map((m) => m[1])
    .filter((tag) => !tag.includes("---") && tag !== "Tag Slug" && !DECISION_TAGS.includes(tag));
}

function section(content: string, heading: RegExp): string | undefined {
  return content.match(heading)?.[0];
}

/** Parse the vocabulary file. Headings and table shape are load-bearing. */
export function parseVocabulary(content: string): Vocabulary {
  const documentTypes = tagsIn(section(content, /### 1\. DOCUMENT TYPE TAGS[\s\S]*?(?=### 2\.|$)/));
  const categories = tagsIn(section(content, /### 2\. CATEGORY TAGS[\s\S]*?(?=### 3\.|$)/));
  const statusActions = tagsIn(section(content, /### 3\. STATUS\/ACTION TAGS[\s\S]*?(?=### 4\.|$)/));
  const specials = tagsIn(section(content, /### 5\. SPECIAL FLAGS[\s\S]*?(?=### 6\.|$)/));

  // Split the combined status/action table into the two lists the prompt uses.
  const actions = statusActions.filter(
    (tag) =>
      tag.includes("needs-") ||
      tag.includes("keep-") ||
      [
        "paid",
        "reimbursable",
        "tax-deductible",
        "scan-only",
        "original-required",
        "follow-up-needed",
      ].includes(tag),
  );
  const statuses = statusActions.filter(
    (tag) =>
      ["active", "expired", "superseded", "void", "draft"].includes(tag) || tag.includes("duplicate"),
  );

  return { documentTypes, categories, actions, statuses, specials };
}

let vocabularyCache: Vocabulary | null = null;

async function loadVocabulary(): Promise<Vocabulary> {
  if (!vocabularyCache) vocabularyCache = parseVocabulary(await readFile(VOCABULARY_FILE, "utf-8"));
  return vocabularyCache;
}

/** Vocabulary merged with Notion entities. Errors propagate (see loadEntities). */
export async function loadTaxonomy(): Promise<Taxonomy> {
  const [vocabulary, entities] = await Promise.all([loadVocabulary(), loadEntities()]);
  return {
    ...vocabulary,
    people: entities.people,
    peopleWithNames: entities.peopleWithNames,
    vendors: entities.vendors,
    vendorsWithNames: entities.vendorsWithNames,
    locations: entities.locations,
  };
}
