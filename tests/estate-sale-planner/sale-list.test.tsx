import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { fixtureFlags } from "@/lib/estate-sale-planner/flag";
import { newSession, setDestination } from "@/lib/estate-sale-planner/session";
import { listHistory, summarize, type HistoryEntry } from "@/lib/estate-sale-planner/storage";
import { formatTally, tallies } from "@/lib/estate-sale-planner/tally";
import SaleList, { saleStatus } from "@/app/estate-sale-planner/SaleList";

function sorted() {
  let s = newSession(fixtureFlags().items, new Date("2026-10-13T12:00:00Z"));
  const [a, b, c] = s.items;
  s = setDestination(s, a.id, "sell");
  s = setDestination(s, b.id, "donate");
  s = setDestination(s, c.id, "keep");
  return s;
}

describe("Home sale rows carry the three pile tallies", () => {
  beforeEach(() => window.localStorage.clear());

  it("summarize stores sell, donate and keep tallies", () => {
    const s = sorted();
    const t = tallies(s);
    expect(summarize(s).tallies).toEqual({ sell: t.sell, donate: t.donate, keep: t.keep });
  });

  it("an entry saved before tallies existed is filled in from the saved copy", () => {
    const s = sorted();
    const { tallies: _t, ...old } = summarize(s, "2026-10-14T00:00:00Z");
    window.localStorage.setItem("esp:history:v1", JSON.stringify([old]));
    window.localStorage.setItem(`esp:saved:${s.id}`, JSON.stringify(s));
    expect(listHistory()[0].tallies?.sell).toEqual(tallies(s).sell);
  });

  it("an old entry with no saved copy left still lists", () => {
    const { tallies: _t, ...old } = summarize(sorted());
    window.localStorage.setItem("esp:history:v1", JSON.stringify([old]));
    expect(listHistory()[0].tallies).toBeUndefined();
  });

  it("each row shows the three values, and a dash for an empty pile", () => {
    const s = sorted();
    const entry = summarize(s);
    render(<SaleList entries={[entry]} onDelete={() => {}} />);
    for (const pile of ["sell", "donate", "keep"] as const) {
      expect(screen.getAllByText(formatTally(tallies(s)[pile])).length).toBeGreaterThan(0);
    }
    const empty: HistoryEntry = { ...entry, id: "e2", tallies: { ...entry.tallies!, donate: { count: 0, low: 0, high: 0 } } };
    render(<SaleList entries={[empty]} onDelete={() => {}} />);
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("the badge counts what is left to sort", () => {
    const e = summarize(sorted());
    expect(e.undecided).toBeGreaterThan(0);
    expect(saleStatus(e).label).toBe(`${e.undecided} to sort`);
    expect(saleStatus({ ...e, undecided: 0 }).label).toBe("Sorted");
  });
});
