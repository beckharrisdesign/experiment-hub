import { describe, it, expect, vi, beforeEach } from "vitest";
import type { KeywordRow } from "@/types";

const { mockGetLatestListingSnapshots } = vi.hoisted(() => ({
  mockGetLatestListingSnapshots: vi.fn(),
}));

vi.mock("@/lib/etsy-sync", () => ({
  getLatestListingSnapshots: mockGetLatestListingSnapshots,
}));

beforeEach(() => {
  mockGetLatestListingSnapshots.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

function row(overrides: Partial<KeywordRow>): KeywordRow {
  return {
    keyword: "snow globe",
    capture: "2026-09-17",
    searches: 210,
    competition: 180,
    kd: 22,
    foundVia: [],
    current: true,
    supersededBy: null,
    coverage: { seen: 1, of: 1 },
    ranked: null,
    targeting: null,
    ...overrides,
  };
}

describe("keyword-explorer page — withTargeting", () => {
  it("merges a real Targeting match onto the matching row", async () => {
    mockGetLatestListingSnapshots.mockResolvedValue([
      { listing_id: 1, tags: ["snow globe"], state: "active" },
    ]);
    const { withTargeting } = await import("@/app/keyword-explorer/page");

    const [result] = await withTargeting([row({})]);
    expect(result.targeting).toEqual({
      best: 1,
      matches: [{ listingId: 1, slot: 1 }],
    });
  });

  it("degrades to blank Targeting for every row when the Supabase read fails, without throwing", async () => {
    mockGetLatestListingSnapshots.mockRejectedValue(
      new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set"),
    );
    const { withTargeting } = await import("@/app/keyword-explorer/page");

    const rows = [row({ keyword: "snow globe" }), row({ keyword: "gift" })];
    const result = await withTargeting(rows);

    expect(result).toHaveLength(2);
    expect(result.every((r) => r.targeting === null)).toBe(true);
    expect(console.error).toHaveBeenCalled();
  });
});
