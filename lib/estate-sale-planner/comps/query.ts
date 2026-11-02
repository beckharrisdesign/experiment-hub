/**
 * The search query (sold-comps design D4). Written last: only once an item passes the gate,
 * from its current name, mark reading, family note and lot count. The walkthrough and the
 * re-read never write one — most items are never looked up, and a query written before a
 * correction would have to be written again.
 */
import { z } from "zod";
import { textStructured, type TextResult } from "./text";

/** Trimmed before the length check, so a reply of spaces can never become an empty search or cache key. */
export const QuerySchema = z.object({ query: z.string().trim().min(1).max(80) });

export interface QueryInput {
  name: string;
  markReading?: string | null;
  note?: string;
  /** Present for a lot: how many pieces are sold together. */
  lotCount?: number;
}

export const QUERY_PROMPT = `You write the search a reseller would type into eBay's sold-listings search to price one object from a house being cleared out. Use the words that appear in real listing titles: maker, model or pattern, material, size, a model number when the mark gives one. Leave out condition words, adjectives and anything a seller wouldn't put in a title. When the object is a set sold together, search for the set ("set of 6 Pyrex mixing bowls"), not one piece. Keep it under 80 characters. Return only the query.`;

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
  const call = await textStructured({ system: QUERY_PROMPT, user: queryUserText(input), schema: QuerySchema, name: "comps_query" });
  return { query: call ? call.data.query : fixtureQuery(input), call };
}

export { normalizeQuery } from "./normalize";
