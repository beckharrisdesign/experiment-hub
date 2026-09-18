import { describe, expect, it } from "vitest";
import { computeTargeting } from "@/lib/keyword-traction";
import type { RawListing } from "@/lib/etsy-scorecard";

function listing(
  id: number,
  tags: string[],
  state: string = "active",
): RawListing {
  return { listing_id: id, tags, state };
}

describe("computeTargeting", () => {
  it("reports the 1-based slot for a keyword tagged on one listing", () => {
    const result = computeTargeting(
      ["snow globe"],
      [listing(1, ["holiday", "snow globe", "gift"])],
    );
    expect(result.get("snow globe")).toEqual({
      best: 2,
      matches: [{ listingId: 1, slot: 2 }],
    });
  });

  it("reports the earliest (lowest) slot across multiple listings", () => {
    const result = computeTargeting(
      ["snow globe"],
      [
        listing(1, ["holiday", "snow globe"]),
        listing(2, ["snow globe", "winter", "gift"]),
      ],
    );
    const match = result.get("snow globe")!;
    expect(match.best).toBe(1);
    expect(match.matches.map((m) => m.slot).sort()).toEqual([1, 2]);
  });

  it("does not add an entry for a keyword absent from every listing's tags", () => {
    const result = computeTargeting(
      ["never tagged"],
      [listing(1, ["holiday", "gift"])],
    );
    expect(result.has("never tagged")).toBe(false);
  });

  it("matches case-insensitively, exact text only", () => {
    const result = computeTargeting(
      ["Snow Globe"],
      [listing(1, ["snow globe"])],
    );
    expect(result.get("Snow Globe")?.best).toBe(1);
  });

  it("does not substring-match a tag", () => {
    const result = computeTargeting(
      ["snow globe"],
      [listing(1, ["snow globe ornament"])],
    );
    expect(result.has("snow globe")).toBe(false);
  });

  it("ignores a listing with no tags", () => {
    const result = computeTargeting(
      ["snow globe"],
      [
        { listing_id: 1, tags: null, state: "active" },
        { listing_id: 2, tags: undefined, state: "active" },
      ],
    );
    expect(result.size).toBe(0);
  });

  it("ignores a tag on a listing that is no longer active", () => {
    // getLatestListingSnapshots() returns the newest snapshot per listing
    // across all history, so a deleted/deactivated listing's last-known
    // tags would otherwise keep reading as "targeted" forever.
    const result = computeTargeting(
      ["snow globe"],
      [listing(1, ["snow globe"], "inactive")],
    );
    expect(result.has("snow globe")).toBe(false);
  });

  it("still matches when at least one of several listings is active", () => {
    const result = computeTargeting(
      ["snow globe"],
      [
        listing(1, ["snow globe"], "expired"),
        listing(2, ["snow globe"], "active"),
      ],
    );
    expect(result.get("snow globe")).toEqual({
      best: 1,
      matches: [{ listingId: 2, slot: 1 }],
    });
  });
});
