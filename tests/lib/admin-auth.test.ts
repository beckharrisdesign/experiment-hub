import { describe, it, expect, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { checkAdminAuth, requireAdminCookie } from "@/lib/admin-auth";

const { mockCookies } = vi.hoisted(() => ({ mockCookies: vi.fn() }));

vi.mock("next/headers", () => ({ cookies: mockCookies }));

function makeCookieStore(value?: string) {
  return {
    get: vi.fn((name: string) =>
      name === "hub-edit" && value ? { name: "hub-edit", value } : undefined,
    ),
  };
}

const TEST_SECRET = "test-secret-abc123";

function makeRequest(authHeader?: string) {
  return new NextRequest("http://localhost/api/test", {
    method: "POST",
    headers: authHeader ? { authorization: authHeader } : {},
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("checkAdminAuth", () => {
  it("returns 503 when ADMIN_SECRET env var is not set", async () => {
    vi.stubEnv("ADMIN_SECRET", "");
    // Simulate truly missing env var
    delete process.env.ADMIN_SECRET;

    const response = checkAdminAuth(makeRequest(`Bearer ${TEST_SECRET}`));
    expect(response).not.toBeNull();
    expect(response!.status).toBe(503);
    const data = await response!.json();
    expect(data.error).toBe("Admin secret not configured");
  });

  it("returns 401 when no Authorization header is provided", async () => {
    vi.stubEnv("ADMIN_SECRET", TEST_SECRET);

    const response = checkAdminAuth(makeRequest());
    expect(response).not.toBeNull();
    expect(response!.status).toBe(401);
    const data = await response!.json();
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 401 when the token is wrong", async () => {
    vi.stubEnv("ADMIN_SECRET", TEST_SECRET);

    const response = checkAdminAuth(makeRequest("Bearer wrong-token"));
    expect(response).not.toBeNull();
    expect(response!.status).toBe(401);
    const data = await response!.json();
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 401 when Authorization header is malformed (no Bearer prefix)", async () => {
    vi.stubEnv("ADMIN_SECRET", TEST_SECRET);

    const response = checkAdminAuth(makeRequest(`Token ${TEST_SECRET}`));
    expect(response).not.toBeNull();
    expect(response!.status).toBe(401);
    const data = await response!.json();
    expect(data.error).toBe("Unauthorized");
  });

  it("returns null when the correct token is provided", () => {
    vi.stubEnv("ADMIN_SECRET", TEST_SECRET);

    const response = checkAdminAuth(makeRequest(`Bearer ${TEST_SECRET}`));
    expect(response).toBeNull();
  });
});

describe("requireAdminCookie", () => {
  it("fails closed when ADMIN_SECRET is unset and no cookie is sent", async () => {
    // Regression: undefined === undefined must not grant admin access.
    vi.stubEnv("ADMIN_SECRET", "");
    delete process.env.ADMIN_SECRET;
    mockCookies.mockResolvedValue(makeCookieStore());

    expect(await requireAdminCookie()).toBe(false);
  });

  it("fails closed when ADMIN_SECRET is unset even if a cookie is sent", async () => {
    vi.stubEnv("ADMIN_SECRET", "");
    delete process.env.ADMIN_SECRET;
    mockCookies.mockResolvedValue(makeCookieStore("anything"));

    expect(await requireAdminCookie()).toBe(false);
  });

  it("fails closed when ADMIN_SECRET is an empty string", async () => {
    vi.stubEnv("ADMIN_SECRET", "");
    mockCookies.mockResolvedValue(makeCookieStore(""));

    expect(await requireAdminCookie()).toBe(false);
  });

  it("returns false when the cookie is missing", async () => {
    vi.stubEnv("ADMIN_SECRET", TEST_SECRET);
    mockCookies.mockResolvedValue(makeCookieStore());

    expect(await requireAdminCookie()).toBe(false);
  });

  it("returns false when the cookie value is wrong", async () => {
    vi.stubEnv("ADMIN_SECRET", TEST_SECRET);
    mockCookies.mockResolvedValue(makeCookieStore("wrong-secret"));

    expect(await requireAdminCookie()).toBe(false);
  });

  it("returns true when the cookie matches ADMIN_SECRET", async () => {
    vi.stubEnv("ADMIN_SECRET", TEST_SECRET);
    mockCookies.mockResolvedValue(makeCookieStore(TEST_SECRET));

    expect(await requireAdminCookie()).toBe(true);
  });
});
