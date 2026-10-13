import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { fixtureFlags, flagFrames, parseFlagResponse, visionConfigured } from "@/lib/estate-sale-planner/flag";

const saved = process.env.ANTHROPIC_API_KEY;
beforeEach(() => {
  delete process.env.ANTHROPIC_API_KEY;
});
afterEach(() => {
  if (saved !== undefined) process.env.ANTHROPIC_API_KEY = saved;
});

// ---------------------------------------------------------------------------
// Schema validation
// ---------------------------------------------------------------------------

describe("parseFlagResponse", () => {
  it("accepts the fixture", () => {
    expect(fixtureFlags().items.length).toBeGreaterThan(5);
  });

  it("rejects an unknown band or a missing field", () => {
    expect(parseFlagResponse({ items: [{ name: "x", room: "r", flagged: true, band: "priceless", reason: "r", confidence: "low", frame: 0 }] })).toBeNull();
    expect(parseFlagResponse({ items: [{ name: "x", room: "r", flagged: true }] })).toBeNull();
    expect(parseFlagResponse("nope")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// No-key path
// ---------------------------------------------------------------------------

describe("flagFrames without ANTHROPIC_API_KEY", () => {
  it("serves the fixture and says so", async () => {
    expect(visionConfigured()).toBe(false);
    const result = await flagFrames([{ data: "AAAA", at: 0 }]);
    expect(result.source).toBe("fixture");
    expect(result.items.some((i) => i.flagged)).toBe(true);
    expect(result.items.some((i) => !i.flagged)).toBe(true);
  });
});
