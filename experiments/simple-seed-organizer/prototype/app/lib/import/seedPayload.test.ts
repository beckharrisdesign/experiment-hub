import { describe, expect, it } from "vitest";
import {
  buildSeedPayloadFromExtracted,
  mergePacketFactsIntoSeed,
} from "./seedPayload";
import { AIExtractedData } from "@/lib/packetReaderAI";
import { Seed } from "@/types/seed";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const EXTRACTED: AIExtractedData = {
  name: "Tomato",
  variety: "Black Krim",
  brand: "Baker Creek",
  year: 2026,
  quantity: "30 seeds",
  daysToGermination: "7-14 days",
  daysToMaturity: "80 days",
  plantingDepth: "1/4 inch",
  spacing: "24 inches",
  sunRequirement: "Full sun",
  description: "Rich dark tomato.",
  plantingInstructions: "Start indoors before last frost.",
  rawKeyValuePairs: [
    { key: "Lot", value: "T26A", source: "back" },
    { key: "Packed for", value: "2026", source: "front" },
  ],
  fieldSources: {
    name: "front",
    variety: "front",
    spacing: "back",
  },
};

const EXISTING_SEED: Seed = {
  id: "seed-1",
  name: "Tomato",
  variety: "Black Krim",
  type: "vegetable",
  spacing: "30 inches",
  notes: "My saved note should survive.",
  instructionAnnotations: [
    {
      fieldKey: "spacing",
      note: "Plant closer together in raised beds.",
    },
  ],
  createdAt: "2026-05-11T00:00:00Z",
  updatedAt: "2026-05-11T00:00:00Z",
};

// ---------------------------------------------------------------------------
// Import payloads
// ---------------------------------------------------------------------------

describe("seed import payloads", () => {
  it("maps extracted packet facts separately from user notes", () => {
    const payload = buildSeedPayloadFromExtracted({
      seedId: "seed-2",
      extracted: EXTRACTED,
      photoFrontPath: "user/seed/front.jpg",
    });

    expect(payload.name).toBe("Tomato");
    expect(payload.spacing).toBe("24 inches");
    expect(payload.description).toBe("Rich dark tomato.");
    expect(payload.plantingInstructions).toBe(
      "Start indoors before last frost.",
    );
    expect(payload.notes).toBeUndefined();
    expect(payload.rawPacketText).toEqual(EXTRACTED.rawKeyValuePairs);
  });

  it("does not overwrite user notes or annotations when merging packet facts", () => {
    const merged = mergePacketFactsIntoSeed(EXISTING_SEED, EXTRACTED, {
      replaceExistingPacketFacts: true,
    });

    expect(merged.spacing).toBe("24 inches");
    expect(merged.notes).toBe("My saved note should survive.");
    expect(merged.instructionAnnotations).toEqual(
      EXISTING_SEED.instructionAnnotations,
    );
  });

  it("requires explicit replacement before changing existing packet facts", () => {
    const merged = mergePacketFactsIntoSeed(EXISTING_SEED, EXTRACTED, {
      replaceExistingPacketFacts: false,
    });

    expect(merged.spacing).toBe("30 inches");
    expect(merged.description).toBe("Rich dark tomato.");
  });
});
