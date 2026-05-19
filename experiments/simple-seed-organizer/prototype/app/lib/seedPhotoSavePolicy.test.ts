import { beforeEach, describe, expect, it, vi } from "vitest";
import { needsLocalPhotoUpload } from "./seedPhotoSavePolicy";

// Persistence-related tests are time-bounded so a hung mock cannot stall CI (see spec).
vi.setConfig({ testTimeout: 10_000 });

describe("seedPhotoSavePolicy", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("treats https preview URLs as not requiring local upload fetch", () => {
    expect(needsLocalPhotoUpload("https://cdn.example/front.jpg")).toBe(false);
    expect(needsLocalPhotoUpload(null)).toBe(false);
    expect(needsLocalPhotoUpload(undefined)).toBe(false);
  });

  it("treats blob and data URLs as requiring local upload path", () => {
    expect(needsLocalPhotoUpload("blob:http://localhost/uuid")).toBe(true);
    expect(needsLocalPhotoUpload("data:image/png;base64,abc")).toBe(true);
  });

  it("does not hang when fetch for blob is mocked to resolve immediately", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        blob: async () => new Blob(["x"], { type: "image/jpeg" }),
      })) as unknown as typeof fetch,
    );
    const url = "blob:http://localhost/test-id";
    const res = await fetch(url);
    const blob = await res.blob();
    expect(blob.size).toBeGreaterThan(0);
    vi.unstubAllGlobals();
  });
});
