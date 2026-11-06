import { describe, it, expect } from "vitest";
import { applyComps, bandLine, checkAction, compsKey, formatRange, gateBand, isEligible, possibleMatches, togglePick, type ItemComps } from "@/lib/estate-sale-planner/comps/item";
import type { SoldListing } from "@/lib/estate-sale-planner/comps/provider";
import type { CompsSummary } from "@/lib/estate-sale-planner/comps/summary";
import { applyMessage, applyReread } from "@/lib/estate-sale-planner/correction";
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
const SALE: SoldListing = { title: "Teak roll top desk", priceCents: 90_000, soldAt: "2026-10-02T12:00:00Z", url: "https://www.ebay.com/itm/1", image: "https://i.ebayimg.com/1.jpg" };
const withComps = (item: SessionItem, summary: CompsSummary = ok): SessionItem => applyComps(sale([item]), item.id, compsKey(item), summary).items[0];

describe("who can be checked", () => {
  it("a Sell item at or above the threshold, judged on the price from before any sold prices", () => {
    expect(isEligible(base, undefined)).toBe(true);
    expect(isEligible({ ...base, destination: "keep" }, undefined)).toBe(false);
    expect(isEligible({ ...base, band: "$25–$50" }, undefined)).toBe(false);
    // An item priced by text before D25 can sit under the threshold; that mustn't end its checks.
    const old: SessionItem = { ...base, band: "$50–$100", bandSource: "comps", guessBand: "$100–$250" };
    expect(gateBand(old)).toBe("$100–$250");
    expect(isEligible(old, undefined)).toBe(true);
  });
});

describe("the check button", () => {
  const MIN = "$100–$250";
  const NOW = new Date(2026, 10, 6, 15, 0).getTime();
  const next = new Date(2026, 10, 7, 10, 12).toISOString();
  const ONCE = "One check per item per day.";

  it("is offered on an eligible item that hasn't been checked", () => {
    expect(checkAction(base, null, false, MIN, NOW)).toEqual({ label: "Check sold prices", disabled: false, caption: ONCE });
  });

  it("isn't there for an item that can't be checked", () => {
    expect(checkAction({ ...base, destination: "donate" }, null, false, MIN, NOW)).toBeNull();
    expect(checkAction({ ...base, band: "$25–$50" }, null, false, MIN, NOW)).toBeNull();
  });

  it("is disabled while checking, and while a re-read is landing", () => {
    expect(checkAction(base, null, true, MIN, NOW)).toEqual({ label: "Checking…", disabled: true, caption: ONCE });
    expect(checkAction({ ...base, rereadPending: true } as SessionItem, null, false, MIN, NOW)).toEqual({ label: "Check sold prices", disabled: true, caption: ONCE });
  });

  it("is disabled for 24 hours after a check, and says when it comes back", () => {
    expect(checkAction(base, next, false, MIN, NOW)).toEqual({ label: "Check sold prices", disabled: true, caption: "You can check this item again Nov 7 at 10:12 AM." });
    // A rename doesn't reset the day.
    expect(checkAction({ ...base, name: "Griswold skillet" }, next, false, MIN, NOW)?.disabled).toBe(true);
    const later = new Date(2026, 10, 7, 10, 12).getTime();
    expect(checkAction(base, next, false, MIN, later)).toEqual({ label: "Check sold prices", disabled: false, caption: ONCE });
  });

  it("offers another try after a failure, which doesn't use up the day", () => {
    for (const status of ["error", "quota", "not-configured"] as const) {
      expect(checkAction(withComps(base, { status }), null, false, MIN, NOW)).toEqual({ label: "Try again", disabled: false, caption: null });
    }
  });
});

describe("a lookup landing", () => {
  it("records what it found, and never changes the price", () => {
    const item = withComps(base);
    expect(item).toMatchObject({ band: "$100–$250", comps: { status: "ok", matched: 4, key: compsKey(base) } });
    expect(item.bandSource).toBeUndefined();
  });

  it("keeps a band the family set", () => {
    const family = updateItem(sale([base]), base.id, { band: "$250–$500" }).items[0];
    expect(withComps(family)).toMatchObject({ band: "$250–$500", bandSource: "family", comps: { status: "ok" } });
  });

  it("keeps a sale the family picked", () => {
    const picked = togglePick(sale([base]), base.id, SALE).items[0];
    expect(withComps(picked)).toMatchObject({ band: "$500–$2,000", bandSource: "picked", picked: { listing: SALE } });
  });

  it("puts an item priced by text before this change back on its first estimate", () => {
    const old: SessionItem = { ...base, band: "$50–$100", bandSource: "comps", guessBand: "$100–$250" };
    const after = withComps(old);
    expect(after).toMatchObject({ band: "$100–$250", bandSource: "guess" });
    expect(after.guessBand).toBeUndefined();
    const failed = applyComps(sale([old]), base.id, compsKey(old), { status: "error" }).items[0];
    expect(failed).toMatchObject({ band: "$100–$250", bandSource: "guess" });
  });

  it("gives back the first estimate when an old text price is renamed", () => {
    const old: SessionItem = { ...base, band: "$50–$100", bandSource: "comps", guessBand: "$100–$250" };
    expect(updateItem(sale([old]), base.id, { name: "Griswold No. 8 skillet" }).items[0]).toMatchObject({ band: "$100–$250", bandSource: "guess" });
  });

  it("is dropped when the item became something else while it was in flight", () => {
    const s = sale([{ ...base, name: "Griswold skillet" }]);
    expect(applyComps(s, base.id, compsKey(base), ok)).toEqual(s);
  });

  it("changes nothing when gated or limited", () => {
    const s = sale([base]);
    expect(applyComps(s, base.id, compsKey(base), { status: "gated" })).toBe(s);
    expect(applyComps(s, base.id, compsKey(base), { status: "limited" })).toBe(s);
  });
});

describe("picking a match", () => {
  const pick = (item: SessionItem = base, listing = SALE) => togglePick(sale([item]), item.id, listing).items[0];

  it("sets the price from that sale, and says so", () => {
    const item = pick();
    expect(item).toMatchObject({ band: "$500–$2,000", bandSource: "picked", picked: { listing: SALE, before: { band: "$100–$250" } } });
    expect(bandLine(item, false, "$100–$250")).toEqual({ kind: "picked", priceCents: 90_000 });
  });

  it("works with a single sale: there's no three-sale minimum", () => {
    const item = withComps(base, { status: "too-few", found: 1, matched: 1 });
    expect(togglePick(sale([item]), item.id, SALE).items[0]).toMatchObject({ bandSource: "picked", band: "$500–$2,000" });
  });

  it("restores the price from before when tapped again", () => {
    const item = togglePick(sale([pick()]), base.id, SALE).items[0];
    expect(item).toMatchObject({ band: "$100–$250" });
    expect(item.bandSource).toBeUndefined();
    expect(item.picked).toBeUndefined();
  });

  it("replaces a price you typed in, and gives it back on undo", () => {
    const family = updateItem(sale([base]), base.id, { band: "$250–$500" }).items[0];
    const picked = pick(family);
    expect(picked).toMatchObject({ band: "$500–$2,000", bandSource: "picked" });
    expect(togglePick(sale([picked]), base.id, SALE).items[0]).toMatchObject({ band: "$250–$500", bandSource: "family" });
  });

  it("switching to another sale still undoes to the original price", () => {
    const other = { ...SALE, url: "https://www.ebay.com/itm/2", priceCents: 30_000 };
    const switched = pick(pick(), other);
    expect(switched).toMatchObject({ band: "$250–$500", picked: { listing: other, before: { band: "$100–$250" } } });
    expect(togglePick(sale([switched]), base.id, other).items[0]).toMatchObject({ band: "$100–$250" });
  });

  it("stays through a rename and a re-read, since you chose it", () => {
    const picked = pick();
    expect(updateItem(sale([picked]), base.id, { name: "Teak desk" }).items[0]).toMatchObject({ band: "$500–$2,000", bandSource: "picked" });
    const reread = applyReread(sale([picked]), base.id, { name: "Teak desk", band: "$25–$50", reason: "r", confidence: "high", markReading: null }).items[0];
    expect(reread).toMatchObject({ band: "$500–$2,000", bandSource: "picked", picked: { listing: SALE } });
  });

  it("stays through an adjust-by-message, whose estimate doesn't outrank it", () => {
    const after = applyMessage(sale([pick()]), base.id, "It's walnut", { name: "Walnut desk", band: "$25–$50", reason: "r", confidence: "high", markReading: null }).items[0];
    expect(after).toMatchObject({ name: "Walnut desk", band: "$500–$2,000", bandSource: "picked" });
  });

  it("gives way when you set the price by hand", () => {
    const after = updateItem(sale([pick()]), base.id, { band: "$50–$100" }).items[0];
    expect(after).toMatchObject({ band: "$50–$100", bandSource: "family" });
    expect(after.picked).toBeUndefined();
  });

  it("doesn't change who can be checked", () => {
    const low = pick(base, { ...SALE, priceCents: 2_000 });
    expect(low.band).toBe("$10–$25");
    expect(gateBand(low)).toBe("$100–$250");
    expect(isEligible(low, undefined)).toBe(true);
  });
});

describe("which matches to show", () => {
  const sales = (n: number) => Array.from({ length: n }, (_, i) => ({ ...SALE, url: `https://www.ebay.com/itm/${i}` }));

  it("shows the first five, in the order the check ranked them", () => {
    expect(possibleMatches(sales(7), null).map((l) => l.url)).toEqual([0, 1, 2, 3, 4].map((i) => `https://www.ebay.com/itm/${i}`));
  });

  it("keeps a picked sale on show, even when a later check didn't find it", () => {
    const gone = { ...SALE, url: "https://www.ebay.com/itm/gone" };
    const shown = possibleMatches(sales(7), gone);
    expect(shown).toHaveLength(5);
    expect(shown[0]).toEqual(gone);
    expect(possibleMatches([], gone)).toEqual([gone]);
    // Already among the five: no duplicate, and its place stays.
    expect(possibleMatches(sales(3), sales(3)[1]).map((l) => l.url)).toEqual(sales(3).map((l) => l.url));
  });
});

describe("the band line", () => {
  const MIN = "$100–$250";
  const why = (text: string) => ({ kind: "why", text });
  const NOT_USED = "This didn't use today's check.";

  it("shows checking and set-by-you, and an old text price says where it came from", () => {
    expect(bandLine(base, true, MIN)).toEqual({ kind: "checking" });
    expect(bandLine({ ...base, bandSource: "family" } as SessionItem, false, MIN)).toEqual({ kind: "family" });
    const key = compsKey(base);
    const old = { ...base, bandSource: "comps", comps: { status: "ok", matched: 4, key, at: "2026-11-05T00:00:00Z" } } as SessionItem;
    expect(bandLine(old, false, MIN)).toMatchObject({ kind: "comps", comps: { matched: 4 } });
  });

  it("offers matches without pricing them", () => {
    const after = (status: "ok" | "too-few", matched?: number) => bandLine(withComps(base, { status, matched }), false, MIN);
    expect(after("ok", 5)).toEqual(why("5 possible matches. Not priced until you pick one."));
    expect(after("ok", 9)).toEqual(why("5 possible matches. Not priced until you pick one."));
    expect(after("too-few", 2)).toEqual(why("2 possible matches. Not priced until you pick one."));
    expect(after("too-few", 1)).toEqual(why("1 possible match. Not priced until you pick it."));
    const none = why("No possible matches found. The price is still the first estimate.");
    expect(after("too-few", 0)).toEqual(none);
    expect(after("too-few", undefined)).toEqual(none);
  });

  it("stays blank when there's nothing to report: the button says the rest", () => {
    expect(bandLine(base, false, MIN)).toBeNull();
    // Comps for an older name don't describe this one.
    const looked = withComps(base);
    expect(bandLine(updateItem(sale([looked]), base.id, { name: "Something else" }).items[0], false, MIN)).toBeNull();
    expect(bandLine({ ...withComps(base, { status: "error" }), rereadPending: true } as SessionItem, false, MIN)).toBeNull();
  });

  it("says when an item isn't eligible for a lookup", () => {
    const sellOnly = why("Sold prices are only checked for items marked Sell.");
    expect(bandLine({ ...base, destination: "donate" }, false, MIN)).toEqual(sellOnly);
    expect(bandLine({ ...base, destination: "keep" }, false, MIN)).toEqual(sellOnly);
    expect(bandLine({ ...base, destination: undefined } as SessionItem, false, MIN)).toEqual(sellOnly);
    const cheap: SessionItem = { ...base, band: "$25–$50" };
    expect(bandLine(cheap, false, MIN)).toEqual(why("Sold prices are only checked for items at $100+. You can change that in Account & profile."));
    expect(bandLine(cheap, false, "$500–$2,000")).toEqual(why("Sold prices are only checked for items at $500+. You can change that in Account & profile."));
    // Lowering the threshold makes the same item eligible.
    expect(bandLine(cheap, false, "$25–$50")).toBeNull();
  });

  it("says when a lookup couldn't run", () => {
    const after = (status: CompsSummary["status"]) => bandLine(withComps(base, { status }), false, MIN);
    expect(after("error")).toEqual(why(`Couldn't check sold prices. ${NOT_USED}`));
    expect(after("quota")).toEqual(why(`Sold-price checks have hit their limit. ${NOT_USED}`));
    expect(after("not-configured")).toEqual(why("Sold-price checks aren't set up here yet."));
  });

  it("lets the current state win over a stale reason", () => {
    const failed = withComps(base, { status: "error" });
    expect(bandLine(failed, true, MIN)).toEqual({ kind: "checking" });
    expect(bandLine({ ...failed, bandSource: "family" } as SessionItem, false, MIN)).toEqual({ kind: "family" });
    // Sent to Donate after a failed lookup: the failure no longer matters.
    expect(bandLine({ ...failed, destination: "donate" }, false, MIN)).toEqual(why("Sold prices are only checked for items marked Sell."));
    // A picked price still says so after the item moves to Donate.
    expect(bandLine({ ...togglePick(sale([base]), base.id, SALE).items[0], destination: "donate" }, false, MIN)).toMatchObject({ kind: "picked" });
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
