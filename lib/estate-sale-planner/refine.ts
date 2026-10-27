/**
 * The re-read — one item plus the detail shots the user took (a seam, a stamp
 * on the bottom, a label) go back to the model, which returns the same item
 * with a better name, band, reason, confidence, and what it could read off
 * the mark. Same provider order and fixture posture as the walkthrough pass.
 */
import { z } from "zod";
import { BANDS, BAND_GUIDE, capConfidence, clipFields, visionProvider, type FrameInput, type VisionProvider } from "./flag";

export const RefineResponseSchema = z.object({
  name: z.string().min(1).max(80),
  band: z.enum(BANDS),
  reason: z.string().min(1).max(160),
  confidence: z.enum(["low", "medium", "high"]),
  /** What the stamp / mark / label says, in the model's words; null when nothing legible. */
  markReading: z.string().max(160).nullable(),
});
export type RefineResponse = z.infer<typeof RefineResponseSchema>;

export interface RefineInput {
  item: { name: string; room: string; band: string; reason: string; confidence: string };
  /** The detail shots, base64 JPEG. */
  details: FrameInput[];
  /** Anything the user typed about the piece — who bought it, where, when. */
  context?: string;
  /** The family re-framed the object on its source photo; the single image is the new crop (sold-comps D3). */
  reframed?: boolean;
  /** "Adjust this item": the family's words, applied to this item only (sold-comps D14). */
  message?: string;
}

export interface RefineResult extends RefineResponse {
  source: "model" | "fixture";
  provider: VisionProvider | "fixture";
  model: string;
  usage?: { inputTokens: number; outputTokens: number };
}

export const REFINE_PROMPT = `You help an adult child clearing out a parent's house decide what might be worth selling. You already looked at this object in a walkthrough frame and gave a rough resale value band. The person has now taken close-up detail photos of it — a seam, a stamp on the bottom, a label, a maker's mark — because they want a better read.

Look at the details and return the same object with a better name, band, reason, and confidence. Keep "name" under 80 characters and "reason" to one sentence under 160. Sometimes the photo is a new crop the family drew around the object, or the family tells you something in their own words; use what they give you. "markReading" is exactly what you can read off any stamp, mark, label, or signature, transcribed plainly; null when nothing is legible. If the mark changes what the object is (a maker, a period, a reproduction), say so in the reason in one plain sentence. Never invent a mark you cannot read.

${BAND_GUIDE}`;

export function refineUserText(input: RefineInput): string {
  const { item } = input;
  const n = input.details.length;
  const photos = input.reframed || input.message ? (n === 0 ? "No photo follows." : `${n} ${n === 1 ? "photo" : "photos"} of the object follows.`) : `${n} detail ${n === 1 ? "photo" : "photos"} follow.`;
  const lines = [`Object: ${item.name}${item.room ? ` (${item.room})` : ""}. Walkthrough read: ${item.band}, ${item.confidence} confidence — "${item.reason}".`];
  if (input.reframed) lines.push("The family re-framed this object; the photo is the object itself.");
  lines.push(photos);
  if (input.context?.trim()) lines.push(`What the family knows: ${input.context.trim()}`);
  if (input.message?.trim()) {
    lines.push(`The family says: "${input.message.trim()}"`);
    lines.push("Treat it as a fact about this object unless the photo plainly contradicts it. Change only what the message is about; keep the rest of the read.");
  }
  lines.push("Return the object again with the better read.");
  return lines.join("\n");
}

export function parseRefineResponse(raw: unknown): RefineResponse | null {
  const result = RefineResponseSchema.safeParse(clipFields(raw, { name: 80, reason: 160, markReading: 160 }));
  // Which fields failed, never their content: enough to fix the schema from the logs.
  if (!result.success) console.error("[esp refine] unreadable:", result.error.issues.map((i) => `${i.path.join(".")}: ${i.code}`).join("; "));
  return result.success ? result.data : null;
}

/** Fixture mode: the detail is kept, nothing is re-read, and the caller is told. */
export function fixtureRefine(input: RefineInput): RefineResult {
  const { item } = input;
  return {
    name: item.name,
    band: item.band as RefineResponse["band"],
    reason: item.reason,
    confidence: item.confidence as RefineResponse["confidence"],
    markReading: null,
    source: "fixture",
    provider: "fixture",
    model: "fixture",
  };
}

export async function refineItem(input: RefineInput): Promise<RefineResult> {
  const chosen = visionProvider();
  if (!chosen) return fixtureRefine(input);
  let result: RefineResult;
  if (chosen.provider === "openai") {
    const { refineWithOpenAI } = await import("./vision/openai");
    result = await refineWithOpenAI(input, chosen.apiKey);
  } else {
    const { refineWithAnthropic } = await import("./vision/anthropic");
    result = await refineWithAnthropic(input, chosen.apiKey);
  }
  return capConfidence(result, result.markReading);
}
