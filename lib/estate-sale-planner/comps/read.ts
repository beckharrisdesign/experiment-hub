/**
 * The comps pass (sold-comps design D7): a short text-only call keeps only the sold listings
 * that are the same object — same maker and model, or for a lot a comparable set — and says
 * why in one line. It never prices anything; `band.ts` does the math on what it kept.
 */
import { z } from "zod";
import type { SoldListing } from "./provider";
import type { QueryInput } from "./query";
import { textStructured, type TextResult } from "./text";

export const ReadSchema = z.object({
  matches: z.array(z.number().int().min(0)),
  reason: z.string().min(1).max(160),
});

export const READ_PROMPT = `You check sold eBay listings against one object from a house being cleared out. Keep only the listings that are the same object: the same maker and model or pattern, about the same size, and complete. For a set, keep comparable sets with about the same number of pieces. Drop parts, lots of different things, reproductions of an original (or the original when the object is a reproduction), and anything you aren't sure of. Return the indexes you kept and one plain sentence under 160 characters on what you kept or why you dropped most.`;

export function readUserText(item: QueryInput, listings: SoldListing[]): string {
  const lines = [`Object: ${item.name}`];
  if (item.lotCount && item.lotCount > 1) lines.push(`A set of ${item.lotCount}, sold together.`);
  if (item.markReading?.trim()) lines.push(`Mark or label reads: ${item.markReading.trim()}`);
  if (item.note?.trim()) lines.push(`What the family knows: ${item.note.trim().slice(0, 300)}`);
  lines.push("Sold listings:");
  listings.forEach((l, i) => {
    lines.push(`${i}. ${l.title} — $${(l.priceCents / 100).toFixed(2)}${l.soldAt ? `, sold ${l.soldAt.slice(0, 10)}` : ""}`);
  });
  return lines.join("\n");
}

export interface ReadResult {
  matches: number[];
  reason: string;
  call: TextResult<unknown> | null;
}

/** With no model key nothing is kept: comps nobody checked never set a band. */
export async function readComps(item: QueryInput, listings: SoldListing[]): Promise<ReadResult> {
  const call = await textStructured({ system: READ_PROMPT, user: readUserText(item, listings), schema: ReadSchema, name: "comps_read" });
  if (!call) return { matches: [], reason: "No model is configured to check the sold listings.", call: null };
  const matches = [...new Set(call.data.matches)].filter((i) => i < listings.length);
  return { matches, reason: call.data.reason, call };
}
