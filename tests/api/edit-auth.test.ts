/**
 * Tests for the edit-mode secret auth flow:
 *   middleware.ts  — ?edit=SECRET sets httpOnly cookie and strips param
 *   POST /api/experiments/[slug]/content — validates cookie, saves to Supabase
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";

const TEST_SECRET = "test-admin-secret-xyz";

// ---------------------------------------------------------------------------
// Middleware tests
// ---------------------------------------------------------------------------

describe("middleware edit-mode auth", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function makeRequest(url: string) {
    return new NextRequest(url);
  }

  it("redirects and sets hub-edit cookie when secret is correct", async () => {
    vi.stubEnv("ADMIN_SECRET", TEST_SECRET);
    const { middleware } = await import("@/middleware");

    const req = makeRequest(
      `https://example.com/experiments/best-day-ever?edit=${TEST_SECRET}`,
    );
    const res = await middleware(req);

    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    expect(location).not.toContain("edit=");

    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toContain("hub-edit=");
    expect(setCookie).toContain(TEST_SECRET);
    expect(setCookie).toContain("HttpOnly");
  });

  it("redirects without setting cookie when secret is wrong", async () => {
    vi.stubEnv("ADMIN_SECRET", TEST_SECRET);
    const { middleware } = await import("@/middleware");

    const req = makeRequest(
      `https://example.com/experiments/best-day-ever?edit=wrong-secret`,
    );
    const res = await middleware(req);

    expect(res.status).toBe(307);
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toBeNull();
  });

  it("passes through when no edit param is present", async () => {
    vi.stubEnv("ADMIN_SECRET", TEST_SECRET);
    const { middleware } = await import("@/middleware");

    const req = makeRequest(`https://example.com/experiments/best-day-ever`);
    const res = await middleware(req);

    // NextResponse.next() has status 200 and no location header
    expect(res.headers.get("location")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Content API route tests
// ---------------------------------------------------------------------------

const { mockUpsertContent } = vi.hoisted(() => ({
  mockUpsertContent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/supabase", () => ({
  upsertContent: mockUpsertContent,
  getContent: vi.fn().mockResolvedValue(null),
  insertSubmission: vi.fn(),
}));

// Mock next/headers cookies()
const { mockCookies } = vi.hoisted(() => ({
  mockCookies: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: mockCookies,
}));

describe("POST /api/experiments/[slug]/content", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  function makeCookieStore(cookieValue?: string) {
    return {
      get: vi.fn((name: string) =>
        name === "hub-edit" && cookieValue
          ? { name: "hub-edit", value: cookieValue }
          : undefined,
      ),
    };
  }

  function makeRequest(body: object) {
    return new NextRequest(
      "https://example.com/api/experiments/best-day-ever/content",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
  }

  it("returns 401 when hub-edit cookie is missing", async () => {
    vi.stubEnv("ADMIN_SECRET", TEST_SECRET);
    mockCookies.mockResolvedValue(makeCookieStore());

    const { POST } = await import("@/app/api/experiments/[slug]/content/route");
    const res = await POST(makeRequest({ type: "prd", content: "# Test" }), {
      params: Promise.resolve({ slug: "best-day-ever" }),
    });

    expect(res.status).toBe(401);
  });

  it("returns 401 when hub-edit cookie has wrong value", async () => {
    vi.stubEnv("ADMIN_SECRET", TEST_SECRET);
    mockCookies.mockResolvedValue(makeCookieStore("wrong-value"));

    const { POST } = await import("@/app/api/experiments/[slug]/content/route");
    const res = await POST(makeRequest({ type: "prd", content: "# Test" }), {
      params: Promise.resolve({ slug: "best-day-ever" }),
    });

    expect(res.status).toBe(401);
  });

  it("returns 400 when content type is invalid", async () => {
    vi.stubEnv("ADMIN_SECRET", TEST_SECRET);
    mockCookies.mockResolvedValue(makeCookieStore(TEST_SECRET));

    const { POST } = await import("@/app/api/experiments/[slug]/content/route");
    const res = await POST(
      makeRequest({ type: "invalid_type", content: "# Test" }),
      { params: Promise.resolve({ slug: "best-day-ever" }) },
    );

    expect(res.status).toBe(400);
  });

  it("saves content and returns 200 with valid cookie and body", async () => {
    vi.stubEnv("ADMIN_SECRET", TEST_SECRET);
    mockCookies.mockResolvedValue(makeCookieStore(TEST_SECRET));

    const { POST } = await import("@/app/api/experiments/[slug]/content/route");
    const res = await POST(
      makeRequest({ type: "business_case", content: "# Business Case" }),
      { params: Promise.resolve({ slug: "best-day-ever" }) },
    );

    expect(res.status).toBe(200);
    expect(mockUpsertContent).toHaveBeenCalledWith(
      "best-day-ever",
      "business_case",
      "# Business Case",
    );
  });

  it("saves prd content correctly", async () => {
    vi.stubEnv("ADMIN_SECRET", TEST_SECRET);
    mockCookies.mockResolvedValue(makeCookieStore(TEST_SECRET));

    const { POST } = await import("@/app/api/experiments/[slug]/content/route");
    const res = await POST(
      makeRequest({ type: "prd", content: "# PRD content" }),
      { params: Promise.resolve({ slug: "best-day-ever" }) },
    );

    expect(res.status).toBe(200);
    expect(mockUpsertContent).toHaveBeenCalledWith(
      "best-day-ever",
      "prd",
      "# PRD content",
    );
  });
});
