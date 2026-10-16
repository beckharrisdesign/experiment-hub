import { describe, it, expect } from "vitest";
import { formatPrice, parseSheetInput, sheetInputFromSession, sheetPath } from "@/lib/estate-sale-planner/sheet";
import { SELL_SHEET } from "@/lib/estate-sale-planner/config";
import { attachDetail, newSession, setDestination, updateItem } from "@/lib/estate-sale-planner/session";
import { fixtureFlags } from "@/lib/estate-sale-planner/flag";

const img = "data:image/jpeg;base64,/9j/4AAQ";

describe("sheetInputFromSession", () => {
  it("carries only the Sell list — overridden and unflagged items stay off the sheet", () => {
    const session = newSession(fixtureFlags().items, new Date("2026-10-13T12:00:00Z"), fixtureFlags().items.map(() => img));
    const firstSell = session.items.find((i) => i.flagged)!;
    const moved = setDestination(session, firstSell.id, "keep");
    const input = sheetInputFromSession(moved);
    expect(input.sessionId).toBe(session.id);
    expect(input.walkthroughAt).toBe("2026-10-13T12:00:00.000Z");
    expect(input.items.length).toBe(session.items.filter((i) => i.flagged).length - 1);
    expect(input.items.every((i) => i.image === img)).toBe(true);
    expect(input.items[0]).not.toHaveProperty("id");
    expect(input.items[0]).not.toHaveProperty("frame");
  });

  it("carries detail thumbs, the mark reading, and the family's note", () => {
    let session = newSession(fixtureFlags().items, new Date(), []);
    const item = session.items.find((i) => i.flagged)!;
    session = attachDetail(session, item.id, img);
    session = updateItem(session, item.id, { note: "  Bought in Copenhagen, 1962.  ", markReading: "Royal Copenhagen" } as any);
    const input = sheetInputFromSession(session);
    const row = input.items.find((i) => i.name === item.name)!;
    expect(row.details).toEqual([img]);
    expect(row.note).toBe("Bought in Copenhagen, 1962.");
    expect(row.markReading).toBe("Royal Copenhagen");
    expect(parseSheetInput(input)).not.toBeNull();
  });

  it("drops an oversized thumbnail rather than failing the whole sheet", () => {
    const big = "data:image/jpeg;base64," + "A".repeat(SELL_SHEET.maxImageBytes + 10);
    const session = newSession(fixtureFlags().items, new Date(), [big]);
    const input = sheetInputFromSession(session);
    expect(input.items[0].image).toBeUndefined();
  });
});

describe("parseSheetInput", () => {
  const good = { sessionId: "esp_m1abc_x1y2z3", items: [{ name: "Teak sideboard", room: "Living room", band: "$500–$2,000", reason: "Mid-century.", confidence: "high", image: img }] };

  it("accepts a well-formed sheet", () => {
    expect(parseSheetInput(good)).not.toBeNull();
  });
  it("rejects a foreign session id, an empty list, a non-JPEG image, and an unknown band", () => {
    expect(parseSheetInput({ ...good, sessionId: "../etc" })).toBeNull();
    expect(parseSheetInput({ ...good, items: [] })).toBeNull();
    expect(parseSheetInput({ ...good, items: [{ ...good.items[0], image: "data:text/html;base64,PHNjcmlwdD4=" }] })).toBeNull();
    expect(parseSheetInput({ ...good, items: [{ ...good.items[0], band: "priceless" }] })).toBeNull();
  });
});

describe("formatPrice / sheetPath", () => {
  it("formats whole dollars without cents and odd amounts with them", () => {
    expect(formatPrice(500)).toBe("$5");
    expect(formatPrice(350)).toBe("$3.50");
  });
  it("builds the shareable path", () => {
    expect(sheetPath("abc")).toBe("/estate-sale-planner/sheet/abc");
  });
});
