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
// Mock lib/notion-experiments (keep the real toNotionStatus/toNotionType)
// ---------------------------------------------------------------------------

const { mockHasNotion, mockUpdateInNotion } = vi.hoisted(() => ({
  mockHasNotion: vi.fn(() => false),
  mockUpdateInNotion: vi.fn(),
}));

vi.mock("@/lib/notion-experiments", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  hasNotionExperiments: mockHasNotion,
  updateExperimentInNotion: mockUpdateInNotion,
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
  mockHasNotion.mockReturnValue(false);
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

// ---------------------------------------------------------------------------
// Notion write path
// ---------------------------------------------------------------------------

describe("PATCH /api/experiments/id/[id] with Notion configured", () => {
  function authorize() {
    vi.stubEnv("ADMIN_SECRET", TEST_SECRET);
    mockCookies.mockReturnValue(makeCookieStore(TEST_SECRET));
    mockHasNotion.mockReturnValue(true);
  }

  it("writes to Notion and skips Supabase", async () => {
    authorize();
    const updated = { id: EXP_ID, status: "Completed", name: "Test Exp" };
    mockUpdateInNotion.mockResolvedValue(updated);

    const res = await PATCH(makeRequest({ status: "Completed" }), {
      params: Promise.resolve({ id: EXP_ID }),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, experiment: updated });
    expect(mockUpdateInNotion).toHaveBeenCalledWith(EXP_ID, {
      status: "Completed",
    });
    expect(mockUpdateExperiment).not.toHaveBeenCalled();
  });

  it("accepts a raw Notion phase name as status", async () => {
    authorize();
    const updated = { id: EXP_ID, status: "Active" };
    mockUpdateInNotion.mockResolvedValue(updated);

    const res = await PATCH(makeRequest({ status: "Validating" }), {
      params: Promise.resolve({ id: EXP_ID }),
    });

    expect(res.status).toBe(200);
    expect(mockUpdateInNotion).toHaveBeenCalledWith(EXP_ID, {
      status: "Validating",
    });
  });

  it.each(["Active", "Abandoned", "On Hold", "Archived"])(
    "returns 400 for status %s, which Notion cannot represent",
    async (status) => {
      authorize();

      const res = await PATCH(makeRequest({ status }), {
        params: Promise.resolve({ id: EXP_ID }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("no Notion equivalent");
      expect(mockUpdateInNotion).not.toHaveBeenCalled();
      expect(mockUpdateExperiment).not.toHaveBeenCalled();
    },
  );

  it("returns 400 when only Notion-unwritable fields are sent", async () => {
    authorize();

    const res = await PATCH(makeRequest({ tags: ["a", "b"] }), {
      params: Promise.resolve({ id: EXP_ID }),
    });

    expect(res.status).toBe(400);
    expect(mockUpdateInNotion).not.toHaveBeenCalled();
    expect(mockUpdateExperiment).not.toHaveBeenCalled();
  });

  it("falls through to Supabase when the experiment is not in Notion", async () => {
    authorize();
    mockUpdateInNotion.mockResolvedValue(null);
    const updated = { id: EXP_ID, name: "Legacy Exp" };
    mockUpdateExperiment.mockResolvedValue(updated);

    const res = await PATCH(makeRequest({ name: "Legacy Exp" }), {
      params: Promise.resolve({ id: EXP_ID }),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, experiment: updated });
    expect(mockUpdateExperiment).toHaveBeenCalledWith(EXP_ID, {
      name: "Legacy Exp",
    });
  });

  it("returns 502 without touching Supabase when Notion errors", async () => {
    authorize();
    mockUpdateInNotion.mockRejectedValue(new Error("notion is down"));

    const res = await PATCH(makeRequest({ status: "Completed" }), {
      params: Promise.resolve({ id: EXP_ID }),
    });

    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body).toEqual({ error: "Failed to update experiment in Notion" });
    expect(mockUpdateExperiment).not.toHaveBeenCalled();
  });
});
