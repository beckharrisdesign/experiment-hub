/**
 * The comps pass (sold-comps design D7): a short text-only call keeps only the sold listings
 * that are the same object — same maker and model, or for a lot a comparable set — and says
 * why in one line. It never prices anything; `band.ts` does the math on what it kept.
 */
import { z } from "zod";
import type { SoldListing } from "./provider";
import type { QueryInput } from "./query";
import { clipText } from "./normalize";
import { textStructured, type TextResult } from "./text";

/** No maximum on `reason`: strict output doesn't enforce one, and a long reason threw (D22). `readComps` clips it. */
export const ReadSchema = z.object({
  matches: z.array(z.number().int().min(0)),
  reason: z.string().min(1),
});
const MAX_REASON = 160;

/**
 * Strict on purpose, plus the size-number rule (D22, probe 2026-11-03 on 50 real Lodge sales):
 * a looser "would a buyer count it the same" prompt was steadier but let in 8-inch #5 skillets
 * and priced a No. 8 at $25–$50. With this prompt gpt-5 kept the same three vintage No. 8s in
 * four of four runs ($50–$100); nano and mini still flipped. The no-known-maker rule is D24: a
 * teak roll top desk with no maker had nothing to be "the same maker and model" as.
 */
export const READ_PROMPT = `You check sold eBay listings against one object from a house being cleared out. Keep only the listings that are the same object: the same maker and model or pattern, about the same size, and complete. When the object has no known maker, keep comparable pieces instead: the same kind of object in the same material and about the same era and size, whoever made it, but never a different kind of object such as a small organizer for a desk. For a set, keep comparable sets with about the same number of pieces. A number in a maker's mark or model name is a size or model number, not a measurement: a No. 8 skillet is not an 8-inch skillet. Drop parts, lots of different things, reproductions of an original (or the original when the object is a reproduction), and anything you aren't sure of. Return the indexes you kept and one plain sentence under 160 characters on what you kept or why you dropped most. Never mention a listing's number or how many you kept in that sentence.`;

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
  const call = await textStructured({ system: READ_PROMPT, user: readUserText(item, listings), schema: ReadSchema, name: "comps_read", step: "read" });
  if (!call) return { matches: [], reason: "No model is configured to check the sold listings.", call: null };
  const matches = [...new Set(call.data.matches)].filter((i) => i < listings.length).sort((a, b) => a - b);
  return { matches, reason: clipText(call.data.reason, MAX_REASON), call };
}
