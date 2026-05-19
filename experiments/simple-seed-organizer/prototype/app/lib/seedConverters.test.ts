import { describe, expect, it } from "vitest";
import { convertDbSeedToSeed, convertSeedToDbSeed } from "./seedConverters";
import { Seed } from "@/types/seed";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SEED: Seed = {
  id: "seed-1",
  user_id: "user-1",
  name: "Tomato",
  variety: "Black Krim",
  type: "vegetable",
  brand: "Baker Creek",
  source: "Local nursery",
  year: 2026,
  purchaseDate: "2026-05-01",
  quantity: "30 seeds",
  daysToGermination: "7-14 days",
  daysToMaturity: "80 days",
  plantingDepth: "1/4 inch",
  spacing: "24 inches",
  sunRequirement: "full-sun",
  plantingMonths: [3, 4, 5],
  description: "Rich dark tomato.",
  plantingInstructions: "Start indoors before last frost.",
  notes: "Save seed from the earliest fruit.",
  customFields: [
    {
      id: "field-1",
      label: "Storage bin",
      valueType: "short_text",
      value: "Binder A",
      displayOrder: 0,
    },
  ],
  instructionAnnotations: [
    {
      id: "annotation-1",
      fieldKey: "spacing",
      label: "Spacing",
      note: "Plant closer in the raised bed.",
      updatedAt: "2026-05-11T00:00:00Z",
    },
  ],
  rawPacketText: [{ key: "Lot", value: "T26A", source: "back" }],
  useFirst: true,
  customExpirationDate: "2028-12-31",
  createdAt: "2026-05-11T00:00:00Z",
  updatedAt: "2026-05-11T00:00:00Z",
};

// ---------------------------------------------------------------------------
// Conversion
// ---------------------------------------------------------------------------

describe("seed converters", () => {
  it("round-trips canonical fields, custom fields, and annotations", () => {
    const dbSeed = convertSeedToDbSeed(SEED, { mode: "insert" });
    const seed = convertDbSeedToSeed(dbSeed);

    expect(seed.name).toBe(SEED.name);
    expect(seed.plantingMonths).toEqual([3, 4, 5]);
    expect(seed.description).toBe("Rich dark tomato.");
    expect(seed.plantingInstructions).toBe(
      "Start indoors before last frost.",
    );
    expect(seed.notes).toBe("Save seed from the earliest fruit.");
    expect(seed.customFields).toEqual(SEED.customFields);
    expect(seed.instructionAnnotations).toEqual(SEED.instructionAnnotations);
    expect(seed.rawPacketText).toEqual(SEED.rawPacketText);
  });

  it("does not null unchanged fields for partial updates", () => {
    const dbUpdate = convertSeedToDbSeed(
      {
        notes: "Updated user note",
        instructionAnnotations: [
          {
            fieldKey: "plantingDepth",
            note: "Barely cover in trays.",
          },
        ],
      },
      { mode: "update" },
    );

    expect(dbUpdate.notes).toBe("Updated user note");
    expect(dbUpdate.instruction_annotations).toHaveLength(1);
    expect(dbUpdate.name).toBeUndefined();
    expect(dbUpdate.variety).toBeUndefined();
    expect(dbUpdate.spacing).toBeUndefined();
  });

  it("uses empty JSON array for NOT NULL JSONB columns on update (not SQL null)", () => {
    const dbUpdate = convertSeedToDbSeed(
      {
        customFields: [],
        instructionAnnotations: [],
        rawPacketText: [],
      },
      { mode: "update" },
    );

    expect(dbUpdate.custom_fields).toEqual([]);
    expect(dbUpdate.instruction_annotations).toEqual([]);
    expect(dbUpdate.raw_packet_text).toEqual([]);
  });

  it("round-trips a manual-only seed entry without packet extraction data", () => {
    const manualSeed: Seed = {
      id: "seed-manual",
      name: "Beans",
      variety: "Provider",
      type: "vegetable",
      notes: "Direct sow after danger of frost.",
      createdAt: "2026-05-13T00:00:00Z",
      updatedAt: "2026-05-13T00:00:00Z",
    };

    const dbSeed = convertSeedToDbSeed(manualSeed, { mode: "insert" });
    const roundTripped = convertDbSeedToSeed(dbSeed);

    expect(roundTripped.name).toBe("Beans");
    expect(roundTripped.variety).toBe("Provider");
    expect(roundTripped.notes).toBe("Direct sow after danger of frost.");
    expect(roundTripped.rawPacketText).toBeUndefined();
    expect(roundTripped.instructionAnnotations).toBeUndefined();
  });
});
