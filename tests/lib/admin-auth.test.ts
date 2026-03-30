import { describe, it, expect, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { checkAdminAuth } from "@/lib/admin-auth";

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
