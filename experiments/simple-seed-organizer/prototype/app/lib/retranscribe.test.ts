/**
 * Re-transcription tests
 *
 * Verifies:
 *   1. extractWithAI can be called again on an existing seed's images (re-run works).
 *   2. User-managed fields (notes, source, purchaseDate, type, plantingMonths,
 *      useFirst, customExpirationDate, id, user_id, createdAt, updatedAt) are NOT
 *      touched by re-transcription — callers must preserve them explicitly.
 *   3. Data from one image does not leak into an independent call for a different image
 *      (no cross-packet contamination).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  extractWithAI,
  normalizeAIData,
  AIExtractedData,
} from "./packetReaderAI";
import { Seed } from "@/types/seed";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal OpenAI-style JSON response wrapping the given payload. */
function makeOpenAIResponse(payload: Record<string, unknown>): Response {
  const body = JSON.stringify({
    choices: [
      {
        message: {
          content: JSON.stringify(payload),
        },
      },
    ],
  });
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Apply AI-extracted data onto an existing seed record.
 * This mirrors what the UI does: overlay AI fields while keeping all
 * user-managed fields (those not returned by the AI) intact.
 */
function applyTranscriptionToSeed(
  existingSeed: Seed,
  extracted: AIExtractedData,
): Seed {
  return {
    ...existingSeed,
    // AI-supplied overrides (undefined means "not found on packet" → keep existing)
    name: extracted.name ?? existingSeed.name,
    variety: extracted.variety ?? existingSeed.variety,
    brand: extracted.brand ?? existingSeed.brand,
    year: extracted.year ?? existingSeed.year,
    quantity: extracted.quantity ?? existingSeed.quantity,
    daysToGermination:
      extracted.daysToGermination ?? existingSeed.daysToGermination,
    daysToMaturity: extracted.daysToMaturity ?? existingSeed.daysToMaturity,
    plantingDepth: extracted.plantingDepth ?? existingSeed.plantingDepth,
    spacing: extracted.spacing ?? existingSeed.spacing,
    // updatedAt is refreshed on save — simulate that here
    updatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const TOMATO_AI_RESPONSE = {
  name: "Tomato",
  variety: "Black Krim",
  latinName: "Lycopersicon esculentum",
  brand: "Baker Creek",
  year: 2023,
  quantity: "30 seeds",
  daysToGermination: "7-14 days",
  daysToMaturity: "80 days",
  plantingDepth: "1/4 inch",
  spacing: "24-36 inches",
  sunRequirement: "Full sun",
  description: "Rich, dark fruits with complex flavor.",
  plantingInstructions: "Start indoors 6-8 weeks before last frost.",
  fieldSources: { name: "front", variety: "front", brand: "front" },
  rawKeyValuePairs: [{ key: "Lot", value: "T23A", source: "back" }],
};

const BASIL_AI_RESPONSE = {
  name: "Basil",
  variety: "Genovese",
  latinName: "Ocimum basilicum",
  brand: "Burpee",
  year: 2024,
  quantity: "250 seeds",
  daysToGermination: "5-10 days",
  daysToMaturity: "60-90 days",
  plantingDepth: "1/4 inch",
  spacing: "6-12 inches",
  sunRequirement: "Full sun",
  description: "Classic Italian basil, perfect for pesto.",
  plantingInstructions: "Sow after last frost in warm soil.",
  fieldSources: { name: "front", variety: "front", brand: "front" },
  rawKeyValuePairs: [{ key: "Lot", value: "B24B", source: "back" }],
};

/** A saved tomato seed with user-managed fields already filled in. */
const EXISTING_TOMATO_SEED: Seed = {
  id: "seed-001",
  user_id: "user-abc",
  name: "Tomato",
  variety: "Black Krim",
  type: "vegetable",
  brand: "Baker Creek",
  source: "Local nursery",
  year: 2023,
  purchaseDate: "2023-03-15",
  quantity: "30 seeds",
  daysToGermination: "7-14 days",
  daysToMaturity: "80 days",
  plantingDepth: "1/4 inch",
  spacing: "24-36 inches",
  sunRequirement: "full-sun",
  plantingMonths: [3, 4, 5],
  notes: "Great on homemade pizza. Save seeds from best fruits.",
  useFirst: true,
  customExpirationDate: "2025-12-31",
  createdAt: "2023-03-15T10:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("re-transcription: re-running AI on existing seed packet images", () => {
  const FAKE_API_KEY = "sk-test-fake-key";

  // Use a minimal 1×1 PNG encoded as a data URL so imageToBase64 doesn't fetch.
  const FAKE_IMAGE_DATA_URL =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // 1. Re-run works
  // -------------------------------------------------------------------------

  describe("re-run capability", () => {
    it("returns a valid AIExtractedData result on first transcription call", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        makeOpenAIResponse(TOMATO_AI_RESPONSE),
      );

      const result = await extractWithAI(
        FAKE_IMAGE_DATA_URL,
        undefined,
        FAKE_API_KEY,
      );

      expect(result.name).toBe("Tomato");
      expect(result.variety).toBe("Black Krim");
      expect(result.confidence).toBe(0.9);
    });

    it("can be called a second time on the same image and returns fresh data", async () => {
      // First call
      vi.mocked(fetch).mockResolvedValueOnce(
        makeOpenAIResponse(TOMATO_AI_RESPONSE),
      );
      const first = await extractWithAI(
        FAKE_IMAGE_DATA_URL,
        undefined,
        FAKE_API_KEY,
      );

      // Second call — simulate the AI returning slightly updated text (e.g. year
      // corrected from 2023 to 2024) to prove we're using the new response.
      const updatedTomatoResponse = { ...TOMATO_AI_RESPONSE, year: 2024 };
      vi.mocked(fetch).mockResolvedValueOnce(
        makeOpenAIResponse(updatedTomatoResponse),
      );
      const second = await extractWithAI(
        FAKE_IMAGE_DATA_URL,
        undefined,
        FAKE_API_KEY,
      );

      expect(first.year).toBe(2023);
      expect(second.year).toBe(2024); // fresh response reflected
      expect(second.name).toBe("Tomato"); // stable fields still present
    });

    it("calls the OpenAI API exactly once per extractWithAI invocation", async () => {
      // Each call must get a fresh Response — a body can only be read once.
      vi.mocked(fetch).mockImplementation(() =>
        Promise.resolve(makeOpenAIResponse(TOMATO_AI_RESPONSE)),
      );

      await extractWithAI(FAKE_IMAGE_DATA_URL, undefined, FAKE_API_KEY);
      await extractWithAI(FAKE_IMAGE_DATA_URL, undefined, FAKE_API_KEY);

      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
    });

    it("each re-run call is independent — no shared mutable state between calls", async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce(makeOpenAIResponse(TOMATO_AI_RESPONSE))
        .mockResolvedValueOnce(
          makeOpenAIResponse({ ...TOMATO_AI_RESPONSE, notes: undefined }),
        );

      const r1 = await extractWithAI(
        FAKE_IMAGE_DATA_URL,
        undefined,
        FAKE_API_KEY,
      );
      const r2 = await extractWithAI(
        FAKE_IMAGE_DATA_URL,
        undefined,
        FAKE_API_KEY,
      );

      // Mutating r1 must not affect r2
      (r1 as any).name = "MUTATED";
      expect(r2.name).toBe("Tomato");
    });
  });

  // -------------------------------------------------------------------------
  // 2. Previous (user-managed) data remains intact
  // -------------------------------------------------------------------------

  describe("user-managed fields survive re-transcription", () => {
    it("preserves id, user_id, createdAt after applying new AI data", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        makeOpenAIResponse(TOMATO_AI_RESPONSE),
      );
      const extracted = await extractWithAI(
        FAKE_IMAGE_DATA_URL,
        undefined,
        FAKE_API_KEY,
      );
      const updated = applyTranscriptionToSeed(EXISTING_TOMATO_SEED, extracted);

      expect(updated.id).toBe(EXISTING_TOMATO_SEED.id);
      expect(updated.user_id).toBe(EXISTING_TOMATO_SEED.user_id);
      expect(updated.createdAt).toBe(EXISTING_TOMATO_SEED.createdAt);
    });

    it("preserves type (never returned by AI)", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        makeOpenAIResponse(TOMATO_AI_RESPONSE),
      );
      const extracted = await extractWithAI(
        FAKE_IMAGE_DATA_URL,
        undefined,
        FAKE_API_KEY,
      );
      const updated = applyTranscriptionToSeed(EXISTING_TOMATO_SEED, extracted);

      expect(updated.type).toBe("vegetable");
    });

    it("preserves user-written notes", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        makeOpenAIResponse(TOMATO_AI_RESPONSE),
      );
      const extracted = await extractWithAI(
        FAKE_IMAGE_DATA_URL,
        undefined,
        FAKE_API_KEY,
      );
      const updated = applyTranscriptionToSeed(EXISTING_TOMATO_SEED, extracted);

      expect(updated.notes).toBe(EXISTING_TOMATO_SEED.notes);
    });

    it("preserves source (retailer), purchaseDate, and plantingMonths", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        makeOpenAIResponse(TOMATO_AI_RESPONSE),
      );
      const extracted = await extractWithAI(
        FAKE_IMAGE_DATA_URL,
        undefined,
        FAKE_API_KEY,
      );
      const updated = applyTranscriptionToSeed(EXISTING_TOMATO_SEED, extracted);

      expect(updated.source).toBe("Local nursery");
      expect(updated.purchaseDate).toBe("2023-03-15");
      expect(updated.plantingMonths).toEqual([3, 4, 5]);
    });

    it("preserves useFirst flag and customExpirationDate", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        makeOpenAIResponse(TOMATO_AI_RESPONSE),
      );
      const extracted = await extractWithAI(
        FAKE_IMAGE_DATA_URL,
        undefined,
        FAKE_API_KEY,
      );
      const updated = applyTranscriptionToSeed(EXISTING_TOMATO_SEED, extracted);

      expect(updated.useFirst).toBe(true);
      expect(updated.customExpirationDate).toBe("2025-12-31");
    });

    it("re-transcription on an image with null fields does not erase existing packet data", async () => {
      // Simulate a degraded AI response — most fields came back null
      const sparseResponse = {
        name: "Tomato",
        variety: null,
        brand: null,
        year: null,
        daysToGermination: null,
        daysToMaturity: null,
        rawKeyValuePairs: [],
      };

      vi.mocked(fetch).mockResolvedValueOnce(
        makeOpenAIResponse(sparseResponse),
      );
      const extracted = await extractWithAI(
        FAKE_IMAGE_DATA_URL,
        undefined,
        FAKE_API_KEY,
      );
      const updated = applyTranscriptionToSeed(EXISTING_TOMATO_SEED, extracted);

      // Sparse AI result must not wipe out previously saved values
      expect(updated.variety).toBe("Black Krim");
      expect(updated.brand).toBe("Baker Creek");
      expect(updated.year).toBe(2023);
      expect(updated.daysToGermination).toBe("7-14 days");
      expect(updated.daysToMaturity).toBe("80 days");
    });
  });

  // -------------------------------------------------------------------------
  // 3. Data from one image does not drift into another image's response
  // -------------------------------------------------------------------------

  describe("cross-image isolation — no data drift between packets", () => {
    it("tomato and basil extractions return their own distinct data", async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce(makeOpenAIResponse(TOMATO_AI_RESPONSE))
        .mockResolvedValueOnce(makeOpenAIResponse(BASIL_AI_RESPONSE));

      const tomatoResult = await extractWithAI(
        FAKE_IMAGE_DATA_URL,
        undefined,
        FAKE_API_KEY,
      );
      const basilResult = await extractWithAI(
        FAKE_IMAGE_DATA_URL,
        undefined,
        FAKE_API_KEY,
      );

      // Core identity fields must not cross-contaminate
      expect(tomatoResult.name).toBe("Tomato");
      expect(tomatoResult.variety).toBe("Black Krim");
      expect(tomatoResult.brand).toBe("Baker Creek");
      expect(tomatoResult.latinName).toBe("Lycopersicon esculentum");

      expect(basilResult.name).toBe("Basil");
      expect(basilResult.variety).toBe("Genovese");
      expect(basilResult.brand).toBe("Burpee");
      expect(basilResult.latinName).toBe("Ocimum basilicum");
    });

    it("rawKeyValuePairs from tomato packet do not appear in basil result", async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce(makeOpenAIResponse(TOMATO_AI_RESPONSE))
        .mockResolvedValueOnce(makeOpenAIResponse(BASIL_AI_RESPONSE));

      const tomatoResult = await extractWithAI(
        FAKE_IMAGE_DATA_URL,
        undefined,
        FAKE_API_KEY,
      );
      const basilResult = await extractWithAI(
        FAKE_IMAGE_DATA_URL,
        undefined,
        FAKE_API_KEY,
      );

      const tomatoLotKeys =
        tomatoResult.rawKeyValuePairs?.map((p) => p.value) ?? [];
      const basilPairValues =
        basilResult.rawKeyValuePairs?.map((p) => p.value) ?? [];

      // Tomato lot number "T23A" must not appear in the basil result
      expect(basilPairValues).not.toContain("T23A");
      // Basil lot "B24B" must not appear in the tomato result
      expect(tomatoLotKeys).not.toContain("B24B");
    });

    it("fieldSources from one image do not appear in the other", async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce(makeOpenAIResponse(TOMATO_AI_RESPONSE))
        .mockResolvedValueOnce(makeOpenAIResponse(BASIL_AI_RESPONSE));

      const tomatoResult = await extractWithAI(
        FAKE_IMAGE_DATA_URL,
        undefined,
        FAKE_API_KEY,
      );
      const basilResult = await extractWithAI(
        FAKE_IMAGE_DATA_URL,
        undefined,
        FAKE_API_KEY,
      );

      // fieldSources objects should be independent (not the same reference)
      expect(tomatoResult.fieldSources).not.toBe(basilResult.fieldSources);
    });

    it("re-running transcription on the same image twice gives identical results", async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce(makeOpenAIResponse(TOMATO_AI_RESPONSE))
        .mockResolvedValueOnce(makeOpenAIResponse(TOMATO_AI_RESPONSE));

      const first = await extractWithAI(
        FAKE_IMAGE_DATA_URL,
        undefined,
        FAKE_API_KEY,
      );
      const second = await extractWithAI(
        FAKE_IMAGE_DATA_URL,
        undefined,
        FAKE_API_KEY,
      );

      expect(first.name).toBe(second.name);
      expect(first.variety).toBe(second.variety);
      expect(first.brand).toBe(second.brand);
      expect(first.year).toBe(second.year);
      expect(first.daysToGermination).toBe(second.daysToGermination);
      expect(first.daysToMaturity).toBe(second.daysToMaturity);
    });

    it("sequential extractions for different seeds keep their results separate", async () => {
      const seeds = [TOMATO_AI_RESPONSE, BASIL_AI_RESPONSE];
      vi.mocked(fetch)
        .mockResolvedValueOnce(makeOpenAIResponse(seeds[0]))
        .mockResolvedValueOnce(makeOpenAIResponse(seeds[1]));

      const results = await Promise.all([
        extractWithAI(FAKE_IMAGE_DATA_URL, undefined, FAKE_API_KEY),
        extractWithAI(FAKE_IMAGE_DATA_URL, undefined, FAKE_API_KEY),
      ]);

      expect(results[0].name).toBe("Tomato");
      expect(results[1].name).toBe("Basil");
      // Descriptions must also not cross-contaminate
      expect(results[0].description).not.toBe(results[1].description);
      expect(results[0].plantingInstructions).not.toBe(
        results[1].plantingInstructions,
      );
    });

    it("normalizeAIData called on tomato payload returns no basil data", () => {
      const tomato = normalizeAIData(
        TOMATO_AI_RESPONSE as Record<string, unknown>,
      );
      const basil = normalizeAIData(
        BASIL_AI_RESPONSE as Record<string, unknown>,
      );

      expect(tomato.name).toBe("Tomato");
      expect(tomato.brand).not.toBe(basil.brand);
      expect(tomato.latinName).not.toBe(basil.latinName);
      expect(tomato.description).not.toBe(basil.description);
    });
  });
});
