/**
 * Tests for the prototype server management API routes:
 *   POST /api/prototypes/[port]/start
 *   POST /api/prototypes/[port]/stop
 *   GET  /api/prototypes/[port]/status
 *
 * All external dependencies (child_process, fs, net, lib/data, lib/admin-auth)
 * are mocked so no real processes are spawned or files accessed.
 *
 * vi.hoisted() is used for mock handles that must be accessible inside vi.mock
 * factories (which are hoisted above variable declarations by Vitest).
 * importOriginal is used for Node built-in modules to preserve non-mocked exports.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { promisify } from "util";

// ---------------------------------------------------------------------------
// Hoisted mock handles
// ---------------------------------------------------------------------------

const {
  mockCheckAdminAuth,
  mockGetPrototypes,
  mockSpawn,
  mockExec,
  mockStat,
  mockAccess,
  mockSocketInstance,
} = vi.hoisted(() => {
  const mockSocketInstance = {
    once: vi.fn(),
    connect: vi.fn(),
    destroy: vi.fn(),
  };
  return {
    mockCheckAdminAuth: vi.fn(
      () => null as ReturnType<typeof NextResponse.json> | null,
    ),
    mockGetPrototypes: vi.fn(),
    mockSpawn: vi.fn(),
    mockExec: vi.fn(),
    mockStat: vi.fn(),
    mockAccess: vi.fn(),
    mockSocketInstance,
  };
});

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("@/lib/admin-auth", () => ({
  checkAdminAuth: mockCheckAdminAuth,
}));

vi.mock("@/lib/data", () => ({
  getPrototypes: mockGetPrototypes,
}));

// The stop route calls promisify(exec), which resolves with {stdout, stderr}
// only when exec has util.promisify.custom (as the real exec does). Without it,
// promisify resolves with just the first arg (a string), breaking the destructure.
// mockExecAsync is that custom implementation; we wire it up before the route imports.
const mockExecAsync = vi.fn();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(mockExec as any)[promisify.custom] = mockExecAsync;

// For CJS built-in modules Vitest requires an explicit `default` key alongside
// named exports, otherwise the route's named imports fail with "No default export".
vi.mock("child_process", () => ({
  default: { spawn: mockSpawn, exec: mockExec },
  spawn: mockSpawn,
  exec: mockExec,
}));

vi.mock("fs", () => ({
  default: { promises: { stat: mockStat, access: mockAccess } },
  promises: { stat: mockStat, access: mockAccess },
}));

// net.Socket is used as a constructor; a regular function (not arrow fn) that
// returns an object will satisfy `new net.Socket()` in the route.
vi.mock("net", async (importOriginal) => {
  const actual = await importOriginal<typeof import("net")>();
  return {
    ...actual,
    default: {
      ...actual,
      Socket: function MockSocket() {
        return mockSocketInstance;
      },
    },
  };
});

// ---------------------------------------------------------------------------
// Shared test data
// ---------------------------------------------------------------------------

const FAKE_PROTOTYPE = {
  id: "proto-1",
  experimentId: "exp-1",
  port: 3100,
  linkPath: "experiments/best-day-ever/prototype",
};

function makeRequest(method: "GET" | "POST", port: string) {
  return new NextRequest(`http://localhost/api/prototypes/${port}`, {
    method,
    headers: { authorization: "Bearer test-secret" },
  });
}

function makeParams(port: string) {
  return { params: Promise.resolve({ port }) };
}

// ---------------------------------------------------------------------------
// POST /api/prototypes/[port]/start
// ---------------------------------------------------------------------------

describe("POST /api/prototypes/[port]/start", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let POST: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockCheckAdminAuth.mockReturnValue(null);
    mockStat.mockResolvedValue({ isDirectory: () => true });
    mockAccess.mockResolvedValue(undefined);
    mockSpawn.mockReturnValue({ unref: vi.fn() });
    mockGetPrototypes.mockResolvedValue([FAKE_PROTOTYPE]);

    ({ POST } = await import("@/app/api/prototypes/[port]/start/route"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 401 when auth fails", async () => {
    mockCheckAdminAuth.mockReturnValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    );
    const res = await POST(makeRequest("POST", "3100"), makeParams("3100"));
    expect(res.status).toBe(401);
  });

  it("returns 400 for a non-numeric port", async () => {
    const res = await POST(makeRequest("POST", "abc"), makeParams("abc"));
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toMatch(/invalid port/i);
  });

  it("returns 400 for port 0", async () => {
    const res = await POST(makeRequest("POST", "0"), makeParams("0"));
    expect(res.status).toBe(400);
  });

  it("returns 400 for port above 65535", async () => {
    const res = await POST(makeRequest("POST", "99999"), makeParams("99999"));
    expect(res.status).toBe(400);
  });

  it("returns 404 when no prototype is registered for the port", async () => {
    mockGetPrototypes.mockResolvedValueOnce([]);
    const res = await POST(makeRequest("POST", "3100"), makeParams("3100"));
    const data = await res.json();
    expect(res.status).toBe(404);
    expect(data.error).toMatch(/not found/i);
  });

  it("returns 404 when prototype directory does not exist", async () => {
    mockStat.mockRejectedValueOnce(
      Object.assign(new Error("ENOENT"), { code: "ENOENT" }),
    );
    const res = await POST(makeRequest("POST", "3100"), makeParams("3100"));
    expect(res.status).toBe(404);
  });

  it("returns 404 when prototype path is a file, not a directory", async () => {
    mockStat.mockResolvedValueOnce({ isDirectory: () => false });
    const res = await POST(makeRequest("POST", "3100"), makeParams("3100"));
    expect(res.status).toBe(404);
  });

  it("returns 404 when package.json is missing from prototype directory", async () => {
    mockAccess.mockRejectedValueOnce(new Error("ENOENT"));
    const res = await POST(makeRequest("POST", "3100"), makeParams("3100"));
    expect(res.status).toBe(404);
  });

  it("spawns npm run dev and returns 200 on success", async () => {
    const resPromise = POST(makeRequest("POST", "3100"), makeParams("3100"));
    await vi.runAllTimersAsync();
    const res = await resPromise;
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.port).toBe(3100);
    expect(mockSpawn).toHaveBeenCalledWith(
      "npm",
      ["run", "dev"],
      expect.objectContaining({ detached: true }),
    );
  });

  it("calls unref() on the child process so it outlives the request", async () => {
    const mockChild = { unref: vi.fn() };
    mockSpawn.mockReturnValueOnce(mockChild);

    const resPromise = POST(makeRequest("POST", "3100"), makeParams("3100"));
    await vi.runAllTimersAsync();
    await resPromise;

    expect(mockChild.unref).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// POST /api/prototypes/[port]/stop
// ---------------------------------------------------------------------------

describe("POST /api/prototypes/[port]/stop", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let POST: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockCheckAdminAuth.mockReturnValue(null);
    ({ POST } = await import("@/app/api/prototypes/[port]/stop/route"));
  });

  it("returns 401 when auth fails", async () => {
    mockCheckAdminAuth.mockReturnValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    );
    const res = await POST(makeRequest("POST", "3100"), makeParams("3100"));
    expect(res.status).toBe(401);
  });

  it("returns 400 for a non-numeric port", async () => {
    const res = await POST(makeRequest("POST", "abc"), makeParams("abc"));
    expect(res.status).toBe(400);
  });

  it("returns 400 for port 0", async () => {
    const res = await POST(makeRequest("POST", "0"), makeParams("0"));
    expect(res.status).toBe(400);
  });

  it("reports no process found when lsof returns empty (exec throws)", async () => {
    // lsof exits non-zero when no process is on the port → execAsync rejects
    mockExecAsync.mockRejectedValueOnce(new Error("exit code 1"));

    const res = await POST(makeRequest("POST", "3100"), makeParams("3100"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(false);
    expect(data.message).toMatch(/no process/i);
  });

  it("kills the process and returns success when lsof finds a PID", async () => {
    // First call: lsof resolves with a PID; second call: kill resolves
    mockExecAsync
      .mockResolvedValueOnce({ stdout: "12345\n", stderr: "" })
      .mockResolvedValueOnce({ stdout: "", stderr: "" });

    const res = await POST(makeRequest("POST", "3100"), makeParams("3100"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toMatch(/stopped/i);
    expect(data.port).toBe(3100);
  });
});

// ---------------------------------------------------------------------------
// GET /api/prototypes/[port]/status
// ---------------------------------------------------------------------------

describe("GET /api/prototypes/[port]/status", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let GET: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockCheckAdminAuth.mockReturnValue(null);
    ({ GET } = await import("@/app/api/prototypes/[port]/status/route"));
  });

  it("returns 401 when auth fails", async () => {
    mockCheckAdminAuth.mockReturnValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    );
    const res = await GET(makeRequest("GET", "3100"), makeParams("3100"));
    expect(res.status).toBe(401);
  });

  it("returns 400 for a non-numeric port", async () => {
    const res = await GET(makeRequest("GET", "abc"), makeParams("abc"));
    expect(res.status).toBe(400);
  });

  it("returns 400 for port 0", async () => {
    const res = await GET(makeRequest("GET", "0"), makeParams("0"));
    expect(res.status).toBe(400);
  });

  it("returns running:true when socket connects successfully", async () => {
    mockSocketInstance.once.mockImplementation(
      (event: string, handler: () => void) => {
        if (event === "connect") setTimeout(handler, 0);
        return mockSocketInstance;
      },
    );

    const res = await GET(makeRequest("GET", "3100"), makeParams("3100"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.port).toBe(3100);
    expect(data.running).toBe(true);
  });

  it("returns running:false when socket connection is refused", async () => {
    mockSocketInstance.once.mockImplementation(
      (event: string, handler: (err?: Error) => void) => {
        if (event === "error")
          setTimeout(
            () =>
              handler(
                Object.assign(new Error("ECONNREFUSED"), {
                  code: "ECONNREFUSED",
                }),
              ),
            0,
          );
        return mockSocketInstance;
      },
    );

    const res = await GET(makeRequest("GET", "3100"), makeParams("3100"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.running).toBe(false);
  });

  it("includes the port number in the response", async () => {
    mockSocketInstance.once.mockImplementation(
      (event: string, handler: (err?: Error) => void) => {
        if (event === "error")
          setTimeout(() => handler(new Error("ECONNREFUSED")), 0);
        return mockSocketInstance;
      },
    );

    const res = await GET(makeRequest("GET", "4200"), makeParams("4200"));
    const data = await res.json();

    expect(data.port).toBe(4200);
  });
});
