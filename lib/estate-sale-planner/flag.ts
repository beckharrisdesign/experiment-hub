/**
 * The vision pass — frames in, flagged items out.
 *
 * The response is validated against a zod schema (structured outputs), so the
 * route never forwards free text. Without ANTHROPIC_API_KEY the fixture set is
 * served and the caller is told, so the demo runs end to end on a laptop with
 * no keys (same posture as etsy-listing-kit's evaluate route).
 */

import { z } from "zod";
import { VISION_MODEL } from "./config";
import fixture from "./fixtures/flags.json";

export const BANDS = ["under $25", "$25–$100", "$100–$500", "$500–$2,000", "over $2,000"] as const;

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
});

export const FlagResponseSchema = z.object({
  items: z.array(FlaggedItemSchema).max(120),
});

export type FlaggedItem = z.infer<typeof FlaggedItemSchema>;
export type FlagResponse = z.infer<typeof FlagResponseSchema>;

export interface FlagResult extends FlagResponse {
  /** "model" when the vision pass ran; "fixture" when no key was configured. */
  source: "model" | "fixture";
  model: string;
  usage?: { inputTokens: number; outputTokens: number };
}

export const SYSTEM_PROMPT = `You help an adult child clearing out a parent's house decide what might be worth selling before a clean-out crew takes everything.

You will see frames sampled from a phone walkthrough. For each distinct object you can identify, return one item. Set "flagged": true only for objects that a local estate-sale company or online resale buyer would plausibly pay for: furniture with recognizable style or maker, art, rugs, instruments, tools, collectibles, jewelry, electronics still in demand, quality cookware. Everyday consumables, worn soft furnishings, and generic décor are not flagged.

Be honest and specific. "band" is a rough resale value band, not an appraisal. "reason" is one plain sentence a grieving person can act on, no hedging boilerplate. "room" is a short label for where it was seen. Use "confidence": "low" freely; a wrong "high" costs trust. Never invent an object you did not see. Prefer fewer, better items over a long list.`;

export function visionConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/** Validate a raw response. Returns null when the shape is wrong. */
export function parseFlagResponse(raw: unknown): FlagResponse | null {
  const result = FlagResponseSchema.safeParse(raw);
  return result.success ? result.data : null;
}

export function fixtureFlags(): FlagResult {
  const parsed = parseFlagResponse(fixture);
  if (!parsed) throw new Error("estate-sale-planner fixture does not match FlagResponseSchema");
  return { ...parsed, source: "fixture", model: "fixture" };
}

export interface FrameInput {
  /** Base64 JPEG, no data: prefix. */
  data: string;
  /** Seconds into the walkthrough (or photo index), for the prompt. */
  at: number;
}

/**
 * Run the vision pass. Frames go in one request as image blocks; the model
 * answers in the schema above. Throws on API failure; the route maps that.
 */
export async function flagFrames(frames: FrameInput[]): Promise<FlagResult> {
  if (!visionConfigured()) return fixtureFlags();

  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const { zodOutputFormat } = await import("@anthropic-ai/sdk/helpers/zod");
  const client = new Anthropic();

  const content: Array<
    | { type: "image"; source: { type: "base64"; media_type: "image/jpeg"; data: string } }
    | { type: "text"; text: string }
  > = [];
  frames.forEach((f, i) => {
    content.push({ type: "text", text: `Frame ${i} (${f.at}s)` });
    content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: f.data } });
  });
  content.push({
    type: "text",
    text: `These ${frames.length} frames are one walkthrough. Return the items.`,
  });

  const response = await client.messages.parse({
    model: VISION_MODEL,
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content }],
    output_config: { format: zodOutputFormat(FlagResponseSchema) },
  });

  if (response.stop_reason === "refusal") {
    throw new Error("The vision pass declined this walkthrough.");
  }
  const parsed = response.parsed_output ? parseFlagResponse(response.parsed_output) : null;
  if (!parsed) throw new Error("The vision pass returned an unreadable response.");

  return {
    ...parsed,
    source: "model",
    model: response.model,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  };
}
