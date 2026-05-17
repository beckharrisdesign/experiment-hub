import { describe, expect, it } from "vitest";
import { EXPORT_FILENAME } from "./constants";
import {
  isAcceptedMime,
  isOversized,
  mimeRejectionMessage,
  oversizeMessage,
} from "./ingest";

// ---------------------------------------------------------------------------
// Ingest validation
// ---------------------------------------------------------------------------

describe("isAcceptedMime", () => {
  it("accepts jpeg, png, webp", () => {
    expect(isAcceptedMime("image/jpeg")).toBe(true);
    expect(isAcceptedMime("image/png")).toBe(true);
    expect(isAcceptedMime("image/webp")).toBe(true);
  });

  it("rejects other types", () => {
    expect(isAcceptedMime("image/tiff")).toBe(false);
    expect(isAcceptedMime("text/plain")).toBe(false);
  });
});

describe("guardrail copy", () => {
  it("describes unsupported MIME", () => {
    expect(mimeRejectionMessage("image/tiff")).toContain("JPEG");
  });

  it("flags oversize dimensions", () => {
    expect(isOversized(5000, 3000)).toBe(true);
    expect(oversizeMessage(5000, 3000)).toContain("5000");
  });
});

describe("export contract", () => {
  it("uses deterministic filename", () => {
    expect(EXPORT_FILENAME).toBe("photo-studio-export.png");
  });
});
