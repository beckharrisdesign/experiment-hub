import { describe, it, expect } from "vitest";
import { fixtureFlags } from "@/lib/estate-sale-planner/flag";
import {
  DESTINATIONS,
  addItem,
  appendItems,
  applyRefinement,
  knownItems,
  renameSession,
  attachDetail,
  byRoom,
  donateList,
  keepList,
  newSession,
  overrides,
  removeItem,
  sellList,
  setDestination,
  sortFinished,
  undecided,
  undo,
  updateItem,
} from "@/lib/estate-sale-planner/session";

function session() {
  return newSession(fixtureFlags().items, new Date("2026-10-13T12:00:00Z"));
}

// ---------------------------------------------------------------------------
// Destinations: sell, donate, keep — nothing else (founder instruction)
// ---------------------------------------------------------------------------

describe("DESTINATIONS", () => {
  it("is the display order everywhere: Sell, Donate, Keep", () => {
    expect(DESTINATIONS).toEqual(["sell", "donate", "keep"]);
  });
});

describe("newSession", () => {
  it("starts model-flagged items at Sell and the rest undecided", () => {
    const s = session();
    expect(sellList(s).length + undecided(s).length).toBe(s.items.length);
    expect(sellList(s).every((i) => i.flagged && i.destination === "sell")).toBe(true);
    expect(undecided(s).every((i) => !i.flagged && !i.destination)).toBe(true);
    expect(keepList(s)).toHaveLength(0);
    expect(donateList(s)).toHaveLength(0);
  });

  it("groups by room in first-seen order", () => {
    const rooms = byRoom(undecided(session())).map((g) => g.room);
    expect(rooms[0]).toBe("Living room");
    expect(new Set(rooms).size).toBe(rooms.length);
  });
});

describe("setDestination / undo", () => {
  it("a full pass leaves every item in exactly one of Keep, Sell, or Donate", () => {
    let s = session();
    undecided(s).forEach((item, i) => {
      s = setDestination(s, item.id, (["keep", "donate", "sell"] as const)[i % 3]);
    });
    expect(sortFinished(s)).toBe(true);
    expect(keepList(s).length + sellList(s).length + donateList(s).length).toBe(s.items.length);
  });

  it("toggles between destinations any number of times, and undo walks back one at a time", () => {
    let s = session();
    const [a] = undecided(s);
    s = setDestination(s, a.id, "keep");
    s = setDestination(s, a.id, "donate");
    s = setDestination(s, a.id, "sell");
    expect(s.items.find((i) => i.id === a.id)?.destination).toBe("sell");
    expect(s.history).toHaveLength(3);
    s = undo(s);
    expect(s.items.find((i) => i.id === a.id)?.destination).toBe("donate");
    s = undo(s);
    s = undo(s);
    expect(s.items.find((i) => i.id === a.id)?.destination).toBeUndefined();
    expect(undo(s)).toBe(s);
  });

  it("setting the same destination again is a no-op", () => {
    let s = session();
    const [a] = undecided(s);
    s = setDestination(s, a.id, "keep");
    expect(setDestination(s, a.id, "keep")).toBe(s);
  });

  it("moving a model-flagged item off Sell counts as an override, and it can come back", () => {
    let s = session();
    const flagged = sellList(s)[0];
    s = setDestination(s, flagged.id, "keep");
    expect(overrides(s)).toHaveLength(1);
    expect(overrides(s)[0].band).toBe(flagged.band);
    s = setDestination(s, flagged.id, "sell");
    expect(overrides(s)).toHaveLength(0);
    expect(sellList(s).some((i) => i.id === flagged.id)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// CRUD on an item: edit, remove, add; detail shots and re-reads
// ---------------------------------------------------------------------------

describe("updateItem / removeItem / addItem", () => {
  it("correcting a wrong recognition is a rename plus a band, destination untouched", () => {
    let s = session();
    const piano = sellList(s)[0];
    s = updateItem(s, piano.id, { name: "Spinet cabinet, not a piano", band: "$10–$25", note: "Grandma bought it in 1962" });
    const edited = s.items.find((i) => i.id === piano.id)!;
    expect(edited.name).toBe("Spinet cabinet, not a piano");
    expect(edited.band).toBe("$10–$25");
    expect(edited.note).toBe("Grandma bought it in 1962");
    expect(edited.destination).toBe("sell");
    expect(updateItem(s, "nope", { name: "x" })).toBe(s);
  });

  it("removing an item drops it and its history", () => {
    let s = session();
    const [a] = undecided(s);
    s = setDestination(s, a.id, "keep");
    s = removeItem(s, a.id);
    expect(s.items.some((i) => i.id === a.id)).toBe(false);
    expect(s.history.some((m) => m.id === a.id)).toBe(false);
    expect(removeItem(s, a.id)).toBe(s);
  });

  it("adding an item the model missed starts honest and lands where the user put it", () => {
    let s = session();
    const before = s.items.length;
    s = addItem(s, { name: "  Oak rolltop desk ", room: "Study", destination: "sell" });
    expect(s.items).toHaveLength(before + 1);
    const added = s.items[s.items.length - 1];
    expect(added.name).toBe("Oak rolltop desk");
    expect(added.userAdded).toBe(true);
    expect(added.flagged).toBe(false);
    expect(added.confidence).toBe("low");
    expect(added.destination).toBe("sell");
    // The family chose what it is, so it starts confirmed (phone test 2026-10-27).
    expect(added.confirmed).toBe(true);
    expect(sellList(s).some((i) => i.id === added.id)).toBe(true);
    s = addItem(s, { name: "", room: "" });
    expect(s.items[s.items.length - 1].name).toBe("Untitled item");
    expect(s.items[s.items.length - 1].destination).toBeUndefined();
  });

  it("a detail shot attaches before any re-read, and the re-read never moves the destination", () => {
    let s = session();
    const item = sellList(s)[1];
    s = setDestination(s, item.id, "keep");
    s = attachDetail(s, item.id, "data:image/jpeg;base64,AAAA");
    expect(s.items.find((i) => i.id === item.id)?.details).toEqual(["data:image/jpeg;base64,AAAA"]);
    s = applyRefinement(s, item.id, { name: "Framed oil, signed", band: "$500–$2,000", reason: "Signed lower right.", confidence: "high", markReading: "J. Harlow 1931" });
    const refined = s.items.find((i) => i.id === item.id)!;
    expect(refined.refined).toBe(true);
    expect(refined.markReading).toBe("J. Harlow 1931");
    expect(refined.band).toBe("$500–$2,000");
    expect(refined.destination).toBe("keep");
  });
});

// ---------------------------------------------------------------------------
// A walkthrough grows room by room (round 04)
// ---------------------------------------------------------------------------

describe("appendItems / renameSession / knownItems", () => {
  it("a second pass appends with fresh ids, flagged items start at Sell, nothing sorted moves", () => {
    let s = session();
    const [a] = undecided(s);
    s = setDestination(s, a.id, "keep");
    const before = s.items.length;
    const more = fixtureFlags().items.slice(0, 4);
    s = appendItems(s, more, ["data:image/jpeg;base64,AAAA"]);
    expect(s.items).toHaveLength(before + 4);
    expect(s.passes).toBe(2);
    const added = s.items.slice(before);
    expect(new Set(s.items.map((i) => i.id)).size).toBe(s.items.length);
    expect(added.every((i) => i.id.includes("_p2_"))).toBe(true);
    expect(added.filter((i) => i.flagged).every((i) => i.destination === "sell")).toBe(true);
    expect(added[0].image).toBe("data:image/jpeg;base64,AAAA");
    expect(s.items.find((i) => i.id === a.id)?.destination).toBe("keep");
    expect(s.history).toHaveLength(1);
  });

  it("names are trimmed and capped, and clearing one removes it", () => {
    let s = newSession(fixtureFlags().items, new Date(), [], "  Mom's house  ");
    expect(s.name).toBe("Mom's house");
    s = renameSession(s, "x".repeat(80));
    expect(s.name).toHaveLength(60);
    expect(renameSession(s, s.name!)).toBe(s);
    s = renameSession(s, "   ");
    expect(s.name).toBeUndefined();
  });

  it("knownItems is the name + room list the model is told about", () => {
    const s = session();
    const known = knownItems(s);
    expect(known).toHaveLength(s.items.length);
    expect(known[0]).toEqual({ name: s.items[0].name, room: s.items[0].room });
  });
});
