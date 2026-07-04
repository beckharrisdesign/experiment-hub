/**
 * Tests for the Supabase read-client key fallback (#264 root cause):
 * an environment configured with only SUPABASE_SERVICE_ROLE_KEY was
 * writing to Supabase but silently reading from the stale JSON snapshot,
 * so admin edits appeared not to persist. Reads must fall back to the
 * service-role key when the publishable key is absent.
 */
import { describe, it, expect, vi, afterEach } from "vitest";

const { mockCreateClient } = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: mockCreateClient,
}));

function stubClientReturning(rows: unknown[]) {
  mockCreateClient.mockReturnValue({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(async () => ({ data: rows, error: null })),
      })),
    })),
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  vi.resetModules();
});

describe("supabase read client key fallback", () => {
  it("reads with the service-role key when the publishable key is absent", async () => {
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
    stubClientReturning([]);

    const { getExperimentsFromSupabase } = await import("@/lib/supabase");
    await expect(getExperimentsFromSupabase()).resolves.toEqual([]);
    expect(mockCreateClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "service-role-key",
    );
  });

  it("prefers the publishable key when both are set", async () => {
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "publishable-key");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
    stubClientReturning([]);

    const { getExperimentsFromSupabase } = await import("@/lib/supabase");
    await expect(getExperimentsFromSupabase()).resolves.toEqual([]);
    expect(mockCreateClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "publishable-key",
    );
  });

  it("throws when neither key is set", async () => {
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

    const { getExperimentsFromSupabase } = await import("@/lib/supabase");
    await expect(getExperimentsFromSupabase()).rejects.toThrow();
  });
});
