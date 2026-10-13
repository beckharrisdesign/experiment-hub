/**
 * OpenAI vision adapter — the default, because OPENAI_API_KEY is the hub's
 * one synced model key. Plain fetch against Chat Completions with a strict
 * JSON-schema response format (same transport as the ELK composer; no SDK).
 */
import { z } from "zod";
import { VISION_MODELS } from "../config";
import { FlagResponseSchema, SYSTEM_PROMPT, parseFlagResponse, type FlagResult, type FrameInput } from "../flag";
import { strictJsonSchema } from "./schema";

export const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string; detail: "low" | "high" | "auto" } };

/** The request body, exported so a test can pin the shape without a network. */
export function openAIRequest(frames: FrameInput[]) {
  const content: ContentPart[] = [];
  frames.forEach((f, i) => {
    content.push({ type: "text", text: `Frame ${i} (${f.at}s)` });
    content.push({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${f.data}`, detail: "high" } });
  });
  content.push({ type: "text", text: `These ${frames.length} frames are one walkthrough. Return the items.` });

  return {
    model: VISION_MODELS.openai,
    max_completion_tokens: 16000,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "flag_response", strict: true, schema: strictJsonSchema(z.toJSONSchema(FlagResponseSchema)) },
    },
  };
}

interface ChatCompletion {
  model?: string;
  choices?: Array<{ message?: { content?: string | null; refusal?: string | null } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

export async function flagWithOpenAI(frames: FrameInput[], apiKey: string, fetchImpl: typeof fetch = fetch): Promise<FlagResult> {
  const response = await fetchImpl(OPENAI_URL, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(openAIRequest(frames)),
  });
  if (!response.ok) throw new Error(`The vision pass failed (OpenAI ${response.status}).`);
  const body = (await response.json()) as ChatCompletion;
  const message = body.choices?.[0]?.message;
  if (message?.refusal) throw new Error("The vision pass declined this walkthrough.");

  let raw: unknown;
  try {
    raw = JSON.parse(message?.content ?? "");
  } catch {
    throw new Error("The vision pass returned an unreadable response.");
  }
  const parsed = parseFlagResponse(raw);
  if (!parsed) throw new Error("The vision pass returned an unreadable response.");

  return {
    ...parsed,
    source: "model",
    provider: "openai",
    model: body.model ?? VISION_MODELS.openai,
    usage: { inputTokens: body.usage?.prompt_tokens ?? 0, outputTokens: body.usage?.completion_tokens ?? 0 },
  };
}
