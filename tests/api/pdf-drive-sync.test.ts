import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({ syncFolder: vi.fn() }));
vi.mock("@/lib/pdf-sync", () => ({ syncFolder: mocks.syncFolder }));

import { POST } from "@/app/api/pdf-drive/sync/route";
import { DriveReauthorizationRequired } from "@/lib/pdf-drive";

beforeEach(() => {
  mocks.syncFolder.mockReset();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/pdf-drive/sync", () => {
  it("answers with counts only", async () => {
    mocks.syncFolder.mockResolvedValue({ inFolder: 5, added: 1, read: 2, failed: 0, remaining: 0 });
    const res = await POST();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      success: true,
      inFolder: 5,
      added: 1,
      read: 2,
      failed: 0,
      remaining: 0,
    });
  });

  it("says when Drive needs signing in again", async () => {
    mocks.syncFolder.mockRejectedValue(new DriveReauthorizationRequired("revoked"));
    expect((await POST()).status).toBe(409);
  });

  it("fails without detail otherwise", async () => {
    mocks.syncFolder.mockRejectedValue(new Error("secret detail"));
    const res = await POST();
    expect(res.status).toBe(502);
    expect(JSON.stringify(await res.json())).not.toContain("secret detail");
  });
});
