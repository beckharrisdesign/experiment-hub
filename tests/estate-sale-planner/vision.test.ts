import { describe, it, expect, vi, afterEach } from "vitest";
import { z } from "zod";
import { strictJsonSchema } from "@/lib/estate-sale-planner/vision/schema";
import { flagWithOpenAI, openAIRequest, OPENAI_URL } from "@/lib/estate-sale-planner/vision/openai";
import { FlagResponseSchema, visionProvider } from "@/lib/estate-sale-planner/flag";
import { VISION_MODELS } from "@/lib/estate-sale-planner/config";
import fixture from "@/lib/estate-sale-planner/fixtures/flags.json";

// ---------------------------------------------------------------------------
// Provider selection follows the hub's key order (ELK composer precedent)
// ---------------------------------------------------------------------------

describe("visionProvider", () => {
  it("prefers OPENAI_API_KEY, the hub's synced model key", () => {
    expect(visionProvider({ OPENAI_API_KEY: "sk-o", ANTHROPIC_API_KEY: "sk-a" })).toEqual({ provider: "openai", apiKey: "sk-o" });
  });
  it("falls back to ANTHROPIC_API_KEY", () => {
    expect(visionProvider({ ANTHROPIC_API_KEY: " sk-a " })).toEqual({ provider: "anthropic", apiKey: "sk-a" });
  });
  it("is null (fixture mode) with neither, and ignores blank values", () => {
    expect(visionProvider({})).toBeNull();
    expect(visionProvider({ OPENAI_API_KEY: "  " })).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// OpenAI strict schema: ranges dropped, objects closed, everything required
// ---------------------------------------------------------------------------

describe("strictJsonSchema", () => {
  const strict = strictJsonSchema(z.toJSONSchema(FlagResponseSchema)) as any;

  it("closes every object and requires every property", () => {
    expect(strict.additionalProperties).toBe(false);
    expect(strict.required).toEqual(["items"]);
    const item = strict.properties.items.items;
    expect(item.additionalProperties).toBe(false);
    expect(item.required).toEqual(["name", "room", "flagged", "band", "reason", "confidence", "frame", "box"]);
  });

  it("drops the range keywords strict mode rejects, keeps enums and nullability", () => {
    const text = JSON.stringify(strict);
    for (const k of ["minimum", "maximum", "minLength", "maxLength", "maxItems", "$schema"]) {
      expect(text).not.toContain(`"${k}"`);
    }
    const item = strict.properties.items.items;
    expect(item.properties.band.enum).toContain("over $2,000");
    expect(item.properties.frame.type).toBe("integer");
    expect(JSON.stringify(item.properties.box)).toContain('"null"');
  });
});

// ---------------------------------------------------------------------------
// Request shape and response handling, no network
// ---------------------------------------------------------------------------

const frames = [
  { data: "AAAA", at: 0 },
  { data: "BBBB", at: 2.5 },
];

describe("openAIRequest", () => {
  it("tells the model what is already listed when a room is added", () => {
    const body = openAIRequest(frames, [{ name: "Teak sideboard", room: "Living room" }, { name: "Recliner", room: "Living room" }]);
    const user = body.messages[1].content as Array<{ type: string; text?: string }>;
    const ctx = user.find((p) => p.text?.startsWith("Already listed"));
    expect(ctx?.text).toContain("- Teak sideboard (Living room)");
    expect(ctx?.text).toContain("- Recliner (Living room)");
    expect(user[user.length - 1].text).toContain("Return the items");
    const plain = openAIRequest(frames).messages[1].content as Array<{ text?: string }>;
    expect(plain.some((p) => p.text?.startsWith("Already listed"))).toBe(false);
  });

  it("sends every frame as a data-URL image with a strict json_schema response format", () => {
    const body = openAIRequest(frames);
    expect(body.model).toBe(VISION_MODELS.openai);
    expect(body.response_format.type).toBe("json_schema");
    expect(body.response_format.json_schema.strict).toBe(true);
    const user = body.messages[1].content as Array<{ type: string; image_url?: { url: string; detail: string } }>;
    const images = user.filter((p) => p.type === "image_url");
    expect(images).toHaveLength(2);
    expect(images[0].image_url?.url).toBe("data:image/jpeg;base64,AAAA");
    expect(body.messages[0].role).toBe("system");
  });
});

function fakeFetch(status: number, json: unknown) {
  return vi.fn(async () => ({ ok: status < 400, status, json: async () => json })) as unknown as typeof fetch;
}

describe("flagWithOpenAI", () => {
  afterEach(() => vi.restoreAllMocks());

  it("parses a structured completion into a model-sourced result", async () => {
    const f = fakeFetch(200, {
      model: "gpt-5-2026-01-01",
      choices: [{ message: { content: JSON.stringify(fixture) } }],
      usage: { prompt_tokens: 1200, completion_tokens: 300 },
    });
    const result = await flagWithOpenAI(frames, "sk-test", f);
    expect(result.source).toBe("model");
    expect(result.provider).toBe("openai");
    expect(result.model).toBe("gpt-5-2026-01-01");
    expect(result.items.length).toBe(fixture.items.length);
    expect(result.usage).toEqual({ inputTokens: 1200, outputTokens: 300 });
    const [url, init] = (f as any).mock.calls[0];
    expect(url).toBe(OPENAI_URL);
    expect(init.headers.authorization).toBe("Bearer sk-test");
  });

  it("surfaces a refusal as a plain error", async () => {
    const f = fakeFetch(200, { choices: [{ message: { content: null, refusal: "no" } }] });
    await expect(flagWithOpenAI(frames, "k", f)).rejects.toThrow(/declined/);
  });

  it("rejects an off-schema answer instead of forwarding it", async () => {
    const f = fakeFetch(200, { choices: [{ message: { content: JSON.stringify({ items: [{ name: "x" }] }) } }] });
    await expect(flagWithOpenAI(frames, "k", f)).rejects.toThrow(/unreadable/);
  });

  it("maps an HTTP failure to an error with the status", async () => {
    const f = fakeFetch(429, {});
    await expect(flagWithOpenAI(frames, "k", f)).rejects.toThrow(/429/);
  });
});
