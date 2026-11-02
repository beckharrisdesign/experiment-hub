import { describe, it, expect } from "vitest";
import { applyComps, bandLine, compsKey, formatRange, lookupDue, lookupsDue, retryDue, type ItemComps } from "@/lib/estate-sale-planner/comps/item";
import type { CompsSummary } from "@/lib/estate-sale-planner/comps/summary";
import { applyReread } from "@/lib/estate-sale-planner/correction";
import { updateItem, type Session, type SessionItem } from "@/lib/estate-sale-planner/session";

const base: SessionItem = {
  id: "esp_a_0",
  name: "Lodge No. 8 skillet",
  room: "",
  band: "$100–$250",
  reason: "Cast iron sells.",
  confidence: "medium",
  flagged: true,
  frame: 0,
  box: null,
  destination: "sell",
} as SessionItem;
const sale = (items: SessionItem[]): Session => ({ id: "esp_a", createdAt: "2026-11-02T00:00:00Z", items, history: [] });

const ok: CompsSummary = {
  status: "ok",
  query: "lodge no 8 skillet",
  matched: 4,
  found: 5,
  rangeCents: [5500, 9400],
  band: "$50–$100",
  listings: [{ title: "Lodge 8", priceCents: 12000, soldAt: "2026-10-14T00:00:00Z", url: "https://www.ebay.com/itm/4" }],
};
const withComps = (item: SessionItem, summary: CompsSummary = ok): SessionItem => applyComps(sale([item]), item.id, compsKey(item), summary).items[0];

describe("when a lookup is due", () => {
  it("when an item first meets the gate: it lands at Sell and $100+, is set to Sell, or its band rises", () => {
    expect(lookupDue(undefined, base, undefined)).toBe(true);
    expect(lookupDue({ ...base, destination: "keep" }, base, undefined)).toBe(true);
    expect(lookupDue({ ...base, band: "$50–$100" }, base, undefined)).toBe(true);
  });

  it("not for Keep, Donate, undecided or under-threshold items, nor while a re-read is pending", () => {
    for (const next of [{ ...base, destination: "keep" as const }, { ...base, destination: undefined }, { ...base, band: "$50–$100" }, { ...base, rereadPending: true }] as SessionItem[]) {
      expect(lookupDue(undefined, next, undefined)).toBe(false);
    }
  });

  it("when a correction changes what a gated item is, but not when only its band moves", () => {
    const looked = withComps(base, { ...ok, rangeCents: [11000, 18000], band: "$100–$250" });
    expect(lookupDue(looked, { ...looked, name: "Griswold No. 8 skillet" }, undefined)).toBe(true);
    expect(lookupDue(looked, { ...looked, lot: { parts: [{ box: null, name: "a" }, { box: null, name: "b" }] } }, undefined)).toBe(true);
    expect(lookupDue(looked, { ...looked, band: "$250–$500" }, undefined)).toBe(false);
    expect(lookupDue({ ...looked, rereadPending: true }, { ...looked, name: "Griswold skillet" }, undefined)).toBe(true);
  });

  it("not once sold prices put the item under the threshold", () => {
    const looked = withComps(base);
    expect(looked.band).toBe("$50–$100");
    expect(lookupDue(looked, { ...looked, name: "Griswold No. 8 skillet" }, undefined)).toBe(false);
  });

  it("not merely because a sale was opened with gated items in it", () => {
    expect(lookupsDue(sale([base]), sale([base]), undefined)).toEqual([]);
    expect(lookupsDue(null, sale([base]), undefined)).toEqual(["esp_a_0"]);
  });

  it("on opening the item: never looked up for this subject, or the last try failed", () => {
    expect(retryDue(base, undefined)).toBe(true);
    expect(retryDue(withComps(base), undefined)).toBe(false);
    expect(retryDue(withComps(base, { status: "too-few", found: 1, matched: 0 }), undefined)).toBe(false);
    for (const status of ["error", "quota", "not-configured"] as const) {
      expect(retryDue(withComps(base, { status }), undefined)).toBe(true);
    }
    expect(retryDue({ ...base, band: "$25–$50" }, "$500–$2,000")).toBe(false);
  });
});

describe("a lookup landing", () => {
  it("sets the band from sales and marks where it came from", () => {
    const item = withComps(base);
    expect(item).toMatchObject({ band: "$50–$100", bandSource: "comps", comps: { status: "ok", matched: 4, key: compsKey(base) } });
  });

  it("keeps a band the family set, with the comps for reference", () => {
    const family = updateItem(sale([base]), base.id, { band: "$250–$500" }).items[0];
    const item = withComps(family);
    expect(item).toMatchObject({ band: "$250–$500", bandSource: "family", comps: { status: "ok" } });
    expect(bandLine(item, false)).toMatchObject({ kind: "family", comps: { matched: 4 } });
  });

  it("is dropped when the item became something else while it was in flight", () => {
    const s = sale([{ ...base, name: "Griswold skillet" }]);
    expect(applyComps(s, base.id, compsKey(base), ok)).toEqual(s);
  });

  it("leaves the model's band with too few matches, and a gated answer changes nothing", () => {
    expect(withComps(base, { status: "too-few", found: 2, matched: 1 })).toMatchObject({ band: "$100–$250", comps: { status: "too-few" } });
    const s = sale([base]);
    expect(applyComps(s, base.id, compsKey(base), { status: "gated" })).toBe(s);
  });

  it("a re-read of the same thing keeps the sold-price band; a renamed one goes back to the model's", () => {
    const looked = withComps(base);
    const same = applyReread(sale([looked]), base.id, { name: base.name, band: "$250–$500", reason: "r", confidence: "high", markReading: null }).items[0];
    expect(same).toMatchObject({ band: "$50–$100", bandSource: "comps" });
    const renamed = applyReread(sale([looked]), base.id, { name: "Griswold No. 8", band: "$250–$500", reason: "r", confidence: "high", markReading: null }).items[0];
    expect(renamed).toMatchObject({ band: "$250–$500", bandSource: "guess" });
  });
});

describe("the band line", () => {
  it("shows only checking, based-on-sales and set-by-you", () => {
    expect(bandLine(base, false)).toBeNull();
    expect(bandLine(base, true)).toEqual({ kind: "checking" });
    expect(bandLine(withComps(base), false)).toMatchObject({ kind: "comps", comps: { matched: 4 } });
    expect(bandLine(withComps(base, { status: "not-configured" }), false)).toBeNull();
    // Comps for an older name don't describe this one.
    const looked = withComps(base);
    expect(bandLine({ ...looked, name: "Something else" }, false)).toBeNull();
  });

  it("formats a range in whole dollars", () => {
    expect(formatRange([5500, 9400])).toBe("$55–$94");
    expect(formatRange([4000, 4000])).toBe("$40");
    expect(formatRange([150000, 240000])).toBe("$1,500–$2,400");
  });

  it("keys on the subject, not the band", () => {
    const key = compsKey(base);
    expect(compsKey({ ...base, band: "$500–$2,000" } as SessionItem)).toBe(key);
    expect(compsKey({ ...base, name: "lodge no 8 SKILLET" })).toBe(key);
    expect(compsKey({ ...base, markReading: "LODGE 8" })).not.toBe(key);
  });
});

// Type-level: a stored lookup never carries "gated".
const _stored: ItemComps["status"][] = ["ok", "too-few", "not-configured", "error", "quota"];
void _stored;
