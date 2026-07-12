/**
 * Tests for the linked-repos API surface (openspec/changes/linked-repos):
 *   /api/linked-repos            — list, create
 *   /api/linked-repos/[id]       — get, update, delete
 *   /api/linked-repos/[id]/notes — list, create (linked_repo_id owner)
 *   /api/experiments/id/[id]/graduate — atomic Graduated + linked_repo_id
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";

const TEST_SECRET = "test-admin-secret-xyz";
const REPO_ID = "11111111-1111-1111-1111-111111111111";

// ---------------------------------------------------------------------------
// Mock lib/supabase
// ---------------------------------------------------------------------------

const {
  mockGetLinkedRepos,
  mockGetLinkedRepoById,
  mockCreateLinkedRepo,
  mockUpdateLinkedRepo,
  mockDeleteLinkedRepo,
  mockGetLinkedRepoNotes,
  mockCreateLinkedRepoNote,
  mockGraduateExperiment,
  mockGetNoteById,
  mockUpdateNote,
  mockDeleteNote,
  mockUpsertPullRequests,
} = vi.hoisted(() => ({
  mockGetLinkedRepos: vi.fn(),
  mockGetLinkedRepoById: vi.fn(),
  mockCreateLinkedRepo: vi.fn(),
  mockUpdateLinkedRepo: vi.fn(),
  mockDeleteLinkedRepo: vi.fn(),
  mockGetLinkedRepoNotes: vi.fn(),
  mockCreateLinkedRepoNote: vi.fn(),
  mockGraduateExperiment: vi.fn(),
  mockGetNoteById: vi.fn(),
  mockUpdateNote: vi.fn(),
  mockDeleteNote: vi.fn(),
  mockUpsertPullRequests: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  getLinkedRepos: mockGetLinkedRepos,
  getLinkedRepoById: mockGetLinkedRepoById,
  createLinkedRepo: mockCreateLinkedRepo,
  updateLinkedRepo: mockUpdateLinkedRepo,
  deleteLinkedRepo: mockDeleteLinkedRepo,
  getLinkedRepoNotes: mockGetLinkedRepoNotes,
  createLinkedRepoNote: mockCreateLinkedRepoNote,
  graduateExperiment: mockGraduateExperiment,
  getNoteById: mockGetNoteById,
  updateNote: mockUpdateNote,
  deleteNote: mockDeleteNote,
  upsertPullRequests: mockUpsertPullRequests,
}));

// ---------------------------------------------------------------------------
// Mock next/headers cookies()
// ---------------------------------------------------------------------------

const { mockCookies } = vi.hoisted(() => ({ mockCookies: vi.fn() }));

vi.mock("next/headers", () => ({ cookies: mockCookies }));

function makeCookieStore(value?: string) {
  return {
    get: vi.fn((name: string) =>
      name === "hub-edit" && value ? { name: "hub-edit", value } : undefined,
    ),
  };
}

function authed() {
  vi.stubEnv("ADMIN_SECRET", TEST_SECRET);
  mockCookies.mockResolvedValue(makeCookieStore(TEST_SECRET));
}

function unauthed() {
  vi.stubEnv("ADMIN_SECRET", TEST_SECRET);
  mockCookies.mockResolvedValue(makeCookieStore());
}

const LINKED_REPO = {
  id: REPO_ID,
  name: "MVDS",
  repoSlug: "beckharrisdesign/mvds",
  description: null,
  worktreePath: null,
  createdAt: "2026-07-01T00:00:00Z",
  updatedAt: "2026-07-01T00:00:00Z",
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// /api/linked-repos
// ---------------------------------------------------------------------------

describe("GET /api/linked-repos", () => {
  it("returns 401 without hub-edit cookie", async () => {
    unauthed();
    const { GET } = await import("@/app/api/linked-repos/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns linked repos when authorized", async () => {
    authed();
    mockGetLinkedRepos.mockResolvedValue([LINKED_REPO]);
    const { GET } = await import("@/app/api/linked-repos/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].repoSlug).toBe("beckharrisdesign/mvds");
  });
});

describe("POST /api/linked-repos", () => {
  function makeRequest(body: unknown) {
    return new NextRequest("http://localhost/api/linked-repos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("returns 401 without hub-edit cookie", async () => {
    unauthed();
    const { POST } = await import("@/app/api/linked-repos/route");
    const res = await POST(
      makeRequest({ name: "MVDS", repo_slug: "beckharrisdesign/mvds" }),
    );
    expect(res.status).toBe(401);
    expect(mockCreateLinkedRepo).not.toHaveBeenCalled();
  });

  it("returns 400 when name is missing", async () => {
    authed();
    const { POST } = await import("@/app/api/linked-repos/route");
    const res = await POST(makeRequest({ repo_slug: "a/b" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when repo_slug is missing", async () => {
    authed();
    const { POST } = await import("@/app/api/linked-repos/route");
    const res = await POST(makeRequest({ name: "MVDS" }));
    expect(res.status).toBe(400);
  });

  it("creates a linked repo and returns 201", async () => {
    authed();
    mockCreateLinkedRepo.mockResolvedValue(LINKED_REPO);
    const { POST } = await import("@/app/api/linked-repos/route");
    const res = await POST(
      makeRequest({ name: "MVDS", repo_slug: "beckharrisdesign/mvds" }),
    );
    expect(res.status).toBe(201);
    expect(mockCreateLinkedRepo).toHaveBeenCalledWith({
      name: "MVDS",
      repo_slug: "beckharrisdesign/mvds",
      description: undefined,
    });
  });
});

// ---------------------------------------------------------------------------
// /api/linked-repos/[id]
// ---------------------------------------------------------------------------

describe("/api/linked-repos/[id]", () => {
  const params = Promise.resolve({ id: REPO_ID });

  function makeRequest(method: string, body?: unknown) {
    return new NextRequest(`http://localhost/api/linked-repos/${REPO_ID}`, {
      method,
      headers: { "Content-Type": "application/json" },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  }

  it("GET returns 404 when repo does not exist", async () => {
    authed();
    mockGetLinkedRepoById.mockResolvedValue(null);
    const { GET } = await import("@/app/api/linked-repos/[id]/route");
    const res = await GET(makeRequest("GET"), { params });
    expect(res.status).toBe(404);
  });

  it("GET returns the linked repo", async () => {
    authed();
    mockGetLinkedRepoById.mockResolvedValue(LINKED_REPO);
    const { GET } = await import("@/app/api/linked-repos/[id]/route");
    const res = await GET(makeRequest("GET"), { params });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(REPO_ID);
  });

  it("PATCH updates the linked repo", async () => {
    authed();
    mockGetLinkedRepoById.mockResolvedValue(LINKED_REPO);
    mockUpdateLinkedRepo.mockResolvedValue({
      ...LINKED_REPO,
      name: "MVDS 2",
    });
    const { PATCH } = await import("@/app/api/linked-repos/[id]/route");
    const res = await PATCH(makeRequest("PATCH", { name: "MVDS 2" }), {
      params,
    });
    expect(res.status).toBe(200);
    expect(mockUpdateLinkedRepo).toHaveBeenCalled();
  });

  it("DELETE removes the linked repo", async () => {
    authed();
    mockGetLinkedRepoById.mockResolvedValue(LINKED_REPO);
    mockDeleteLinkedRepo.mockResolvedValue(undefined);
    const { DELETE } = await import("@/app/api/linked-repos/[id]/route");
    const res = await DELETE(makeRequest("DELETE"), { params });
    expect([200, 204]).toContain(res.status);
    expect(mockDeleteLinkedRepo).toHaveBeenCalledWith(REPO_ID);
  });
});

// ---------------------------------------------------------------------------
// /api/linked-repos/[id]/notes
// ---------------------------------------------------------------------------

describe("/api/linked-repos/[id]/notes", () => {
  const params = Promise.resolve({ id: REPO_ID });

  function makeRequest(method: string, body?: unknown) {
    return new NextRequest(
      `http://localhost/api/linked-repos/${REPO_ID}/notes`,
      {
        method,
        headers: { "Content-Type": "application/json" },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      },
    );
  }

  it("GET returns 401 without hub-edit cookie", async () => {
    unauthed();
    const { GET } = await import("@/app/api/linked-repos/[id]/notes/route");
    const res = await GET(makeRequest("GET"), { params });
    expect(res.status).toBe(401);
  });

  it("POST returns 400 when content is missing", async () => {
    authed();
    const { POST } = await import("@/app/api/linked-repos/[id]/notes/route");
    const res = await POST(makeRequest("POST", { title: "no content" }), {
      params,
    });
    expect(res.status).toBe(400);
    expect(mockCreateLinkedRepoNote).not.toHaveBeenCalled();
  });

  it("POST creates a note owned by the linked repo", async () => {
    authed();
    mockCreateLinkedRepoNote.mockResolvedValue({
      id: "note-1",
      linked_repo_id: REPO_ID,
      experiment_id: null,
      content: "First note",
      note_type: "observation",
    });
    const { POST } = await import("@/app/api/linked-repos/[id]/notes/route");
    const res = await POST(makeRequest("POST", { content: "First note" }), {
      params,
    });
    expect(res.status).toBe(201);
    expect(mockCreateLinkedRepoNote).toHaveBeenCalledWith(
      REPO_ID,
      expect.objectContaining({ content: "First note" }),
    );
  });
});

// ---------------------------------------------------------------------------
// POST /api/experiments/id/[id]/graduate
// ---------------------------------------------------------------------------

describe("POST /api/experiments/id/[id]/graduate", () => {
  const EXP_ID = "best-day-ever";
  const params = Promise.resolve({ id: EXP_ID });

  function makeRequest(body: unknown) {
    return new NextRequest(
      `http://localhost/api/experiments/id/${EXP_ID}/graduate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
  }

  it("returns 401 without hub-edit cookie", async () => {
    unauthed();
    const { POST } = await import("@/app/api/experiments/id/[id]/graduate/route");
    const res = await POST(makeRequest({ linked_repo_id: REPO_ID }), {
      params,
    });
    expect(res.status).toBe(401);
    expect(mockGraduateExperiment).not.toHaveBeenCalled();
  });

  it("returns 400 when linked_repo_id is missing", async () => {
    authed();
    const { POST } = await import("@/app/api/experiments/id/[id]/graduate/route");
    const res = await POST(makeRequest({}), { params });
    expect(res.status).toBe(400);
  });

  it("returns 404 when the linked repo does not exist", async () => {
    authed();
    mockGetLinkedRepoById.mockResolvedValue(null);
    const { POST } = await import("@/app/api/experiments/id/[id]/graduate/route");
    const res = await POST(makeRequest({ linked_repo_id: REPO_ID }), {
      params,
    });
    expect(res.status).toBe(404);
    expect(mockGraduateExperiment).not.toHaveBeenCalled();
  });

  it("graduates the experiment atomically", async () => {
    authed();
    mockGetLinkedRepoById.mockResolvedValue(LINKED_REPO);
    mockGraduateExperiment.mockResolvedValue({
      id: EXP_ID,
      status: "Graduated",
      linkedRepoId: REPO_ID,
    });
    const { POST } = await import("@/app/api/experiments/id/[id]/graduate/route");
    const res = await POST(makeRequest({ linked_repo_id: REPO_ID }), {
      params,
    });
    expect(res.status).toBe(200);
    expect(mockGraduateExperiment).toHaveBeenCalledWith(EXP_ID, REPO_ID);
    const body = await res.json();
    expect(body.status).toBe("Graduated");
  });
});

// ---------------------------------------------------------------------------
// PATCH/DELETE /api/linked-repos/[id]/notes/[noteId] — ownership scoping
// ---------------------------------------------------------------------------

describe("/api/linked-repos/[id]/notes/[noteId]", () => {
  const NOTE_ID = "note-1";
  const params = Promise.resolve({ id: REPO_ID, noteId: NOTE_ID });

  function makeRequest(method: string, body?: unknown) {
    return new NextRequest(
      `http://localhost/api/linked-repos/${REPO_ID}/notes/${NOTE_ID}`,
      {
        method,
        headers: { "Content-Type": "application/json" },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      },
    );
  }

  const OWNED_NOTE = {
    id: NOTE_ID,
    linked_repo_id: REPO_ID,
    experiment_id: null,
    content: "owned",
    note_type: "observation",
  };

  it("PATCH returns 404 when the note belongs to a different linked repo", async () => {
    authed();
    mockGetNoteById.mockResolvedValue({
      ...OWNED_NOTE,
      linked_repo_id: "22222222-2222-2222-2222-222222222222",
    });
    const { PATCH } =
      await import("@/app/api/linked-repos/[id]/notes/[noteId]/route");
    const res = await PATCH(makeRequest("PATCH", { content: "hijack" }), {
      params,
    });
    expect(res.status).toBe(404);
    expect(mockUpdateNote).not.toHaveBeenCalled();
  });

  it("PATCH returns 404 when the note belongs to an experiment", async () => {
    authed();
    mockGetNoteById.mockResolvedValue({
      ...OWNED_NOTE,
      linked_repo_id: null,
      experiment_id: "best-day-ever",
    });
    const { PATCH } =
      await import("@/app/api/linked-repos/[id]/notes/[noteId]/route");
    const res = await PATCH(makeRequest("PATCH", { content: "hijack" }), {
      params,
    });
    expect(res.status).toBe(404);
    expect(mockUpdateNote).not.toHaveBeenCalled();
  });

  it("PATCH updates a note owned by the linked repo", async () => {
    authed();
    mockGetNoteById.mockResolvedValue(OWNED_NOTE);
    mockUpdateNote.mockResolvedValue({ ...OWNED_NOTE, content: "updated" });
    const { PATCH } =
      await import("@/app/api/linked-repos/[id]/notes/[noteId]/route");
    const res = await PATCH(makeRequest("PATCH", { content: "updated" }), {
      params,
    });
    expect(res.status).toBe(200);
    expect(mockUpdateNote).toHaveBeenCalledWith(
      NOTE_ID,
      expect.objectContaining({ content: "updated" }),
    );
  });

  it("DELETE returns 404 for a note outside this linked repo", async () => {
    authed();
    mockGetNoteById.mockResolvedValue({
      ...OWNED_NOTE,
      linked_repo_id: "22222222-2222-2222-2222-222222222222",
    });
    const { DELETE } =
      await import("@/app/api/linked-repos/[id]/notes/[noteId]/route");
    const res = await DELETE(makeRequest("DELETE"), { params });
    expect(res.status).toBe(404);
    expect(mockDeleteNote).not.toHaveBeenCalled();
  });

  it("DELETE removes a note owned by the linked repo", async () => {
    authed();
    mockGetNoteById.mockResolvedValue(OWNED_NOTE);
    mockDeleteNote.mockResolvedValue(undefined);
    const { DELETE } =
      await import("@/app/api/linked-repos/[id]/notes/[noteId]/route");
    const res = await DELETE(makeRequest("DELETE"), { params });
    expect(res.status).toBe(204);
    expect(mockDeleteNote).toHaveBeenCalledWith(NOTE_ID);
  });
});

// ---------------------------------------------------------------------------
// POST /api/linked-repos/[id]/sync-prs
// ---------------------------------------------------------------------------

describe("POST /api/linked-repos/[id]/sync-prs", () => {
  const params = Promise.resolve({ id: REPO_ID });

  function makeRequest() {
    return new NextRequest(
      `http://localhost/api/linked-repos/${REPO_ID}/sync-prs`,
      { method: "POST" },
    );
  }

  const GITHUB_PR = {
    number: 7,
    title: "Add tokens",
    state: "open",
    html_url: "https://github.com/beckharrisdesign/mvds/pull/7",
    head: { ref: "feature/tokens" },
    user: { login: "beckharrisdesign" },
    labels: [{ name: "enhancement" }],
    created_at: "2026-07-01T00:00:00Z",
  };

  it("returns 401 without hub-edit cookie", async () => {
    unauthed();
    const { POST } = await import("@/app/api/linked-repos/[id]/sync-prs/route");
    const res = await POST(makeRequest(), { params });
    expect(res.status).toBe(401);
  });

  it("returns 404 when the linked repo does not exist", async () => {
    authed();
    mockGetLinkedRepoById.mockResolvedValue(null);
    const { POST } = await import("@/app/api/linked-repos/[id]/sync-prs/route");
    const res = await POST(makeRequest(), { params });
    expect(res.status).toBe(404);
  });

  it("returns 503 when GITHUB_TOKEN is not configured", async () => {
    authed();
    vi.stubEnv("GITHUB_TOKEN", "");
    mockGetLinkedRepoById.mockResolvedValue(LINKED_REPO);
    const { POST } = await import("@/app/api/linked-repos/[id]/sync-prs/route");
    const res = await POST(makeRequest(), { params });
    expect(res.status).toBe(503);
  });

  it("returns 502 when the GitHub API errors", async () => {
    authed();
    vi.stubEnv("GITHUB_TOKEN", "gh-token");
    mockGetLinkedRepoById.mockResolvedValue(LINKED_REPO);
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("rate limited", { status: 403 }));
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const { POST } = await import("@/app/api/linked-repos/[id]/sync-prs/route");
    const res = await POST(makeRequest(), { params });
    expect(res.status).toBe(502);
    fetchSpy.mockRestore();
    consoleError.mockRestore();
  });

  it("upserts PRs owned by the linked repo and returns a success envelope", async () => {
    authed();
    vi.stubEnv("GITHUB_TOKEN", "gh-token");
    mockGetLinkedRepoById.mockResolvedValue(LINKED_REPO);
    mockUpsertPullRequests.mockResolvedValue([
      { id: "pr-row-1", prNumber: 7, linkedRepoId: REPO_ID },
    ]);
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify([GITHUB_PR]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const { POST } = await import("@/app/api/linked-repos/[id]/sync-prs/route");
    const res = await POST(makeRequest(), { params });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.pullRequests).toHaveLength(1);
    expect(mockUpsertPullRequests).toHaveBeenCalledWith([
      expect.objectContaining({
        linked_repo_id: REPO_ID,
        experiment_id: null,
        repo: "beckharrisdesign/mvds",
        pr_number: 7,
      }),
    ]);
    fetchSpy.mockRestore();
  });

  it("returns 500 with an error body when the upsert throws", async () => {
    authed();
    vi.stubEnv("GITHUB_TOKEN", "gh-token");
    mockGetLinkedRepoById.mockResolvedValue(LINKED_REPO);
    mockUpsertPullRequests.mockRejectedValue(new Error("constraint violation"));
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify([GITHUB_PR]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const { POST } = await import("@/app/api/linked-repos/[id]/sync-prs/route");
    const res = await POST(makeRequest(), { params });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to save pull requests");
    fetchSpy.mockRestore();
    consoleError.mockRestore();
  });
});
