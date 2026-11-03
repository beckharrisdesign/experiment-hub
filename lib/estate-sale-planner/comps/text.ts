/**
 * One small structured text call for the lookup's two model steps — writing the search query
 * and reading the comps (sold-comps design D4, D7). No images; the model is per step
 * (`TEXT_MODELS`, D22), the same provider order as the walkthrough: OpenAI, then Anthropic.
 * Returns null when no model key is set (fixture mode); the caller decides what that means.
 */
import { z } from "zod";
import { TEXT_MODELS, type TextStep } from "../config";
import { visionProvider, type VisionProvider } from "../flag";
import { OPENAI_URL } from "../vision/openai";
import { strictJsonSchema } from "../vision/schema";

export interface TextRequest<T extends z.ZodType> {
  system: string;
  user: string;
  schema: T;
  name: string;
  /** Which lookup step: picks the model (`TEXT_MODELS`). */
  step: TextStep;
}

export interface TextResult<T> {
  data: T;
  provider: VisionProvider;
  model: string;
  usage: { inputTokens: number; outputTokens: number };
}

/** The OpenAI body, exported so a test can pin the model and shape. */
export function openAITextBody<T extends z.ZodType>({ system, user, schema, name, step }: TextRequest<T>) {
  return {
    model: TEXT_MODELS.openai[step],
    // Room for the reasoning tokens a gpt-5 model spends before a short answer.
    max_completion_tokens: 4000,
    reasoning_effort: "low",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name, strict: true, schema: strictJsonSchema(z.toJSONSchema(schema)) },
    },
  };
}

export async function textStructured<T extends z.ZodType>(
  request: TextRequest<T>,
  env: Record<string, string | undefined> = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<TextResult<z.infer<T>> | null> {
  const chosen = visionProvider(env);
  if (!chosen) return null;

  if (chosen.provider === "openai") {
    const response = await fetchImpl(OPENAI_URL, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${chosen.apiKey}` },
      body: JSON.stringify(openAITextBody(request)),
    });
    if (!response.ok) throw new Error(`The ${request.name} call failed (OpenAI ${response.status}).`);
    const json = (await response.json()) as {
      model?: string;
      choices?: Array<{ message?: { content?: string | null } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const parsed = request.schema.safeParse(safeJson(json.choices?.[0]?.message?.content));
    if (!parsed.success) throw new Error(`The ${request.name} call came back unreadable.`);
    return {
      data: parsed.data,
      provider: "openai",
      model: json.model ?? TEXT_MODELS.openai[request.step],
      usage: { inputTokens: json.usage?.prompt_tokens ?? 0, outputTokens: json.usage?.completion_tokens ?? 0 },
    };
  }

  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const { zodOutputFormat } = await import("@anthropic-ai/sdk/helpers/zod");
  const client = new Anthropic({ apiKey: chosen.apiKey });
  const response = await client.messages.parse({
    model: TEXT_MODELS.anthropic[request.step],
    max_tokens: 1000,
    system: request.system,
    messages: [{ role: "user", content: request.user }],
    output_config: { format: zodOutputFormat(request.schema) },
  });
  const parsed = request.schema.safeParse(response.parsed_output);
  if (!parsed.success) throw new Error(`The ${request.name} call came back unreadable.`);
  return {
    data: parsed.data,
    provider: "anthropic",
    model: response.model,
    usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
  };
}

function safeJson(text: string | null | undefined): unknown {
  try {
    return JSON.parse(text ?? "");
  } catch {
    return null;
  }
}
