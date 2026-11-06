/**
 * The search query (sold-comps design D4). Written last: only once an item passes the gate,
 * from its current name, mark reading, family note and lot count. The walkthrough and the
 * re-read never write one — most items are never looked up, and a query written before a
 * correction would have to be written again.
 */
import { z } from "zod";
import { clipText } from "./normalize";
import { textStructured, type TextResult } from "./text";

/**
 * Trimmed before the length check, so a reply of spaces can never become an empty search or cache
 * key. No maximum here: strict output doesn't enforce one, so `writeQuery` clips instead (D22).
 * `broader` is what to try when the first search finds too little (D24).
 */
export const QuerySchema = z.object({ query: z.string().trim().min(1), broader: z.array(z.string()) });
const MAX_QUERY = 80;

export interface QueryInput {
  name: string;
  markReading?: string | null;
  note?: string;
  /** Present for a lot: how many pieces are sold together. */
  lotCount?: number;
}

/**
 * Short and plain on purpose (D22, probe 2026-11-03): the earlier "maker, model, material, size"
 * prompt wrote four different Le Creuset searches in four runs, one of which found 2 sales; this
 * one wrote "Le Creuset 26 Dutch oven" four times. `broader` and the sellers' words are from D24
 * (probe 2026-11-06): "Danish teak tambour roll-top secretary" found 0, "teak roll top desk" 50.
 */
export const QUERY_PROMPT = `You write the searches a reseller would type into eBay's sold-listings search to price one object from a house being cleared out. "query" is the most specific search likely to find sales, 2 to 5 words, the way real listing titles start: the maker if one is known, then the model, pattern or number from the mark, then what the object is. With no known maker, start with the material the object is made of, then what it is ("teak roll top desk"). Copy a maker's model or size number the way the mark gives it ("No. 8", "403"). "broader" is up to two more searches, each wider than the one before: drop the model, then the maker, and drop the material only in the last one. Use the plain words sellers use for the object, not a description of it: "roll top desk", not "tambour secretary". Keep the words that name the kind of object ("butcher block dining table"), and drop generic ones like "solid wood". Every search needs at least two words. Leave out colour, finish, condition, country of origin, and measurements the maker's number already covers. Never write words for what isn't known, such as unknown or unbranded, and leave out signed and style. When the object is a set sold together, search for the set ("set of 6 Pyrex mixing bowls"). Return only the searches.`;

const MAX_WORDS = 6;
const FILLER = /\b(?:maker\s+unknown|unknown(?:\s+(?:maker|brand|artist|make|origin))?|unbranded|unmarked|unsigned|signed|no\s+name|generic|style)\b/gi;

/**
 * Make a search safe to send, with no model call (D24): hyphens become spaces, so "roll-top"
 * matches "roll top"; words that only describe what we don't know come out; the length is capped,
 * because every word narrows the search. Can return "": the caller skips it.
 */
export function cleanQuery(text: string): string {
  return text
    .replace(/["\u201C\u201D]/g, " ")
    .replace(/(?<=\p{L})-(?=\p{L})/gu, " ")
    .replace(FILLER, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, MAX_WORDS)
    .join(" ");
}

export function queryUserText(input: QueryInput): string {
  const lines = [`Object: ${input.name}`];
  if (input.lotCount && input.lotCount > 1) lines.push(`Sold together as a set of ${input.lotCount}.`);
  if (input.markReading?.trim()) lines.push(`Mark or label reads: ${input.markReading.trim()}`);
  if (input.note?.trim()) lines.push(`What the family knows: ${input.note.trim().slice(0, 300)}`);
  return lines.join("\n");
}

/** With no model key the name is the query (fixture mode), so the lookup still runs locally. */
export function fixtureQuery(input: QueryInput): string {
  const base = input.name.trim().slice(0, 70);
  return input.lotCount && input.lotCount > 1 ? `set of ${input.lotCount} ${base}` : base;
}

export async function writeQuery(input: QueryInput): Promise<{ query: string; broader?: string[]; call: TextResult<unknown> | null }> {
  const call = await textStructured({ system: QUERY_PROMPT, user: queryUserText(input), schema: QuerySchema, name: "comps_query", step: "query" });
  if (!call) return { query: fixtureQuery(input), call };
  return { query: clipText(call.data.query, MAX_QUERY), broader: call.data.broader.map((q) => clipText(q, MAX_QUERY)), call };
}

export { normalizeQuery } from "./normalize";
