/**
 * The vision pass — frames in, flagged items out.
 *
 * The response is validated against a zod schema (structured outputs), so the
 * route never forwards free text. The provider follows the key the environment
 * carries — OPENAI_API_KEY first (the hub's synced model key), ANTHROPIC_API_KEY
 * as the alternate, the ELK composer's order. With neither, the fixture set is
 * served and the caller is told, so the demo runs end to end with no keys.
 */

import { z } from "zod";
import fixture from "./fixtures/flags.json";

export const BANDS = ["under $25", "$25–$100", "$100–$500", "$500–$2,000", "over $2,000"] as const;

/**
 * Where the object sits in its frame, normalized 0–1 from the top-left. The
 * device crops the kept frame to this box to show "what it thinks it found";
 * null means the model wasn't sure and the whole frame is shown instead.
 */
export const BoxSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  w: z.number().min(0).max(1),
  h: z.number().min(0).max(1),
});

export const FlaggedItemSchema = z.object({
  name: z.string().min(1).max(80),
  room: z.string().min(1).max(40),
  /** True = Sell list candidate; false = everything else the model noticed. */
  flagged: z.boolean(),
  band: z.enum(BANDS),
  reason: z.string().min(1).max(160),
  confidence: z.enum(["low", "medium", "high"]),
  /** Index into the frames sent, so the UI can show where it was seen. */
  frame: z.number().int().min(0),
  box: BoxSchema.nullable(),
});

export type Box = z.infer<typeof BoxSchema>;

export const FlagResponseSchema = z.object({
  items: z.array(FlaggedItemSchema).max(120),
});

export type FlaggedItem = z.infer<typeof FlaggedItemSchema>;
export type FlagResponse = z.infer<typeof FlagResponseSchema>;

export type VisionProvider = "openai" | "anthropic";

export interface FlagResult extends FlagResponse {
  /** "model" when the vision pass ran; "fixture" when no key was configured. */
  source: "model" | "fixture";
  provider: VisionProvider | "fixture";
  model: string;
  usage?: { inputTokens: number; outputTokens: number };
}

export const SYSTEM_PROMPT = `You help an adult child clearing out a parent's house decide what might be worth selling before a clean-out crew takes everything.

You will see frames sampled from a phone walkthrough. For each distinct object you can identify, return one item. Set "flagged": true only for objects that a local estate-sale company or online resale buyer would plausibly pay for: furniture with recognizable style or maker, art, rugs, instruments, tools, collectibles, jewelry, electronics still in demand, quality cookware. Everyday consumables, worn soft furnishings, and generic décor are not flagged.

Be honest and specific. "band" is a rough resale value band, not an appraisal. "reason" is one plain sentence a grieving person can act on, no hedging boilerplate. "room" is a short label for where it was seen. Use "confidence": "low" freely; a wrong "high" costs trust. Never invent an object you did not see. Prefer fewer, better items over a long list.

"frame" is the index of the frame the object is clearest in. "box" is where it sits in that frame: x and y are the top-left corner and w and h the size, all as fractions of the frame from 0 to 1. Make the box generous enough to include the whole object. Use null when you cannot place it.`;

/** Which provider the environment can run, or null for fixture mode. */
export function visionProvider(env: Record<string, string | undefined> = process.env): { provider: VisionProvider; apiKey: string } | null {
  const openai = env.OPENAI_API_KEY?.trim();
  if (openai) return { provider: "openai", apiKey: openai };
  const anthropic = env.ANTHROPIC_API_KEY?.trim();
  if (anthropic) return { provider: "anthropic", apiKey: anthropic };
  return null;
}

export function visionConfigured(): boolean {
  return visionProvider() !== null;
}

/** Validate a raw response. Returns null when the shape is wrong. */
export function parseFlagResponse(raw: unknown): FlagResponse | null {
  const result = FlagResponseSchema.safeParse(raw);
  return result.success ? result.data : null;
}

export function fixtureFlags(): FlagResult {
  const parsed = parseFlagResponse(fixture);
  if (!parsed) throw new Error("estate-sale-planner fixture does not match FlagResponseSchema");
  return { ...parsed, source: "fixture", provider: "fixture", model: "fixture" };
}

export interface FrameInput {
  /** Base64 JPEG, no data: prefix. */
  data: string;
  /** Seconds into the walkthrough (or photo index), for the prompt. */
  at: number;
}

/**
 * Run the vision pass with whichever provider is keyed. Throws on API
 * failure; the route maps that to a 502.
 */
export async function flagFrames(frames: FrameInput[]): Promise<FlagResult> {
  const chosen = visionProvider();
  if (!chosen) return fixtureFlags();
  if (chosen.provider === "openai") {
    const { flagWithOpenAI } = await import("./vision/openai");
    return flagWithOpenAI(frames, chosen.apiKey);
  }
  const { flagWithAnthropic } = await import("./vision/anthropic");
  return flagWithAnthropic(frames, chosen.apiKey);
}
