import { describe, it, expect, beforeEach } from "vitest";
import { fixtureFlags } from "@/lib/estate-sale-planner/flag";
import { newSession } from "@/lib/estate-sale-planner/session";
import {
  deleteSaved,
  loadSession,
  openSaved,
  saveCopy,
  saveSession,
} from "@/lib/estate-sale-planner/storage";

const sale = (name = "Mom's house") =>
  newSession(fixtureFlags().items, new Date("2026-10-28T12:00:00Z"), [], name);

// ---------------------------------------------------------------------------
// The sale in context survives the app being closed (founder, 2026-10-28: "lets fix the
// storage issue"). Added to the home screen, iOS ends the app — and sessionStorage with it —
// whenever it likes; the next launch has to land back in the same sale.
// ---------------------------------------------------------------------------

describe("the active sale survives a closed app", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("reopens the last active sale when sessionStorage was wiped", () => {
    const s = sale();
    saveSession(s);
    window.sessionStorage.clear(); // iOS closed the home-screen app
    expect(loadSession()?.id).toBe(s.id);
    expect(loadSession()?.items.length).toBe(s.items.length);
  });

  it("a sale reopened from Home becomes the one a relaunch comes back to", () => {
    const a = sale("A");
    const b = sale("B");
    saveSession(a);
    saveCopy(b);
    openSaved(b.id);
    window.sessionStorage.clear();
    expect(loadSession()?.id).toBe(b.id);
  });

  it("a background pass landing on another sale doesn't change which one is active", () => {
    const a = sale("A");
    saveSession(a);
    saveCopy(sale("B"));
    window.sessionStorage.clear();
    expect(loadSession()?.id).toBe(a.id);
  });

  it("deleting the active sale forgets it, so a relaunch lands on Home", () => {
    const s = sale();
    saveSession(s);
    deleteSaved(s.id);
    window.sessionStorage.clear();
    expect(loadSession()).toBeNull();
  });

  it("clearing the session forgets it too", () => {
    saveSession(sale());
    saveSession(null);
    window.sessionStorage.clear();
    expect(loadSession()).toBeNull();
  });

  it("an active id whose copy is gone loads nothing rather than throwing", () => {
    window.localStorage.setItem("esp:active:v1", "esp_gone");
    expect(loadSession()).toBeNull();
  });
});
