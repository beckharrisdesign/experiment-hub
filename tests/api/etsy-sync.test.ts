/**
 * Tests for the etsy-notion-sync API surface (openspec/changes/etsy-notion-sync-build):
 *   /api/etsy-sync/runs     — public run-history read (server-side Supabase)
 *   /api/etsy-sync/dispatch — admin-gated workflow dispatch ("Sync now")
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const TEST_SECRET = "test-admin-secret-xyz";

// ---------------------------------------------------------------------------
// Mock lib/etsy-sync
// ---------------------------------------------------------------------------

const { mockGetEtsySyncRuns, mockDispatchEtsySyncWorkflow } = vi.hoisted(() => ({
  mockGetEtsySyncRuns: vi.fn(),
  mockDispatchEtsySyncWorkflow: vi.fn(),
}));

vi.mock("@/lib/etsy-sync", () => ({
  getEtsySyncRuns: mockGetEtsySyncRuns,
  dispatchEtsySyncWorkflow: mockDispatchEtsySyncWorkflow,
}));

// ---------------------------------------------------------------------------
// Mock next/headers cookies()
// ---------------------------------------------------------------------------

const { mockCookies } = vi.hoisted(() => ({ mockCookies: vi.fn() }));

vi.mock("next/headers", () => ({ cookies: mockCookies }));

function withCookie(value?: string) {
  mockCookies.mockResolvedValue({
    get: (name: string) =>
      name === "hub-edit" && value !== undefined ? { value } : undefined,
  });
}

// Route handlers are imported dynamically after mocks are in place
// (rules/vitest-conventions.mdc — API route tests).
let getRuns: () => Promise<Response>;
let postDispatch: () => Promise<Response>;

beforeEach(async () => {
  vi.clearAllMocks();
  ({ GET: getRuns } = await import("@/app/api/etsy-sync/runs/route"));
  ({ POST: postDispatch } = await import("@/app/api/etsy-sync/dispatch/route"));
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/etsy-sync/runs", () => {
  it("returns run history newest-first from the lib", async () => {
    const runs = [
      { id: 2, status: "ok", trigger_source: "manual" },
      { id: 1, status: "ok", trigger_source: "scheduled" },
    ];
    mockGetEtsySyncRuns.mockResolvedValue(runs);

    const response = await getRuns();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, runs });
  });

  it("returns 503 when Supabase is not configured", async () => {
    mockGetEtsySyncRuns.mockRejectedValue(
      new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set"),
    );
    const response = await getRuns();
    expect(response.status).toBe(503);
  });
});

describe("POST /api/etsy-sync/dispatch", () => {
  it("returns 401 without the admin cookie", async () => {
    vi.stubEnv("ADMIN_SECRET", TEST_SECRET);
    withCookie(undefined);

    const response = await postDispatch();
    expect(response.status).toBe(401);
    expect(mockDispatchEtsySyncWorkflow).not.toHaveBeenCalled();
  });

  it("fails closed with 401 when ADMIN_SECRET is unset, even with a cookie", async () => {
    vi.stubEnv("ADMIN_SECRET", "");
    withCookie("anything");

    const response = await postDispatch();
    expect(response.status).toBe(401);
    expect(mockDispatchEtsySyncWorkflow).not.toHaveBeenCalled();
  });

  it("dispatches the workflow and returns 202 with a valid cookie", async () => {
    vi.stubEnv("ADMIN_SECRET", TEST_SECRET);
    withCookie(TEST_SECRET);
    mockDispatchEtsySyncWorkflow.mockResolvedValue(undefined);

    const response = await postDispatch();
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ success: true, dispatched: true });
    expect(mockDispatchEtsySyncWorkflow).toHaveBeenCalledOnce();
  });

  it("returns 502 when the dispatch fails", async () => {
    vi.stubEnv("ADMIN_SECRET", TEST_SECRET);
    withCookie(TEST_SECRET);
    mockDispatchEtsySyncWorkflow.mockRejectedValue(
      new Error("Workflow dispatch failed (404): Not Found"),
    );

    const response = await postDispatch();
    expect(response.status).toBe(502);
  });
});
