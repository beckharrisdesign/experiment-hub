/**
 * The re-read — one item plus the detail shots the user took (a seam, a stamp
 * on the bottom, a label) go back to the model, which returns the same item
 * with a better name, band, reason, confidence, and what it could read off
 * the mark. Same provider order and fixture posture as the walkthrough pass.
 */
import { z } from "zod";
import { BANDS, visionProvider, type FrameInput, type VisionProvider } from "./flag";

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
}

export interface RefineResult extends RefineResponse {
  source: "model" | "fixture";
  provider: VisionProvider | "fixture";
  model: string;
  usage?: { inputTokens: number; outputTokens: number };
}

export const REFINE_PROMPT = `You help an adult child clearing out a parent's house decide what might be worth selling. You already looked at this object in a walkthrough frame and gave a rough resale value band. The person has now taken close-up detail photos of it — a seam, a stamp on the bottom, a label, a maker's mark — because they want a better read.

Look at the details and return the same object with a better name, band, reason, and confidence. "markReading" is exactly what you can read off any stamp, mark, label, or signature, transcribed plainly; null when nothing is legible. If the mark changes what the object is (a maker, a period, a reproduction), say so in the reason in one plain sentence. Stay honest: the band is still not an appraisal, and a wrong "high" costs trust. Never invent a mark you cannot read.`;

export function refineUserText(input: RefineInput): string {
  const { item } = input;
  const lines = [
    `Object: ${item.name} (${item.room}). Walkthrough read: ${item.band}, ${item.confidence} confidence — "${item.reason}".`,
    `${input.details.length} detail ${input.details.length === 1 ? "photo" : "photos"} follow.`,
  ];
  if (input.context?.trim()) lines.push(`What the family knows: ${input.context.trim()}`);
  lines.push("Return the object again with the better read.");
  return lines.join("\n");
}

export function parseRefineResponse(raw: unknown): RefineResponse | null {
  const result = RefineResponseSchema.safeParse(raw);
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
  if (chosen.provider === "openai") {
    const { refineWithOpenAI } = await import("./vision/openai");
    return refineWithOpenAI(input, chosen.apiKey);
  }
  const { refineWithAnthropic } = await import("./vision/anthropic");
  return refineWithAnthropic(input, chosen.apiKey);
}
