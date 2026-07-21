import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockFrom, mockSelect, mockEq, mockCreateClient } = vi.hoisted(() => {
  const mockEq = vi.fn();
  const mockSelect = vi.fn(() => ({ eq: mockEq }));
  const mockFrom = vi.fn(() => ({ select: mockSelect }));
  const mockCreateClient = vi.fn(() => ({ from: mockFrom }));
  return { mockFrom, mockSelect, mockEq, mockCreateClient };
});

vi.mock("@supabase/supabase-js", () => ({
  createClient: mockCreateClient,
}));

import { getLatestListingSnapshots } from "@/lib/etsy-sync";

/**
 * The endpoint is stored as the un-interpolated template. Matching it loosely
 * (e.g. `like '%listings%'`) would also match
 * `/v3/application/listings/{listing_id}/inventory` and silently double the
 * row count with objects that carry none of the scored fields — the exact bug
 * the design flagged, so it is pinned here.
 */
const LISTINGS_ENDPOINT = "/v3/application/shops/{shop_id}/listings";

beforeEach(() => {
  vi.stubEnv("SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-key");
  mockCreateClient.mockReturnValue({ from: mockFrom });
  mockFrom.mockReturnValue({ select: mockSelect });
  mockSelect.mockReturnValue({ eq: mockEq });
  mockEq.mockResolvedValue({ data: [], error: null });
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

// ---------------------------------------------------------------------------
// Query shape
// ---------------------------------------------------------------------------

describe("getLatestListingSnapshots — query", () => {
  it("reads raw_response from the latest-snapshot view", async () => {
    await getLatestListingSnapshots();

    expect(mockFrom).toHaveBeenCalledWith("etsy_latest_listing_snapshots");
    expect(mockSelect).toHaveBeenCalledWith("raw_response");
  });

  it("matches the endpoint exactly rather than by pattern", async () => {
    await getLatestListingSnapshots();

    expect(mockEq).toHaveBeenCalledWith("endpoint", LISTINGS_ENDPOINT);
    // Guard against a regression to a LIKE/ilike match, which would pull in
    // the inventory endpoint too.
    const [, value] = mockEq.mock.calls[0];
    expect(value).not.toContain("%");
  });
});

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

describe("getLatestListingSnapshots — results", () => {
  it("unwraps raw_response from each row", async () => {
    mockEq.mockResolvedValue({
      data: [
        { raw_response: { listing_id: 1, title: "one" } },
        { raw_response: { listing_id: 2, title: "two" } },
      ],
      error: null,
    });

    const result = await getLatestListingSnapshots();
    expect(result).toEqual([
      { listing_id: 1, title: "one" },
      { listing_id: 2, title: "two" },
    ]);
  });

  it("drops rows with a null or malformed raw_response", async () => {
    mockEq.mockResolvedValue({
      data: [
        { raw_response: null },
        { raw_response: { title: "no listing_id" } },
        { raw_response: { listing_id: 3 } },
      ],
      error: null,
    });

    const result = await getLatestListingSnapshots();
    expect(result).toEqual([{ listing_id: 3 }]);
  });

  it("returns an empty array when the view has no rows", async () => {
    mockEq.mockResolvedValue({ data: null, error: null });
    await expect(getLatestListingSnapshots()).resolves.toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Failure modes
// ---------------------------------------------------------------------------

describe("getLatestListingSnapshots — failures", () => {
  it("throws when Supabase returns an error", async () => {
    mockEq.mockResolvedValue({ data: null, error: { message: "boom" } });

    await expect(getLatestListingSnapshots()).rejects.toThrow(
      "Failed to load etsy listing snapshots: boom",
    );
  });

  it("throws when the service-role credentials are missing", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

    await expect(getLatestListingSnapshots()).rejects.toThrow(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set",
    );
  });
});
