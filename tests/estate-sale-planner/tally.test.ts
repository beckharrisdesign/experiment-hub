import { describe, it, expect } from "vitest";
import { formatTally, tally, tallies } from "@/lib/estate-sale-planner/tally";
import type { Session, SessionItem } from "@/lib/estate-sale-planner/session";

const item = (band: SessionItem["band"], destination?: SessionItem["destination"]): SessionItem => ({
  id: Math.random().toString(36).slice(2),
  name: "x",
  room: "r",
  flagged: true,
  band,
  reason: "r",
  confidence: "low",
  frame: 0,
  box: null,
  destination,
});

describe("tally", () => {
  it("sums each band's low and high ends", () => {
    expect(tally([item("under $25"), item("$25–$100"), item("$100–$500")])).toEqual({ count: 3, low: 125, high: 625 });
  });

  it("an open-ended band makes the high end open", () => {
    expect(tally([item("$500–$2,000"), item("over $2,000")])).toEqual({ count: 2, low: 2500, high: null });
  });

  it("nothing is zero", () => {
    expect(tally([])).toEqual({ count: 0, low: 0, high: 0 });
  });
});

describe("tallies", () => {
  it("splits by destination and counts what is still unsorted", () => {
    const s = { items: [item("$100–$500", "sell"), item("$25–$100", "sell"), item("under $25", "donate"), item("$500–$2,000", "keep"), item("$25–$100")] } as Session;
    const t = tallies(s);
    expect(t.sell).toEqual({ count: 2, low: 125, high: 600 });
    expect(t.donate).toEqual({ count: 1, low: 0, high: 25 });
    expect(t.keep).toEqual({ count: 1, low: 500, high: 2000 });
    expect(t.unsorted).toBe(1);
  });
});

describe("formatTally", () => {
  it("reads as a dollar range", () => {
    expect(formatTally({ count: 3, low: 125, high: 625 })).toBe("$125–$625");
    expect(formatTally({ count: 12, low: 2500, high: 14000 })).toBe("$2,500–$14,000");
  });

  it("an open high end reads as a floor", () => {
    expect(formatTally({ count: 2, low: 2500, high: null })).toBe("$2,500+");
  });

  it("a low end of zero reads as up to", () => {
    expect(formatTally({ count: 1, low: 0, high: 25 })).toBe("Up to $25");
  });

  it("nothing reads as $0", () => {
    expect(formatTally({ count: 0, low: 0, high: 0 })).toBe("$0");
  });
});
