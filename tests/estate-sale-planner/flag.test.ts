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
    expect(parseFlagResponse({ items: [{ name: "x", room: "r", flagged: true, band: "priceless", reason: "r", confidence: "low", frame: 0, box: null }] })).toBeNull();
    expect(parseFlagResponse({ items: [{ name: "x", room: "r", flagged: true }] })).toBeNull();
    expect(parseFlagResponse("nope")).toBeNull();
  });

  it("accepts a null box and rejects a box outside 0–1", () => {
    const base = { name: "x", room: "r", flagged: true, band: "under $25", reason: "r", confidence: "low", frame: 0 };
    expect(parseFlagResponse({ items: [{ ...base, box: null }] })).not.toBeNull();
    expect(parseFlagResponse({ items: [{ ...base, box: { x: 0.1, y: 0.1, w: 0.5, h: 0.5 } }] })).not.toBeNull();
    expect(parseFlagResponse({ items: [{ ...base, box: { x: 1.2, y: 0, w: 0.5, h: 0.5 } }] })).toBeNull();
  });

  it("the fixture carries boxes for most items and null for a few", () => {
    const items = fixtureFlags().items;
    expect(items.filter((i) => i.box).length).toBeGreaterThan(items.length / 2);
    expect(items.some((i) => i.box === null)).toBe(true);
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
