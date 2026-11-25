/** The route gives the database's schedule its key (task 7k, migration 035). */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.hoisted(() => vi.fn());
vi.mock("@/lib/pdf-documents", () => ({ getPdfAdminClient: () => ({ rpc }) }));

import { keepSyncKey } from "@/lib/pdf-sync-key";
import { deriveSyncKey } from "@/lib/pdf-auth";

const ROOT = "test-service-role-key-not-real";

beforeEach(() => {
  rpc.mockReset().mockResolvedValue({ error: null });
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", ROOT);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("keepSyncKey", () => {
  it("hands over the derived key, never the key it is derived from", async () => {
    await keepSyncKey();
    expect(rpc).toHaveBeenCalledWith("pdf_sync_set_key", { key: await deriveSyncKey(ROOT) });
    expect(JSON.stringify(rpc.mock.calls)).not.toContain(ROOT);
  });

  it("does nothing without a root", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    await keepSyncKey();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("never fails the run, and never logs the key", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    rpc.mockResolvedValue({ error: { message: "no such function" } });
    await expect(keepSyncKey()).resolves.toBeUndefined();
    rpc.mockRejectedValue(new Error("offline"));
    await expect(keepSyncKey()).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(warn.mock.calls.map((c) => c.map(String)))).not.toContain(
      await deriveSyncKey(ROOT),
    );
  });
});
