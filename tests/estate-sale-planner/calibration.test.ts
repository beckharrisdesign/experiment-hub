import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  SYSTEM_PROMPT,
  capConfidence,
  flagFrames,
  type FlaggedItem,
} from "@/lib/estate-sale-planner/flag";
import { REFINE_PROMPT, refineItem } from "@/lib/estate-sale-planner/refine";

vi.mock("@/lib/estate-sale-planner/vision/openai", () => ({
  flagWithOpenAI: vi.fn(async () => ({
    items: [
      {
        name: "Teak sideboard",
        room: "Dining",
        flagged: true,
        band: "$500–$2,000",
        reason: "r",
        confidence: "high",
        frame: 0,
        box: null,
      },
      {
        name: "Oil painting",
        room: "Hall",
        flagged: true,
        band: "over $2,000",
        reason: "r",
        confidence: "high",
        frame: 0,
        box: null,
      },
      {
        name: "Stand mixer",
        room: "Kitchen",
        flagged: true,
        band: "$100–$500",
        reason: "r",
        confidence: "high",
        frame: 0,
        box: null,
      },
    ],
    source: "model",
    provider: "openai",
    model: "test",
  })),
  refineWithOpenAI: vi.fn(async (input: { context?: string }) => ({
    name: "Sideboard",
    band: "over $2,000",
    reason: "r",
    confidence: "high",
    markReading: input.context === "mark" ? "Drexel, 1962" : null,
    source: "model",
    provider: "openai",
    model: "test",
  })),
}));

const savedOpenAI = process.env.OPENAI_API_KEY;
const savedAnthropic = process.env.ANTHROPIC_API_KEY;
beforeEach(() => {
  process.env.OPENAI_API_KEY = "test-key";
  delete process.env.ANTHROPIC_API_KEY;
});
afterEach(() => {
  if (savedOpenAI === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = savedOpenAI;
  if (savedAnthropic !== undefined)
    process.env.ANTHROPIC_API_KEY = savedAnthropic;
});

type Read = Pick<FlaggedItem, "band" | "confidence">;
const read = (band: Read["band"], confidence: Read["confidence"]): Read => ({
  band,
  confidence,
});

// ---------------------------------------------------------------------------
// The cap: a photo with no legible mark cannot carry a confident high price
// ---------------------------------------------------------------------------

describe("capConfidence without a mark", () => {
  it("caps $500–$2,000 at medium and over $2,000 at low", () => {
    expect(capConfidence(read("$500–$2,000", "high"), null).confidence).toBe(
      "medium",
    );
    expect(capConfidence(read("over $2,000", "high"), null).confidence).toBe(
      "low",
    );
    expect(capConfidence(read("over $2,000", "medium"), null).confidence).toBe(
      "low",
    );
  });

  it("never raises confidence and leaves bands under $500 alone", () => {
    expect(capConfidence(read("$500–$2,000", "low"), null).confidence).toBe(
      "low",
    );
    expect(capConfidence(read("$100–$500", "high"), null).confidence).toBe(
      "high",
    );
    expect(capConfidence(read("under $25", "high"), null).confidence).toBe(
      "high",
    );
  });

  it("never changes the band", () => {
    expect(capConfidence(read("over $2,000", "high"), null).band).toBe(
      "over $2,000",
    );
  });
});

describe("capConfidence with a legible mark", () => {
  it("trusts the model's confidence", () => {
    expect(
      capConfidence(read("over $2,000", "high"), "Drexel, 1962").confidence,
    ).toBe("high");
    expect(
      capConfidence(read("$500–$2,000", "high"), "Rookwood flame mark")
        .confidence,
    ).toBe("high");
  });

  it("treats a blank reading as no mark", () => {
    expect(capConfidence(read("over $2,000", "high"), "   ").confidence).toBe(
      "low",
    );
  });
});

// ---------------------------------------------------------------------------
// Applied on the way out of both passes
// ---------------------------------------------------------------------------

describe("flagFrames applies the cap to the walkthrough pass", () => {
  it("lowers confidence on high bands, keeps it below $500", async () => {
    const result = await flagFrames([{ data: "AAAA", at: 0 }]);
    expect(result.items.map((i) => [i.name, i.band, i.confidence])).toEqual([
      ["Teak sideboard", "$500–$2,000", "medium"],
      ["Oil painting", "over $2,000", "low"],
      ["Stand mixer", "$100–$500", "high"],
    ]);
  });
});

describe("refineItem applies the cap unless a mark was read", () => {
  const item = {
    name: "Sideboard",
    room: "Dining",
    band: "$500–$2,000",
    reason: "r",
    confidence: "medium",
  };
  const details = [{ data: "AAAA", at: 0 }];

  it("no mark: over $2,000 comes back low", async () => {
    const result = await refineItem({ item, details });
    expect(result.markReading).toBeNull();
    expect(result.confidence).toBe("low");
  });

  it("a legible mark: the model's high stands", async () => {
    const result = await refineItem({ item, details, context: "mark" });
    expect(result.markReading).toBe("Drexel, 1962");
    expect(result.confidence).toBe("high");
  });
});

// ---------------------------------------------------------------------------
// The prompts name the price they mean
// ---------------------------------------------------------------------------

describe("prompts anchor the band to a realistic sale", () => {
  it("the walkthrough prompt names the channel, the base rate, and the tie-break", () => {
    expect(SYSTEM_PROMPT).toMatch(
      /estate sale, garage sale, or Facebook Marketplace/,
    );
    expect(SYSTEM_PROMPT).toMatch(/not retail/i);
    expect(SYSTEM_PROMPT).toMatch(
      /most things in a house sell for under \$25/i,
    );
    expect(SYSTEM_PROMPT).toMatch(/choose the lower/i);
  });

  it("the walkthrough prompt defines each confidence level", () => {
    expect(SYSTEM_PROMPT).toMatch(/"high" means/);
    expect(SYSTEM_PROMPT).toMatch(/"medium" means/);
    expect(SYSTEM_PROMPT).toMatch(/"low" means/);
  });

  it("the re-read prompt carries the same price anchor", () => {
    expect(REFINE_PROMPT).toMatch(
      /estate sale, garage sale, or Facebook Marketplace/,
    );
    expect(REFINE_PROMPT).toMatch(/choose the lower/i);
  });
});
