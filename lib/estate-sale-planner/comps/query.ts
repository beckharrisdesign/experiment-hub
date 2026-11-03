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
 */
export const QuerySchema = z.object({ query: z.string().trim().min(1) });
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
 * one wrote "Le Creuset 26 Dutch oven" four times.
 */
export const QUERY_PROMPT = `You write the search a reseller would type into eBay's sold-listings search to price one object from a house being cleared out. Write 3 to 6 words, the way real listing titles start: the maker, then the model, pattern or number from the mark, then what the object is. Copy a maker's model or size number the way the mark gives it ("No. 8", "403"). Leave out colour, finish, condition, country of origin, and measurements the maker's number already covers. When the object is a set sold together, search for the set ("set of 6 Pyrex mixing bowls"). Return only the query.`;

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

export async function writeQuery(input: QueryInput): Promise<{ query: string; call: TextResult<unknown> | null }> {
  const call = await textStructured({ system: QUERY_PROMPT, user: queryUserText(input), schema: QuerySchema, name: "comps_query", step: "query" });
  return { query: call ? clipText(call.data.query, MAX_QUERY) : fixtureQuery(input), call };
}

export { normalizeQuery } from "./normalize";
