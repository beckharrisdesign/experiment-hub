import { describe, it, expect } from "vitest";
import { mergeHistory, type HistoryEntry } from "@/lib/estate-sale-planner/sale-summary";

const row = (id: string, name: string, updatedAt: string): HistoryEntry => ({ id, name, createdAt: updatedAt, updatedAt, items: 1, keep: 0, sell: 1, donate: 0, undecided: 0 });

describe("mergeHistory (esp-server-sales D5)", () => {
  it("lists sales from both, one row each", () => {
    const merged = mergeHistory([row("a", "phone only", "2026-11-03T10:00:00Z")], [{ ...row("b", "server only", "2026-11-03T11:00:00Z"), version: 5 }], () => undefined);
    expect(merged.map((r) => r.id)).toEqual(["b", "a"]);
  });

  it("picks the newer by version, not by the phone's clock", () => {
    // The phone's clock runs a day fast, so its stale copy has the later timestamp.
    const phone = row("a", "stale on phone", "2026-11-04T10:00:00Z");
    const server = { ...row("a", "newer on server", "2026-11-03T10:00:00Z"), version: 200 };
    expect(mergeHistory([phone], [server], () => 100)[0].name).toBe("newer on server");
    expect(mergeHistory([phone], [server], () => 300)[0].name).toBe("stale on phone");
  });

  it("takes the server's row when the phone knows no version for it", () => {
    const merged = mergeHistory([row("a", "phone", "2026-11-04T00:00:00Z")], [{ ...row("a", "server", "2026-11-03T00:00:00Z"), version: 1 }], () => undefined);
    expect(merged[0].name).toBe("server");
  });
});
