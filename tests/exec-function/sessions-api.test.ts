import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { createHmac } from "node:crypto";

const listSessions = vi.fn();
const insertSession = vi.fn();
const getStoreClient = vi.fn();

vi.mock("@/lib/exec-function/server-store", () => ({
  getStoreClient: () => getStoreClient(),
  listSessions: (...args: unknown[]) => listSessions(...args),
  insertSession: (...args: unknown[]) => insertSession(...args),
  isStoreConfigured: () => true,
  SESSIONS_TABLE: "exec_function_sessions",
}));

const { GET, POST } = await import("@/app/api/exec-function/sessions/route");

const ADMIN = "test-admin-secret-0123456789";
const SERVICE_ROLE = "test-service-role-key-0123456789";
// The bearer key is derived from the service-role key, never equal to it.
const KEY = createHmac("sha256", SERVICE_ROLE)
  .update("exec-function-assessment/access/v1")
  .digest("hex");

function post(body: unknown, key: string | null = KEY): NextRequest {
  return new NextRequest("http://localhost/api/exec-function/sessions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(key ? { "x-efa-key": key } : {}),
    },
    body: JSON.stringify(body),
  });
}

function get(key: string | null = KEY): NextRequest {
  return new NextRequest("http://localhost/api/exec-function/sessions", {
    headers: key ? { "x-efa-key": key } : {},
  });
}

const validSession = {
  module: "corsi",
  variant: "forward",
  timestamp: "2026-08-24T12:00:00.000Z",
  dayKey: "2026-08-24",
  durationMs: 240000,
  headline: 30,
  detail: { blockSpan: 6, totalScore: 30 },
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ADMIN_SECRET = ADMIN;
  process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE_ROLE;
  delete process.env.EFA_ACCESS_KEY;
  getStoreClient.mockReturnValue({});
});

afterEach(() => {
  delete process.env.EFA_ACCESS_KEY;
  delete process.env.ADMIN_SECRET;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});

// ---------------------------------------------------------------------------
// Access
// ---------------------------------------------------------------------------

describe("access control", () => {
  it("reports itself unconfigured when no key is set, rather than erroring", () => {
    // The client reads `configured: false` as "use the local store", so this
    // path is what keeps the tool working with no infrastructure.
    delete process.env.EFA_ACCESS_KEY;
    delete process.env.ADMIN_SECRET;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    return Promise.all([GET(get()), POST(post(validSession))]).then(async ([g, p]) => {
      expect(g.status).toBe(503);
      expect((await g.json()).configured).toBe(false);
      expect(p.status).toBe(503);
    });
  });

  it("rejects a wrong key", async () => {
    const res = await POST(post(validSession, "wrong-key"));
    expect(res.status).toBe(401);
    expect(insertSession).not.toHaveBeenCalled();
  });

  it("rejects a missing key", async () => {
    expect((await GET(get(null))).status).toBe(401);
  });

  it("rejects a key that is a prefix of the real one", async () => {
    expect((await POST(post(validSession, KEY.slice(0, -1)))).status).toBe(401);
  });

  it("accepts the key from the link query as well as the header", async () => {
    insertSession.mockResolvedValue({ id: "row-1", ...validSession });
    const request = new NextRequest(
      `http://localhost/api/exec-function/sessions?k=${KEY}`,
      { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(validSession) },
    );
    expect((await POST(request)).status).toBe(201);
  });

  it("authorizes a browser already signed in to the hub admin area", async () => {
    // No bearer key at all — the cookie alone is enough, which is what lets the
    // suite work on a device you sit at without a key in the URL.
    insertSession.mockResolvedValue({ id: "row-cookie" });
    const request = new NextRequest("http://localhost/api/exec-function/sessions", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: `hub-edit=${ADMIN}` },
      body: JSON.stringify(validSession),
    });
    expect((await POST(request)).status).toBe(201);
  });

  it("rejects a wrong admin cookie", async () => {
    const request = new NextRequest("http://localhost/api/exec-function/sessions", {
      headers: { cookie: "hub-edit=not-the-secret" },
    });
    expect((await GET(request)).status).toBe(401);
  });

  it("does not accept either raw secret as the bearer key", async () => {
    // The link token is derived, so a leaked link exposes neither the
    // service-role key it comes from nor the hub's admin secret.
    expect(KEY).not.toBe(SERVICE_ROLE);
    expect(KEY).not.toBe(ADMIN);
    expect((await POST(post(validSession, SERVICE_ROLE))).status).toBe(401);
    expect((await POST(post(validSession, ADMIN))).status).toBe(401);
  });

  it("prefers a dedicated EFA_ACCESS_KEY when one is set", async () => {
    process.env.EFA_ACCESS_KEY = "dedicated-key-value";
    insertSession.mockResolvedValue({ id: "row-dedicated" });
    expect((await POST(post(validSession, "dedicated-key-value"))).status).toBe(201);
    expect((await POST(post(validSession, KEY))).status).toBe(401);
  });

  it("returns 503 when the key is right but no store is configured", async () => {
    getStoreClient.mockReturnValue(null);
    const res = await GET(get());
    expect(res.status).toBe(503);
    expect((await res.json()).configured).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

describe("POST validation", () => {
  const cases: [string, unknown][] = [
    ["an unknown module", { ...validSession, module: "stroop" }],
    ["a non-ISO timestamp", { ...validSession, timestamp: "yesterday" }],
    ["a malformed dayKey", { ...validSession, dayKey: "24/08/2026" }],
    ["a non-numeric headline", { ...validSession, headline: "30" }],
    ["a NaN headline", { ...validSession, headline: Number.NaN }],
    ["a negative duration", { ...validSession, durationMs: -1 }],
    ["a missing detail object", { ...validSession, detail: null }],
    ["a non-object body", "not an object"],
  ];

  for (const [label, body] of cases) {
    it(`rejects ${label}`, async () => {
      const res = await POST(post(body));
      expect(res.status).toBe(400);
      expect(insertSession).not.toHaveBeenCalled();
    });
  }

  it("rejects a body that is not valid JSON", async () => {
    const request = new NextRequest("http://localhost/api/exec-function/sessions", {
      method: "POST",
      headers: { "content-type": "application/json", "x-efa-key": KEY },
      body: "{ broken",
    });
    expect((await POST(request)).status).toBe(400);
  });

  it("accepts a null variant for a single-series module", async () => {
    insertSession.mockResolvedValue({ id: "row-2" });
    const res = await POST(post({ ...validSession, module: "n-back", variant: null }));
    expect(res.status).toBe(201);
  });

  it("ignores a client-supplied id so the database assigns it", async () => {
    insertSession.mockResolvedValue({ id: "row-3" });
    await POST(post({ ...validSession, id: "spoofed" }));
    expect(insertSession.mock.calls[0][1]).not.toHaveProperty("id");
  });
});

// ---------------------------------------------------------------------------
// Reads and failures
// ---------------------------------------------------------------------------

describe("GET", () => {
  it("returns the log", async () => {
    listSessions.mockResolvedValue([{ id: "row-1", headline: 30 }]);
    const res = await GET(get());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.sessions).toHaveLength(1);
    expect(body.configured).toBe(true);
  });

  it("surfaces a store failure as a 500 rather than an empty history", async () => {
    // An empty array here would look like "no sessions yet" and quietly erase
    // the record on screen; a 500 sends the client to its local fallback.
    listSessions.mockRejectedValue(new Error("connection refused"));
    const res = await GET(get());
    expect(res.status).toBe(500);
    expect((await res.json()).error).toContain("connection refused");
  });
});
