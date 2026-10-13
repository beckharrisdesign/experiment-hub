/**
 * Anthropic vision adapter — the alternate, used when the environment carries
 * ANTHROPIC_API_KEY and no OPENAI_API_KEY. Structured output via the SDK's
 * zod helper, so the route never forwards free text.
 */
import { VISION_MODELS } from "../config";
import { FlagResponseSchema, SYSTEM_PROMPT, parseFlagResponse, type FlagResult, type FrameInput } from "../flag";

export async function flagWithAnthropic(frames: FrameInput[], apiKey: string): Promise<FlagResult> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const { zodOutputFormat } = await import("@anthropic-ai/sdk/helpers/zod");
  const client = new Anthropic({ apiKey });

  const content: Array<
    | { type: "image"; source: { type: "base64"; media_type: "image/jpeg"; data: string } }
    | { type: "text"; text: string }
  > = [];
  frames.forEach((f, i) => {
    content.push({ type: "text", text: `Frame ${i} (${f.at}s)` });
    content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: f.data } });
  });
  content.push({ type: "text", text: `These ${frames.length} frames are one walkthrough. Return the items.` });

  const response = await client.messages.parse({
    model: VISION_MODELS.anthropic,
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content }],
    output_config: { format: zodOutputFormat(FlagResponseSchema) },
  });

  if (response.stop_reason === "refusal") throw new Error("The vision pass declined this walkthrough.");
  const parsed = response.parsed_output ? parseFlagResponse(response.parsed_output) : null;
  if (!parsed) throw new Error("The vision pass returned an unreadable response.");

  return {
    ...parsed,
    source: "model",
    provider: "anthropic",
    model: response.model,
    usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
  };
}
