import { describe, expect, it } from "vitest";
import {
  OPENAI_VISION_SINGLE_TECHNIQUE,
  TESSERACT_PARSE_TECHNIQUE,
  buildCanonicalExtractionFromSeedData,
  canonicalExtractionToSeedData,
  resolveExtractionAttempts,
} from "./packetExtraction";

// ---------------------------------------------------------------------------
// Canonical extraction model
// ---------------------------------------------------------------------------

describe("packetExtraction", () => {
  it("exposes canonical fields without requiring side-owned metadata", () => {
    const result = buildCanonicalExtractionFromSeedData(
      {
        name: "Tomato",
        brand: "Baker Creek",
        sunRequirement: "Full sun",
        fieldSources: {
          name: "front",
          brand: "back",
          sunRequirement: "back",
        },
      },
      {
        attemptId: "ai-single",
        technique: OPENAI_VISION_SINGLE_TECHNIQUE,
        imageLabels: ["front", "back"],
      },
    );

    expect(result.name).toBe("Tomato");
    expect(result.brand).toBe("Baker Creek");
    expect(result.fields.name?.evidence[0].imageLabel).toBe("front");
    expect(result.fields.brand?.evidence[0].imageLabel).toBe("back");

    const flat = canonicalExtractionToSeedData(result);
    expect(flat.name).toBe("Tomato");
    expect(flat.fieldSources).toBeUndefined();
  });

  it("keeps raw text separate from normalized form values", () => {
    const result = buildCanonicalExtractionFromSeedData(
      { sunRequirement: "Min full sun", year: 2024 },
      {
        attemptId: "ocr",
        technique: TESSERACT_PARSE_TECHNIQUE,
        imageLabels: ["unknown"],
      },
    );

    expect(result.sunRequirement).toBe("Min full sun");
    expect(result.fields.sunRequirement?.rawValue).toBe("Min full sun");
    expect(result.fields.sunRequirement?.normalizedValue).toBe("full-sun");
    expect(result.fields.year?.normalizedValue).toBe(2024);
  });

  it("retains alternatives and diagnostics when techniques disagree", () => {
    const lowConfidence = buildCanonicalExtractionFromSeedData(
      { name: "Tomato", confidence: 0.4 },
      {
        attemptId: "ocr",
        technique: TESSERACT_PARSE_TECHNIQUE,
        imageLabels: ["front"],
      },
    ).attempts[0];
    const highConfidence = buildCanonicalExtractionFromSeedData(
      { name: "Pepper", confidence: 0.9 },
      {
        attemptId: "ai",
        technique: OPENAI_VISION_SINGLE_TECHNIQUE,
        imageLabels: ["front"],
      },
    ).attempts[0];

    const result = resolveExtractionAttempts([lowConfidence, highConfidence]);

    expect(result.name).toBe("Pepper");
    expect(result.alternatives.name).toHaveLength(1);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: "warning",
          field: "name",
        }),
      ]),
    );
  });
});
