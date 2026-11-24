/**
 * The scheduled folder sync's way past the session gate (task 7d, D12): its
 * derived key, on its one route, by POST — and nowhere else.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";
import {
  PDF_SYNC_KEY_HEADER,
  PDF_SYNC_PATH,
  SYNC_KEY_LABEL,
  deriveSyncKey,
  verifySyncKey,
} from "@/lib/pdf-auth";

const ROOT = "test-service-role-key-not-real";

afterEach(() => vi.unstubAllEnvs());

describe("deriveSyncKey / verifySyncKey", () => {
  it("matches what the workflow computes with openssl (HMAC-SHA256 of the label, hex)", async () => {
    const expected = createHmac("sha256", ROOT).update(SYNC_KEY_LABEL).digest("hex");
    expect(await deriveSyncKey(ROOT)).toBe(expected);
  });

  it("accepts the derived key", async () => {
    expect(await verifySyncKey(await deriveSyncKey(ROOT), ROOT)).toBe(true);
  });

  it("refuses the root key itself, a key from another root, and junk", async () => {
    expect(await verifySyncKey(ROOT, ROOT)).toBe(false);
    expect(await verifySyncKey(await deriveSyncKey("other-root"), ROOT)).toBe(false);
    expect(await verifySyncKey("zz".repeat(32), ROOT)).toBe(false);
    expect(await verifySyncKey(null, ROOT)).toBe(false);
  });

  it("refuses everything when the root isn't configured", async () => {
    expect(await verifySyncKey(await deriveSyncKey(ROOT), "")).toBe(false);
  });

  it("is not the exec-function cron's key", () => {
    const efa = createHmac("sha256", ROOT).update("exec-function-assessment/access/v1").digest("hex");
    expect(createHmac("sha256", ROOT).update(SYNC_KEY_LABEL).digest("hex")).not.toBe(efa);
  });
});

describe("middleware gate for the sync", () => {
  async function call(path: string, method: string, key?: string) {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", ROOT);
    vi.stubEnv("PDF_SESSION_SECRET", "session-secret");
    const { middleware } = await import("@/middleware");
    const headers = key ? { [PDF_SYNC_KEY_HEADER]: key } : undefined;
    return middleware(new NextRequest(`https://labs.example.com${path}`, { method, headers }));
  }

  it("lets the key through on POST to the sync route", async () => {
    const res = await call(PDF_SYNC_PATH, "POST", await deriveSyncKey(ROOT));
    expect(res.status).toBe(200);
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("refuses the sync route without a key or with a wrong one", async () => {
    expect((await call(PDF_SYNC_PATH, "POST")).status).toBe(401);
    expect((await call(PDF_SYNC_PATH, "POST", await deriveSyncKey("other"))).status).toBe(401);
  });

  it("refuses the key by GET", async () => {
    expect((await call(PDF_SYNC_PATH, "GET", await deriveSyncKey(ROOT))).status).toBe(401);
  });

  it("refuses the key on every other gated route", async () => {
    const key = await deriveSyncKey(ROOT);
    expect((await call("/api/pdf-documents", "POST", key)).status).toBe(401);
    expect((await call("/api/pdf-drive/import", "POST", key)).status).toBe(401);
    expect((await call(`${PDF_SYNC_PATH}/x`, "POST", key)).status).toBe(401);
  });
});
