import { describe, expect, it } from "vitest";
import {
  DMC_BY_HEX,
  DMC_BY_ID,
  DMC_THREADS,
  type DmcFamily,
} from "../lib/svg-to-stitch/dmc";

// The chart is the single source of truth for thread color, and the Figma
// "DMC Floss" variable library is generated from it. A duplicate id or hex
// would vanish silently into the Map lookups, so the invariants the chart
// claims are asserted here rather than assumed.

const FAMILIES: DmcFamily[] = [
  "Reds",
  "Pinks",
  "Oranges",
  "Yellows",
  "Greens",
  "Blues",
  "Purples",
  "Browns & Neutrals",
  "Grays & Black/White",
];

describe("DMC thread chart", () => {
  it("holds the full chart", () => {
    expect(DMC_THREADS).toHaveLength(454);
  });

  it("has a unique article number for every thread", () => {
    const ids = DMC_THREADS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(DMC_BY_ID.size).toBe(DMC_THREADS.length);
  });

  it("has a unique hex for every thread", () => {
    const hexes = DMC_THREADS.map((t) => t.hex);
    expect(new Set(hexes).size).toBe(hexes.length);
    expect(DMC_BY_HEX.size).toBe(DMC_THREADS.length);
  });

  it("normalizes every hex to lowercase #rrggbb", () => {
    const bad = DMC_THREADS.filter((t) => !/^#[0-9a-f]{6}$/.test(t.hex));
    expect(bad).toEqual([]);
  });

  it("files every thread under a known family", () => {
    const bad = DMC_THREADS.filter((t) => !FAMILIES.includes(t.family));
    expect(bad).toEqual([]);
  });

  it("round-trips every thread through both lookups", () => {
    for (const thread of DMC_THREADS) {
      expect(DMC_BY_ID.get(thread.id)).toBe(thread);
      expect(DMC_BY_HEX.get(thread.hex)).toBe(thread);
    }
  });

  it("keeps the named threads alongside the numbered ones", () => {
    expect(DMC_BY_ID.get("White")?.hex).toBe("#ffffff");
    expect(DMC_BY_ID.get("Ecru")?.name).toBe("Ecru/off-white");
    expect(DMC_BY_ID.get("B5200")?.name).toBe("SnowWhite");
  });

  it("carries the values the Figma library was generated from", () => {
    // Spot-check the threads whose hexes the hand-built library disagreed
    // with — the disagreement is why the chart became canonical.
    expect(DMC_BY_ID.get("350")?.hex).toBe("#e34446");
    expect(DMC_BY_ID.get("996")?.hex).toBe("#2fb5e9");
    expect(DMC_BY_ID.get("991")?.hex).toBe("#226d5c");
  });
});
