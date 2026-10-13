import { describe, it, expect } from "vitest";
import { fixtureFlags } from "@/lib/estate-sale-planner/flag";
import {
  byRoom,
  decide,
  keepList,
  newSession,
  overrides,
  sellList,
  sortFinished,
  tossList,
  undecided,
  undo,
} from "@/lib/estate-sale-planner/session";

function session() {
  return newSession(fixtureFlags().items, new Date("2026-10-13T12:00:00Z"));
}

// ---------------------------------------------------------------------------
// Lists
// ---------------------------------------------------------------------------

describe("newSession", () => {
  it("splits flagged items into Sell and the rest into undecided", () => {
    const s = session();
    expect(sellList(s).length + undecided(s).length).toBe(s.items.length);
    expect(sellList(s).every((i) => i.flagged)).toBe(true);
    expect(undecided(s).every((i) => !i.flagged)).toBe(true);
  });

  it("groups the rest by room in first-seen order", () => {
    const rooms = byRoom(undecided(session())).map((g) => g.room);
    expect(rooms[0]).toBe("Living room");
    expect(new Set(rooms).size).toBe(rooms.length);
  });
});

// ---------------------------------------------------------------------------
// Deciding, undo, and the end condition (spec: Decide one item at a time)
// ---------------------------------------------------------------------------

describe("decide / undo", () => {
  it("a full pass leaves every item in exactly one of Keep, Toss, or Sell", () => {
    let s = session();
    undecided(s).forEach((item, i) => {
      s = decide(s, item.id, i % 2 ? "keep" : "toss");
    });
    expect(sortFinished(s)).toBe(true);
    const placed = keepList(s).length + tossList(s).length + sellList(s).length;
    expect(placed).toBe(s.items.length);
  });

  it("undo restores the last decision only", () => {
    let s = session();
    const [a, b] = undecided(s);
    s = decide(s, a.id, "toss");
    s = decide(s, b.id, "keep");
    s = undo(s);
    expect(s.items.find((i) => i.id === b.id)?.decision).toBeUndefined();
    expect(s.items.find((i) => i.id === a.id)?.decision).toBe("toss");
    expect(s.decided).toEqual([a.id]);
  });

  it("undo on an empty stack is a no-op", () => {
    const s = session();
    expect(undo(s)).toBe(s);
  });

  it("deciding an already-decided item is ignored", () => {
    let s = session();
    const [a] = undecided(s);
    s = decide(s, a.id, "keep");
    const again = decide(s, a.id, "toss");
    expect(again).toBe(s);
  });

  it("overriding a Sell flag moves it off Sell and counts as an override", () => {
    let s = session();
    const flagged = sellList(s)[0];
    s = decide(s, flagged.id, "keep");
    expect(sellList(s).find((i) => i.id === flagged.id)).toBeUndefined();
    expect(overrides(s)).toHaveLength(1);
    expect(overrides(s)[0].band).toBe(flagged.band); // the band is still on the item
  });
});
