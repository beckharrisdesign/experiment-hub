/**
 * Anthropic vision adapter — the alternate, used when the environment carries
 * ANTHROPIC_API_KEY and no OPENAI_API_KEY. Structured output via the SDK's
 * zod helper, so the route never forwards free text. Serves both the
 * walkthrough pass and the detail-shot re-read.
 */
import type { z } from "zod";
import { VISION_MODELS } from "../config";
import { FlagResponseSchema, SYSTEM_PROMPT, parseFlagResponse, type FlagResult, type FrameInput } from "../flag";
import { REFINE_PROMPT, RefineResponseSchema, parseRefineResponse, refineUserText, type RefineInput, type RefineResult } from "../refine";

type Part =
  | { type: "image"; source: { type: "base64"; media_type: "image/jpeg"; data: string } }
  | { type: "text"; text: string };

const imagePart = (f: FrameInput): Part => ({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: f.data } });

async function structured<T extends z.ZodType>(system: string, content: Part[], schema: T, apiKey: string) {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const { zodOutputFormat } = await import("@anthropic-ai/sdk/helpers/zod");
  const client = new Anthropic({ apiKey });
  const response = await client.messages.parse({
    model: VISION_MODELS.anthropic,
    max_tokens: 16000,
    system,
    messages: [{ role: "user", content }],
    output_config: { format: zodOutputFormat(schema) },
  });
  if (response.stop_reason === "refusal") throw new Error("The vision pass declined this walkthrough.");
  return {
    raw: response.parsed_output as unknown,
    model: response.model,
    usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
  };
}

export async function flagWithAnthropic(frames: FrameInput[], apiKey: string): Promise<FlagResult> {
  const content: Part[] = [];
  frames.forEach((f, i) => {
    content.push({ type: "text", text: `Frame ${i} (${f.at}s)` });
    content.push(imagePart(f));
  });
  content.push({ type: "text", text: `These ${frames.length} frames are one walkthrough. Return the items.` });
  const { raw, model, usage } = await structured(SYSTEM_PROMPT, content, FlagResponseSchema, apiKey);
  const parsed = raw ? parseFlagResponse(raw) : null;
  if (!parsed) throw new Error("The vision pass returned an unreadable response.");
  return { ...parsed, source: "model", provider: "anthropic", model, usage };
}

export async function refineWithAnthropic(input: RefineInput, apiKey: string): Promise<RefineResult> {
  const content: Part[] = [{ type: "text", text: refineUserText(input) }];
  input.details.forEach((d, i) => {
    content.push({ type: "text", text: `Detail ${i + 1}` });
    content.push(imagePart(d));
  });
  const { raw, model, usage } = await structured(REFINE_PROMPT, content, RefineResponseSchema, apiKey);
  const parsed = raw ? parseRefineResponse(raw) : null;
  if (!parsed) throw new Error("The re-read came back unreadable.");
  return { ...parsed, source: "model", provider: "anthropic", model, usage };
}
