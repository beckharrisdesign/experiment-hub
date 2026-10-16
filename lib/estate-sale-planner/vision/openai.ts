/**
 * OpenAI vision adapter — the default, because OPENAI_API_KEY is the hub's
 * one synced model key. Plain fetch against Chat Completions with a strict
 * JSON-schema response format (same transport as the ELK composer; no SDK).
 * One generic structured call serves both the walkthrough pass and the
 * detail-shot re-read.
 */
import { z } from "zod";
import { VISION_MODELS } from "../config";
import { FlagResponseSchema, SYSTEM_PROMPT, knownContext, parseFlagResponse, type FlagResult, type FrameInput, type KnownItem } from "../flag";
import { REFINE_PROMPT, RefineResponseSchema, parseRefineResponse, refineUserText, type RefineInput, type RefineResult } from "../refine";
import { strictJsonSchema } from "./schema";

export const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string; detail: "low" | "high" | "auto" } };

export const imagePart = (f: FrameInput): ContentPart => ({
  type: "image_url",
  image_url: { url: `data:image/jpeg;base64,${f.data}`, detail: "high" },
});

export interface StructuredRequest {
  system: string;
  parts: ContentPart[];
  schema: z.ZodType;
  name: string;
}

export function openAIBody({ system, parts, schema, name }: StructuredRequest) {
  return {
    model: VISION_MODELS.openai,
    max_completion_tokens: 16000,
    messages: [
      { role: "system", content: system },
      { role: "user", content: parts },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name, strict: true, schema: strictJsonSchema(z.toJSONSchema(schema)) },
    },
  };
}

/** The walkthrough request body, exported so a test can pin the shape without a network. */
export function openAIRequest(frames: FrameInput[], known?: KnownItem[]) {
  const parts: ContentPart[] = [];
  frames.forEach((f, i) => {
    parts.push({ type: "text", text: `Frame ${i} (${f.at}s)` });
    parts.push(imagePart(f));
  });
  const ctx = knownContext(known);
  if (ctx) parts.push({ type: "text", text: ctx });
  parts.push({ type: "text", text: `These ${frames.length} frames are one walkthrough. Return the items.` });
  return openAIBody({ system: SYSTEM_PROMPT, parts, schema: FlagResponseSchema, name: "flag_response" });
}

interface ChatCompletion {
  model?: string;
  choices?: Array<{ message?: { content?: string | null; refusal?: string | null } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

async function structured(body: ReturnType<typeof openAIBody>, apiKey: string, fetchImpl: typeof fetch) {
  const response = await fetchImpl(OPENAI_URL, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`The vision pass failed (OpenAI ${response.status}).`);
  const json = (await response.json()) as ChatCompletion;
  const message = json.choices?.[0]?.message;
  if (message?.refusal) throw new Error("The vision pass declined this walkthrough.");
  let raw: unknown;
  try {
    raw = JSON.parse(message?.content ?? "");
  } catch {
    throw new Error("The vision pass returned an unreadable response.");
  }
  return {
    raw,
    model: json.model ?? VISION_MODELS.openai,
    usage: { inputTokens: json.usage?.prompt_tokens ?? 0, outputTokens: json.usage?.completion_tokens ?? 0 },
  };
}

export async function flagWithOpenAI(frames: FrameInput[], apiKey: string, fetchImpl: typeof fetch = fetch, known?: KnownItem[]): Promise<FlagResult> {
  const { raw, model, usage } = await structured(openAIRequest(frames, known), apiKey, fetchImpl);
  const parsed = parseFlagResponse(raw);
  if (!parsed) throw new Error("The vision pass returned an unreadable response.");
  return { ...parsed, source: "model", provider: "openai", model, usage };
}

export function openAIRefineRequest(input: RefineInput) {
  const parts: ContentPart[] = [{ type: "text", text: refineUserText(input) }];
  input.details.forEach((d, i) => {
    parts.push({ type: "text", text: `Detail ${i + 1}` });
    parts.push(imagePart(d));
  });
  return openAIBody({ system: REFINE_PROMPT, parts, schema: RefineResponseSchema, name: "refine_response" });
}

export async function refineWithOpenAI(input: RefineInput, apiKey: string, fetchImpl: typeof fetch = fetch): Promise<RefineResult> {
  const { raw, model, usage } = await structured(openAIRefineRequest(input), apiKey, fetchImpl);
  const parsed = parseRefineResponse(raw);
  if (!parsed) throw new Error("The re-read came back unreadable.");
  return { ...parsed, source: "model", provider: "openai", model, usage };
}
