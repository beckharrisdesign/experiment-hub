import { describe, it, expect, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";

const TEST_SECRET = "test-admin-secret-xyz";
const EXP_ID = "abc-123";

// ---------------------------------------------------------------------------
// Mock lib/supabase
// ---------------------------------------------------------------------------

const { mockUpdateExperiment } = vi.hoisted(() => ({
  mockUpdateExperiment: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  updateExperiment: mockUpdateExperiment,
  upsertContent: vi.fn(),
  getContent: vi.fn(),
  getNotes: vi.fn(),
  createNote: vi.fn(),
  updateNote: vi.fn(),
  deleteNote: vi.fn(),
  insertSubmission: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mock next/headers cookies()
// ---------------------------------------------------------------------------

const { mockCookies } = vi.hoisted(() => ({ mockCookies: vi.fn() }));

vi.mock("next/headers", () => ({ cookies: mockCookies }));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCookieStore(value?: string) {
  return {
    get: vi.fn((name: string) =>
      name === "hub-edit" && value ? { name: "hub-edit", value } : undefined,
    ),
  };
}

function makeRequest(body: unknown) {
  return new NextRequest(`http://localhost/api/experiments/id/${EXP_ID}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Import route after mocks are set up
// ---------------------------------------------------------------------------

const { PATCH } = await import("@/app/api/experiments/id/[id]/route");

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PATCH /api/experiments/id/[id]", () => {
  it("returns 401 when cookie is missing", async () => {
    vi.stubEnv("ADMIN_SECRET", TEST_SECRET);
    mockCookies.mockReturnValue(makeCookieStore());

    const res = await PATCH(makeRequest({ status: "Active" }), {
      params: Promise.resolve({ id: EXP_ID }),
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("returns 401 when cookie value is wrong", async () => {
    vi.stubEnv("ADMIN_SECRET", TEST_SECRET);
    mockCookies.mockReturnValue(makeCookieStore("wrong-secret"));

    const res = await PATCH(makeRequest({ status: "Active" }), {
      params: Promise.resolve({ id: EXP_ID }),
    });

    expect(res.status).toBe(401);
  });

  it("returns 400 when body has no allowed fields", async () => {
    vi.stubEnv("ADMIN_SECRET", TEST_SECRET);
    mockCookies.mockReturnValue(makeCookieStore(TEST_SECRET));

    const res = await PATCH(makeRequest({ unknown_field: "value" }), {
      params: Promise.resolve({ id: EXP_ID }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "No valid fields" });
  });

  it("returns 200 success envelope on valid update", async () => {
    vi.stubEnv("ADMIN_SECRET", TEST_SECRET);
    mockCookies.mockReturnValue(makeCookieStore(TEST_SECRET));

    const updated = { id: EXP_ID, status: "Completed", name: "Test Exp" };
    mockUpdateExperiment.mockResolvedValue(updated);

    const res = await PATCH(makeRequest({ status: "Completed" }), {
      params: Promise.resolve({ id: EXP_ID }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ success: true, experiment: updated });
    expect(mockUpdateExperiment).toHaveBeenCalledWith(EXP_ID, {
      status: "Completed",
    });
  });

  it("returns 500 with error JSON when updateExperiment throws", async () => {
    vi.stubEnv("ADMIN_SECRET", TEST_SECRET);
    mockCookies.mockReturnValue(makeCookieStore(TEST_SECRET));
    mockUpdateExperiment.mockRejectedValue(new Error("DB connection failed"));

    const res = await PATCH(makeRequest({ status: "Active" }), {
      params: Promise.resolve({ id: EXP_ID }),
    });

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "Failed to update experiment" });
  });
});
