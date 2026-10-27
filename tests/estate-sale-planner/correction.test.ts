/**
 * Item correction (sold-comps spec: item-correction). Pure reducers over a
 * Session: confirm, adjust, split, add, merge, lot, a message with undo, and
 * the re-read landing (or failing) after any of them.
 */
import { describe, it, expect } from "vitest";
import type { Session, SessionItem } from "@/lib/estate-sale-planner/session";
import { setDestination, updateItem } from "@/lib/estate-sale-planner/session";
import {
  addFromPhoto,
  adjustBox,
  applyMessage,
  applyReread,
  boundingBox,
  confirmItem,
  failReread,
  markLot,
  mergeItems,
  splitItem,
  splitLot,
  undoMessage,
} from "@/lib/estate-sale-planner/correction";

const box = (x: number, y: number, w = 0.1, h = 0.1) => ({ x, y, w, h });
const base = (id: string, over: Partial<SessionItem> = {}): SessionItem => ({
  id,
  name: id,
  room: "Living room",
  flagged: true,
  band: "$25–$50",
  reason: "r",
  confidence: "medium",
  frame: 2,
  box: box(0.1, 0.1),
  photoId: "esp_s/2",
  ...over,
});
const sale = (items: SessionItem[]): Session => ({ id: "esp_s", createdAt: "2026-10-27T00:00:00Z", items, history: [] });
const get = (s: Session, id: string) => s.items.find((i) => i.id === id)!;

describe("confirm", () => {
  it("Looks right marks the item confirmed", () => {
    expect(get(confirmItem(sale([base("a")]), "a"), "a").confirmed).toBe(true);
  });

  it("editing a confirmed item's name or band keeps it confirmed, and a band edit is the family's", () => {
    let s = confirmItem(sale([base("a")]), "a");
    s = updateItem(s, "a", { name: "Mantel clock", band: "$50–$100" });
    expect(get(s, "a")).toMatchObject({ confirmed: true, bandSource: "family", band: "$50–$100" });
  });

  it("a rename alone leaves the band source alone", () => {
    const s = updateItem(sale([base("a")]), "a", { name: "Clock" });
    expect(get(s, "a").bandSource).toBeUndefined();
  });
});

describe("adjust", () => {
  it("saves the new box and picture, confirms, and waits for the re-read", () => {
    const s = adjustBox(sale([base("a")]), "a", box(0.3, 0.3, 0.2, 0.2), "data:new");
    expect(get(s, "a")).toMatchObject({ box: box(0.3, 0.3, 0.2, 0.2), image: "data:new", confirmed: true, rereadPending: true });
  });

  it("when the re-read fails, the box and picture stay, the old read stays, and it says it is not re-read", () => {
    let s = adjustBox(sale([base("a", { name: "Side table" })]), "a", box(0.3, 0.3), "data:new");
    s = failReread(s, "a");
    expect(get(s, "a")).toMatchObject({ name: "Side table", image: "data:new", rereadPending: false, rereadFailed: true });
  });

  it("a re-read lands on the item and clears the waiting state", () => {
    let s = adjustBox(sale([base("a")]), "a", box(0.3, 0.3), "data:new");
    s = applyReread(s, "a", { name: "Mantel clock", band: "$50–$100", reason: "Wind-up clock.", confidence: "medium", markReading: null });
    expect(get(s, "a")).toMatchObject({ name: "Mantel clock", band: "$50–$100", rereadPending: false, refined: true });
    expect(get(s, "a").rereadFailed).toBeUndefined();
  });

  it("a re-read never overwrites a band the family set", () => {
    let s = updateItem(sale([base("a")]), "a", { band: "$100–$250" });
    s = applyReread(s, "a", { name: "Clock", band: "$10–$25", reason: "r", confidence: "low", markReading: null });
    expect(get(s, "a")).toMatchObject({ name: "Clock", band: "$100–$250", bandSource: "family" });
  });
});

describe("split", () => {
  it("one item becomes N, each with its own box and picture, confirmed and waiting for a read", () => {
    const s = splitItem(sale([base("x"), base("v", { name: "Three vases" }), base("y")]), "v", [box(0.1, 0.2), box(0.3, 0.2), box(0.5, 0.2)], ["d1", "d2", "d3"]);
    expect(s.items.map((i) => i.id)).toEqual(["x", "v_s1", "v_s2", "v_s3", "y"]);
    const parts = s.items.slice(1, 4);
    expect(parts.map((p) => p.name)).toEqual(["Three vases (1 of 3)", "Three vases (2 of 3)", "Three vases (3 of 3)"]);
    expect(parts.every((p) => p.confirmed && p.rereadPending && p.photoId === "esp_s/2" && p.frame === 2)).toBe(true);
    expect(parts.map((p) => p.image)).toEqual(["d1", "d2", "d3"]);
  });
});

describe("add", () => {
  it("a box drawn around a missed object becomes a new item, added by you, confirmed and read", () => {
    const s = addFromPhoto(sale([base("a")]), { photoId: "esp_s/2", frame: 2, box: box(0.7, 0.1), image: "lamp" });
    const added = s.items[1];
    expect(added).toMatchObject({ name: "New item", userAdded: true, confirmed: true, rereadPending: true, image: "lamp", box: box(0.7, 0.1), photoId: "esp_s/2" });
  });
});

describe("merge and lot", () => {
  const two = () => sale([base("lamp", { name: "Lamp base", box: box(0.1, 0.2, 0.1, 0.5), destination: "keep" }), base("shade", { name: "Lamp shade", box: box(0.08, 0.1, 0.2, 0.15), destination: "sell" }), base("z")]);

  it("the bounding box covers every part", () => {
    expect(boundingBox([box(0.1, 0.2, 0.1, 0.5), box(0.08, 0.1, 0.2, 0.15)])).toEqual({ x: 0.08, y: 0.1, w: 0.2, h: 0.6 });
  });

  it("merge leaves one item framed around both, confirmed, waiting for a read, keeping the most specific destination", () => {
    const s = mergeItems(two(), ["lamp", "shade"], "both");
    expect(s.items.map((i) => i.id)).toEqual(["lamp_m", "z"]);
    expect(s.items[0]).toMatchObject({ box: { x: 0.08, y: 0.1, w: 0.2, h: 0.6 }, destination: "sell", confirmed: true, rereadPending: true, image: "both" });
  });

  it("a lot keeps its parts so it can be split back", () => {
    let s = markLot(two(), ["lamp", "shade"], "set");
    expect(s.items[0]).toMatchObject({ id: "lamp_lot", name: "Lot of 2", confirmed: true, rereadPending: true });
    expect(s.items[0].lot?.parts.map((p) => p.name)).toEqual(["Lamp base", "Lamp shade"]);
    s = splitLot(s, "lamp_lot", ["p1", "p2"]);
    expect(s.items.map((i) => i.name)).toEqual(["Lamp base", "Lamp shade", "z"]);
    expect(s.items.slice(0, 2).every((p) => p.confirmed && p.rereadPending && !p.lot)).toBe(true);
  });

  it("merge drops the parts' undo history", () => {
    let s = setDestination(two(), "lamp", "donate");
    s = mergeItems(s, ["lamp", "shade"]);
    expect(s.history.some((m) => m.id === "lamp" || m.id === "shade")).toBe(false);
  });
});

describe("adjust by message", () => {
  const read = { name: "Vintage Hermès desk clock", band: "$500–$2,000" as const, reason: "Family says Hermès.", confidence: "medium" as const, markReading: null };

  it("updates only that item, records what changed, confirms it, and keeps the words as a note", () => {
    const s = applyMessage(sale([base("a", { name: "Mantel clock" }), base("b")]), "a", "this is actually a vintage Hermes - adjust pricing", read, new Date("2026-10-27T12:00:00Z"));
    expect(get(s, "a")).toMatchObject({ name: "Vintage Hermès desk clock", band: "$500–$2,000", confirmed: true });
    expect(get(s, "a").messages?.[0]).toMatchObject({
      text: "this is actually a vintage Hermes - adjust pricing",
      before: { name: "Mantel clock", band: "$25–$50", reason: "r" },
      after: { name: "Vintage Hermès desk clock", band: "$500–$2,000", reason: "Family says Hermès." },
    });
    expect(get(s, "a").note).toContain("vintage Hermes");
    expect(get(s, "b")).toEqual(base("b"));
  });

  it("Undo brings the previous name, band and reason back", () => {
    let s = applyMessage(sale([base("a", { name: "Mantel clock" })]), "a", "it's Hermès", read);
    s = undoMessage(s, "a", 0);
    expect(get(s, "a")).toMatchObject({ name: "Mantel clock", band: "$25–$50", reason: "r" });
    expect(get(s, "a").messages?.[0].undone).toBe(true);
  });
});
