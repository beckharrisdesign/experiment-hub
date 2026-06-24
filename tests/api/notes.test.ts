import { describe, it, expect, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";

const TEST_SECRET = "test-admin-secret-xyz";

// ---------------------------------------------------------------------------
// Mock lib/supabase note functions
// ---------------------------------------------------------------------------

const { mockGetNotes, mockCreateNote, mockUpdateNote, mockDeleteNote } =
  vi.hoisted(() => ({
    mockGetNotes: vi.fn(),
    mockCreateNote: vi.fn(),
    mockUpdateNote: vi.fn(),
    mockDeleteNote: vi.fn(),
  }));

vi.mock("@/lib/supabase", () => ({
  getNotes: mockGetNotes,
  createNote: mockCreateNote,
  updateNote: mockUpdateNote,
  deleteNote: mockDeleteNote,
  upsertContent: vi.fn(),
  getContent: vi.fn(),
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

const NOTE = {
  id: "uuid-1",
  experiment_id: "etsy-listing-manager",
  title: null,
  content: "Test content",
  note_type: "observation",
  source_file: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// GET /api/notes
// ---------------------------------------------------------------------------

describe("GET /api/notes", () => {
  function makeRequest(search = "?experiment=etsy-listing-manager") {
    return new NextRequest(`https://example.com/api/notes${search}`);
  }

  it("returns 401 without hub-edit cookie", async () => {
    vi.stubEnv("ADMIN_SECRET", TEST_SECRET);
    mockCookies.mockResolvedValue(makeCookieStore());
    const { GET } = await import("@/app/api/notes/route");
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns 401 with wrong cookie value", async () => {
    vi.stubEnv("ADMIN_SECRET", TEST_SECRET);
    mockCookies.mockResolvedValue(makeCookieStore("wrong"));
    const { GET } = await import("@/app/api/notes/route");
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns 400 when experiment param is missing", async () => {
    vi.stubEnv("ADMIN_SECRET", TEST_SECRET);
    mockCookies.mockResolvedValue(makeCookieStore(TEST_SECRET));
    const { GET } = await import("@/app/api/notes/route");
    const res = await GET(makeRequest(""));
    expect(res.status).toBe(400);
  });

  it("returns notes for an experiment", async () => {
    vi.stubEnv("ADMIN_SECRET", TEST_SECRET);
    mockCookies.mockResolvedValue(makeCookieStore(TEST_SECRET));
    mockGetNotes.mockResolvedValue([NOTE]);
    const { GET } = await import("@/app/api/notes/route");
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([NOTE]);
    expect(mockGetNotes).toHaveBeenCalledWith("etsy-listing-manager");
  });
});

// ---------------------------------------------------------------------------
// POST /api/notes
// ---------------------------------------------------------------------------

describe("POST /api/notes", () => {
  function makeRequest(body: unknown) {
    return new NextRequest("https://example.com/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("returns 401 without hub-edit cookie", async () => {
    vi.stubEnv("ADMIN_SECRET", TEST_SECRET);
    mockCookies.mockResolvedValue(makeCookieStore());
    const { POST } = await import("@/app/api/notes/route");
    const res = await POST(
      makeRequest({ experiment_id: "etsy", content: "test" }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for malformed JSON", async () => {
    vi.stubEnv("ADMIN_SECRET", TEST_SECRET);
    mockCookies.mockResolvedValue(makeCookieStore(TEST_SECRET));
    const { POST } = await import("@/app/api/notes/route");
    const req = new NextRequest("https://example.com/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "Invalid JSON body" });
  });

  it("returns 400 when experiment_id is missing", async () => {
    vi.stubEnv("ADMIN_SECRET", TEST_SECRET);
    mockCookies.mockResolvedValue(makeCookieStore(TEST_SECRET));
    const { POST } = await import("@/app/api/notes/route");
    const res = await POST(makeRequest({ content: "test" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when content is missing", async () => {
    vi.stubEnv("ADMIN_SECRET", TEST_SECRET);
    mockCookies.mockResolvedValue(makeCookieStore(TEST_SECRET));
    const { POST } = await import("@/app/api/notes/route");
    const res = await POST(makeRequest({ experiment_id: "etsy" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid note_type", async () => {
    vi.stubEnv("ADMIN_SECRET", TEST_SECRET);
    mockCookies.mockResolvedValue(makeCookieStore(TEST_SECRET));
    const { POST } = await import("@/app/api/notes/route");
    const res = await POST(
      makeRequest({ experiment_id: "etsy", content: "x", note_type: "bad" }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "invalid note_type" });
  });

  it("returns 400 when title is not a string", async () => {
    vi.stubEnv("ADMIN_SECRET", TEST_SECRET);
    mockCookies.mockResolvedValue(makeCookieStore(TEST_SECRET));
    const { POST } = await import("@/app/api/notes/route");
    const res = await POST(
      makeRequest({ experiment_id: "etsy", content: "x", title: 42 }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when created_at is not a string", async () => {
    vi.stubEnv("ADMIN_SECRET", TEST_SECRET);
    mockCookies.mockResolvedValue(makeCookieStore(TEST_SECRET));
    const { POST } = await import("@/app/api/notes/route");
    const res = await POST(
      makeRequest({ experiment_id: "etsy", content: "x", created_at: 123 }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 201 with created note", async () => {
    vi.stubEnv("ADMIN_SECRET", TEST_SECRET);
    mockCookies.mockResolvedValue(makeCookieStore(TEST_SECRET));
    mockCreateNote.mockResolvedValue(NOTE);
    const { POST } = await import("@/app/api/notes/route");
    const res = await POST(
      makeRequest({
        experiment_id: "etsy-listing-manager",
        content: "Test content",
      }),
    );
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual(NOTE);
    expect(mockCreateNote).toHaveBeenCalledWith(
      "etsy-listing-manager",
      expect.objectContaining({ content: "Test content" }),
    );
  });

  it("passes created_at for backdating", async () => {
    vi.stubEnv("ADMIN_SECRET", TEST_SECRET);
    mockCookies.mockResolvedValue(makeCookieStore(TEST_SECRET));
    mockCreateNote.mockResolvedValue(NOTE);
    const { POST } = await import("@/app/api/notes/route");
    await POST(
      makeRequest({
        experiment_id: "etsy",
        content: "x",
        created_at: "2025-05-08T00:00:00Z",
      }),
    );
    expect(mockCreateNote).toHaveBeenCalledWith(
      "etsy",
      expect.objectContaining({ created_at: "2025-05-08T00:00:00Z" }),
    );
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/notes/[id]
// ---------------------------------------------------------------------------

describe("PATCH /api/notes/[id]", () => {
  function makeRequest(body: unknown) {
    return new NextRequest("https://example.com/api/notes/uuid-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("returns 401 without hub-edit cookie", async () => {
    vi.stubEnv("ADMIN_SECRET", TEST_SECRET);
    mockCookies.mockResolvedValue(makeCookieStore());
    const { PATCH } = await import("@/app/api/notes/[id]/route");
    const res = await PATCH(makeRequest({ content: "x" }), {
      params: Promise.resolve({ id: "uuid-1" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 400 for malformed JSON", async () => {
    vi.stubEnv("ADMIN_SECRET", TEST_SECRET);
    mockCookies.mockResolvedValue(makeCookieStore(TEST_SECRET));
    const { PATCH } = await import("@/app/api/notes/[id]/route");
    const req = new NextRequest("https://example.com/api/notes/uuid-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "{bad",
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "uuid-1" }) });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "Invalid JSON body" });
  });

  it("returns 400 for invalid note_type", async () => {
    vi.stubEnv("ADMIN_SECRET", TEST_SECRET);
    mockCookies.mockResolvedValue(makeCookieStore(TEST_SECRET));
    const { PATCH } = await import("@/app/api/notes/[id]/route");
    const res = await PATCH(makeRequest({ note_type: "bad" }), {
      params: Promise.resolve({ id: "uuid-1" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when content is not a string", async () => {
    vi.stubEnv("ADMIN_SECRET", TEST_SECRET);
    mockCookies.mockResolvedValue(makeCookieStore(TEST_SECRET));
    const { PATCH } = await import("@/app/api/notes/[id]/route");
    const res = await PATCH(makeRequest({ content: 99 }), {
      params: Promise.resolve({ id: "uuid-1" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 200 with updated note", async () => {
    vi.stubEnv("ADMIN_SECRET", TEST_SECRET);
    mockCookies.mockResolvedValue(makeCookieStore(TEST_SECRET));
    const updated = { ...NOTE, content: "Updated" };
    mockUpdateNote.mockResolvedValue(updated);
    const { PATCH } = await import("@/app/api/notes/[id]/route");
    const res = await PATCH(makeRequest({ content: "Updated" }), {
      params: Promise.resolve({ id: "uuid-1" }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(updated);
    expect(mockUpdateNote).toHaveBeenCalledWith(
      "uuid-1",
      expect.objectContaining({ content: "Updated" }),
    );
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/notes/[id]
// ---------------------------------------------------------------------------

describe("DELETE /api/notes/[id]", () => {
  it("returns 401 without hub-edit cookie", async () => {
    vi.stubEnv("ADMIN_SECRET", TEST_SECRET);
    mockCookies.mockResolvedValue(makeCookieStore());
    const { DELETE } = await import("@/app/api/notes/[id]/route");
    const req = new NextRequest("https://example.com/api/notes/uuid-1", {
      method: "DELETE",
    });
    const res = await DELETE(req, {
      params: Promise.resolve({ id: "uuid-1" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 204 on success", async () => {
    vi.stubEnv("ADMIN_SECRET", TEST_SECRET);
    mockCookies.mockResolvedValue(makeCookieStore(TEST_SECRET));
    mockDeleteNote.mockResolvedValue(undefined);
    const { DELETE } = await import("@/app/api/notes/[id]/route");
    const req = new NextRequest("https://example.com/api/notes/uuid-1", {
      method: "DELETE",
    });
    const res = await DELETE(req, {
      params: Promise.resolve({ id: "uuid-1" }),
    });
    expect(res.status).toBe(204);
    expect(mockDeleteNote).toHaveBeenCalledWith("uuid-1");
  });
});
