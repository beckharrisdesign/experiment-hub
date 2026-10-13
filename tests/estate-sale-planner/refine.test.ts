import { describe, it, expect, vi, afterEach } from "vitest";
import { fixtureRefine, parseRefineResponse, refineUserText, type RefineInput } from "@/lib/estate-sale-planner/refine";
import { openAIRefineRequest, refineWithOpenAI } from "@/lib/estate-sale-planner/vision/openai";

const input: RefineInput = {
  item: { name: "Upright piano", room: "Dining room", band: "under $25", reason: "Uprights are usually free to a good home.", confidence: "high" },
  details: [{ data: "AAAA", at: 0 }, { data: "BBBB", at: 1 }],
  context: "Grandpa bought it new in 1958.",
};

describe("refineUserText", () => {
  it("carries the walkthrough read, the detail count, and what the family knows", () => {
    const text = refineUserText(input);
    expect(text).toContain("Upright piano (Dining room)");
    expect(text).toContain("under $25, high confidence");
    expect(text).toContain("2 detail photos follow");
    expect(text).toContain("What the family knows: Grandpa bought it new in 1958.");
    expect(refineUserText({ ...input, context: "  " })).not.toContain("What the family knows");
  });
});

describe("parseRefineResponse", () => {
  it("accepts a legible mark and a null one, rejects an unknown band", () => {
    expect(parseRefineResponse({ name: "Steinway upright", band: "over $2,000", reason: "Serial dates it to 1958.", confidence: "high", markReading: "Steinway & Sons 123456" })).not.toBeNull();
    expect(parseRefineResponse({ name: "x", band: "under $25", reason: "y", confidence: "low", markReading: null })).not.toBeNull();
    expect(parseRefineResponse({ name: "x", band: "priceless", reason: "y", confidence: "low", markReading: null })).toBeNull();
  });
});

describe("fixtureRefine", () => {
  it("keeps the item as it was and says so", () => {
    const r = fixtureRefine(input);
    expect(r).toMatchObject({ name: "Upright piano", band: "under $25", markReading: null, source: "fixture", provider: "fixture" });
  });
});

describe("openAIRefineRequest / refineWithOpenAI", () => {
  afterEach(() => vi.restoreAllMocks());

  it("sends the context text first, then every detail as a high-detail image, with a strict refine schema", () => {
    const body = openAIRefineRequest(input);
    const parts = body.messages[1].content as Array<{ type: string; text?: string; image_url?: { url: string; detail: string } }>;
    expect(parts[0].text).toContain("What the family knows");
    expect(parts.filter((p) => p.type === "image_url")).toHaveLength(2);
    expect(parts.find((p) => p.type === "image_url")?.image_url?.url).toBe("data:image/jpeg;base64,AAAA");
    expect(body.response_format.json_schema.name).toBe("refine_response");
    expect(body.response_format.json_schema.strict).toBe(true);
    const schema = body.response_format.json_schema.schema as any;
    expect(schema.required).toEqual(["name", "band", "reason", "confidence", "markReading"]);
  });

  it("returns the re-read with the mark it found", async () => {
    const f = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        model: "gpt-5",
        choices: [{ message: { content: JSON.stringify({ name: "Steinway upright", band: "over $2,000", reason: "Serial dates it to 1958.", confidence: "high", markReading: "Steinway & Sons 123456" }) } }],
        usage: { prompt_tokens: 900, completion_tokens: 80 },
      }),
    })) as unknown as typeof fetch;
    const r = await refineWithOpenAI(input, "sk", f);
    expect(r.provider).toBe("openai");
    expect(r.markReading).toBe("Steinway & Sons 123456");
    expect(r.band).toBe("over $2,000");
  });

  it("rejects an off-schema re-read", async () => {
    const f = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: "{}" } }] }) })) as unknown as typeof fetch;
    await expect(refineWithOpenAI(input, "sk", f)).rejects.toThrow(/unreadable/);
  });
});
