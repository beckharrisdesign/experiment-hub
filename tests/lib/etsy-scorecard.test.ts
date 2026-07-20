import { describe, it, expect } from "vitest";
import {
  scoreListing,
  rankFixPriority,
  topFixFirst,
  summarizeShop,
  discoverabilityGap,
  SCORECARD_DEFAULTS,
  type RawListing,
} from "@/lib/etsy-scorecard";

// ---------------------------------------------------------------------------
// Fixtures
//
// Shaped after real snapshots from etsy_latest_listing_snapshots: digital
// downloads carry populated images/tags but null alt_text and empty
// videos/materials/style. The physical fixture is hand-built — only one active
// physical listing exists live, so the digital/physical branch cannot be
// exercised from real data alone (see design risks).
// ---------------------------------------------------------------------------

const LONG_DESCRIPTION = "x".repeat(SCORECARD_DEFAULTS.descriptionMinLength);
const GOOD_TITLE = "Digital leaf mandala embroidery pattern for beginners";

function digital(overrides: Partial<RawListing> = {}): RawListing {
  return {
    listing_id: 1,
    title: GOOD_TITLE,
    description: LONG_DESCRIPTION,
    state: "active",
    listing_type: "download",
    views: 0,
    num_favorers: 0,
    tags: Array.from({ length: 13 }, (_, i) => `tag${i}`),
    materials: [],
    style: [],
    images: Array.from({ length: 10 }, () => ({ alt_text: "described" })),
    videos: [{}],
    ...overrides,
  };
}

function physical(overrides: Partial<RawListing> = {}): RawListing {
  return {
    ...digital(),
    listing_type: "physical",
    quantity: 5,
    shipping_profile_id: 42,
    processing_min: 1,
    return_policy_id: 7,
    materials: ["wood"],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tier A — publishable gate  (outcomes 1.1, 1.2)
// ---------------------------------------------------------------------------

describe("scoreListing — Tier A", () => {
  it("flags a listing with no photo, with the reason", () => {
    const result = scoreListing(digital({ images: [] }));
    expect(result.publishable).toBe(false);
    expect(result.blockers.map((b) => b.key)).toContain("no_photo");
    expect(result.blockers.find((b) => b.key === "no_photo")?.reason).toBe("No photo");
  });

  it("flags each missing required field separately", () => {
    const result = scoreListing(
      physical({ images: [], title: "", description: "", quantity: 0 }),
    );
    expect(result.blockers.map((b) => b.key).sort()).toEqual(
      ["no_description", "no_photo", "no_quantity", "no_title"].sort(),
    );
  });

  it("passes a fully-gated listing", () => {
    const result = scoreListing(digital());
    expect(result.publishable).toBe(true);
    expect(result.blockers).toEqual([]);
  });

  it("does not gate a digital listing on quantity or shipping", () => {
    const result = scoreListing(digital({ quantity: 0, shipping_profile_id: undefined }));
    const keys = result.blockers.map((b) => b.key);
    expect(keys).not.toContain("no_quantity");
    expect(keys).not.toContain("no_shipping");
  });
});

// ---------------------------------------------------------------------------
// Tier B — completeness  (outcomes 1.3, 1.4)
// ---------------------------------------------------------------------------

describe("scoreListing — Tier B", () => {
  it("percentage reflects how many applicable criteria are met", () => {
    const result = scoreListing(digital());
    const met = result.criteria.filter((c) => c.met).length;
    expect(result.completeness).toBe(Math.round((met / result.criteria.length) * 100));
  });

  it("scores 100% when every applicable criterion is met", () => {
    const result = scoreListing(digital({ style: ["boho", "modern"] }));
    expect(result.unmet).toEqual([]);
    expect(result.completeness).toBe(100);
  });

  it("excludes physical-only criteria from the digital denominator", () => {
    const digitalKeys = scoreListing(digital()).criteria.map((c) => c.key);
    const physicalKeys = scoreListing(physical()).criteria.map((c) => c.key);

    for (const key of ["materials", "processing_time", "return_policy"]) {
      expect(digitalKeys).not.toContain(key);
      expect(physicalKeys).toContain(key);
    }
  });

  it("does not count a physical-only miss against a digital listing", () => {
    // Empty materials/style is the real shop's state for every digital listing.
    const result = scoreListing(digital({ materials: [] }));
    expect(result.unmet.map((c) => c.key)).not.toContain("materials");
  });

  it("keeps a universally-failed criterion in the denominator (static denominator)", () => {
    // design 11a — alt_text fails shop-wide but must still be counted, so the
    // percentage stays comparable across listings and over time.
    const result = scoreListing(digital({ images: [{ alt_text: null }] }));
    expect(result.criteria.map((c) => c.key)).toContain("alt_text");
    expect(result.unmet.map((c) => c.key)).toContain("alt_text");
  });
});

// ---------------------------------------------------------------------------
// Ranking  (outcomes 1.6, 1.7, 1.7a, 1.7b)
// ---------------------------------------------------------------------------

describe("rankFixPriority", () => {
  it("ranks a thinly-tagged listing above a fully-tagged one", () => {
    const thin = scoreListing(digital({ listing_id: 1, tags: ["a", "b"], views: 0 }));
    const full = scoreListing(digital({ listing_id: 2, views: 100 }));

    const order = rankFixPriority([full, thin]).map((l) => l.listingId);
    expect(order).toEqual([1, 2]);
  });

  it("uses views as a tiebreak, not as the lead key", () => {
    const gapHighViewsLow = scoreListing(digital({ listing_id: 1, tags: ["a"], views: 1 }));
    const gapLowViewsHigh = scoreListing(digital({ listing_id: 2, views: 999 }));

    // Larger discoverability gap wins despite far fewer views.
    expect(rankFixPriority([gapLowViewsHigh, gapHighViewsLow])[0].listingId).toBe(1);
  });

  it("breaks equal gaps by views, then favourites", () => {
    const a = scoreListing(digital({ listing_id: 1, views: 5, num_favorers: 0 }));
    const b = scoreListing(digital({ listing_id: 2, views: 5, num_favorers: 9 }));
    const c = scoreListing(digital({ listing_id: 3, views: 20, num_favorers: 0 }));

    expect(rankFixPriority([a, b, c]).map((l) => l.listingId)).toEqual([3, 2, 1]);
  });

  it("produces a stable order when listings tie on every key", () => {
    // The real shop has 5 listings tied at (0 views, 0 favourites) and 6 more
    // at (2, 0) — without listing_id the order would depend on input order.
    const tied = [3, 1, 2].map((id) => scoreListing(digital({ listing_id: id })));

    const first = rankFixPriority(tied).map((l) => l.listingId);
    const second = rankFixPriority([...tied].reverse()).map((l) => l.listingId);

    expect(first).toEqual([1, 2, 3]);
    expect(first).toEqual(second);
  });

  it("does not mutate its input", () => {
    const listings = [2, 1].map((id) => scoreListing(digital({ listing_id: id })));
    const before = listings.map((l) => l.listingId);
    rankFixPriority(listings);
    expect(listings.map((l) => l.listingId)).toEqual(before);
  });
});

// ---------------------------------------------------------------------------
// topFixFirst  (outcomes 1.7c, 1.8)
// ---------------------------------------------------------------------------

describe("topFixFirst", () => {
  it("is the literal top-N of the ranked table order", () => {
    const listings = [
      scoreListing(digital({ listing_id: 1, tags: [] })),
      scoreListing(digital({ listing_id: 2, tags: ["a"] })),
      scoreListing(digital({ listing_id: 3 })),
      scoreListing(digital({ listing_id: 4, views: 50 })),
    ];

    const ranked = rankFixPriority(listings).filter((l) => !l.isDraft);
    expect(topFixFirst(listings, 3).map((l) => l.listingId)).toEqual(
      ranked.slice(0, 3).map((l) => l.listingId),
    );
  });

  it("excludes drafts even when they have the largest gaps", () => {
    // Mirrors the real shop: all three zero-tag listings are drafts.
    const listings = [
      scoreListing(physical({ listing_id: 1, state: "draft", tags: [] })),
      scoreListing(physical({ listing_id: 2, state: "draft", tags: [] })),
      scoreListing(digital({ listing_id: 3, tags: ["a"] })),
    ];

    const ids = topFixFirst(listings).map((l) => l.listingId);
    expect(ids).toEqual([3]);
  });

  it("keeps drafts in the full ranked order (table shows them)", () => {
    const listings = [
      scoreListing(physical({ listing_id: 1, state: "draft", tags: [] })),
      scoreListing(digital({ listing_id: 2 })),
    ];
    expect(rankFixPriority(listings).map((l) => l.listingId)).toContain(1);
  });
});

// ---------------------------------------------------------------------------
// discoverabilityGap
// ---------------------------------------------------------------------------

describe("discoverabilityGap", () => {
  it("is zero for a fully-tagged listing with a substantial title", () => {
    expect(discoverabilityGap(digital())).toBe(0);
  });

  it("grows as tags fall short of the cap", () => {
    expect(discoverabilityGap(digital({ tags: [] }))).toBe(SCORECARD_DEFAULTS.tags);
    expect(discoverabilityGap(digital({ tags: ["a"] }))).toBe(SCORECARD_DEFAULTS.tags - 1);
  });

  it("adds a penalty for a thin title", () => {
    expect(discoverabilityGap(digital({ title: "short" }))).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// summarizeShop  (design 11a — systemic gaps surfaced once)
// ---------------------------------------------------------------------------

describe("summarizeShop", () => {
  it("reports a criterion failed by every listing as systemic", () => {
    const listings = [1, 2, 3].map((id) =>
      scoreListing(digital({ listing_id: id, videos: [], style: [] })),
    );
    const summary = summarizeShop(listings);
    expect(summary.systemicGaps).toContain("video");
    expect(summary.systemicGaps).toContain("styles");
  });

  it("does not report a gap as systemic when one listing meets it", () => {
    const listings = [
      scoreListing(digital({ listing_id: 1, videos: [] })),
      scoreListing(digital({ listing_id: 2, videos: [{}] })),
    ];
    expect(summarizeShop(listings).systemicGaps).not.toContain("video");
  });

  it("counts drafts separately and excludes them from the publishable ratio", () => {
    const listings = [
      scoreListing(digital({ listing_id: 1 })),
      scoreListing(digital({ listing_id: 2 })),
      scoreListing(physical({ listing_id: 3, state: "draft" })),
    ];
    const summary = summarizeShop(listings);

    expect(summary.total).toBe(3);
    expect(summary.drafts).toBe(1);
    expect(summary.publishableOf).toBe(2);
    expect(summary.publishable).toBe(2);
  });

  it("computes the median completeness across all listings", () => {
    const listings = [
      scoreListing(digital({ listing_id: 1 })), // all met but styles
      scoreListing(digital({ listing_id: 2, tags: [], videos: [] })),
      scoreListing(digital({ listing_id: 3, images: [] })),
    ];
    const values = listings.map((l) => l.completeness).sort((a, b) => a - b);
    expect(summarizeShop(listings).medianCompleteness).toBe(values[1]);
  });
});
