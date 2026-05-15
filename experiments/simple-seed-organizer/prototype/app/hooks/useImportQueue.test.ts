import { describe, expect, it } from "vitest";
import { buildQueueExtractionFailurePatch } from "./useImportQueue";

describe("buildQueueExtractionFailurePatch", () => {
  it("returns queued_seed_image guidance for token-limit responses", () => {
    const patch = buildQueueExtractionFailurePatch(402);

    expect(patch.status).toBe("queued_seed_image");
    expect(patch.errorMessage).toContain("enter details manually");
  });

  it("returns needs_review with API-provided message for non-402 responses", () => {
    const patch = buildQueueExtractionFailurePatch(
      500,
      "Image too blurry to parse.",
    );

    expect(patch.status).toBe("needs_review");
    expect(patch.errorMessage).toBe("Image too blurry to parse.");
  });

  it("returns needs_review fallback copy when API omits a message", () => {
    const patch = buildQueueExtractionFailurePatch(500);

    expect(patch.status).toBe("needs_review");
    expect(patch.errorMessage).toContain(
      "Try again or enter details manually.",
    );
  });
});
