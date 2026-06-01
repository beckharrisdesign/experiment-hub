import { describe, expect, it } from "vitest";
import {
  buildPhotoCollection,
  convertDbSeedToSeed,
  convertSeedToDbSeed,
} from "./seedConverters";
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

  it("insert supplies empty JSON arrays for required JSONB columns when omitted", () => {
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

    expect(dbSeed.custom_fields).toEqual([]);
    expect(dbSeed.instruction_annotations).toEqual([]);
    expect(dbSeed.raw_packet_text).toEqual([]);
    expect(dbSeed.hidden_fields).toEqual([]);
  });

  it("round-trips hidden_fields and my_notes", () => {
    const s: Seed = {
      ...SEED,
      hiddenFields: ["spacing", "brand"],
      myNotes: "Try again next season in zone 7.",
    };
    const db = convertSeedToDbSeed(s, { mode: "insert" });
    expect(db.hidden_fields).toEqual(["spacing", "brand"]);
    expect(db.my_notes).toBe("Try again next season in zone 7.");
    const back = convertDbSeedToSeed(db);
    expect(back.hiddenFields).toEqual(["spacing", "brand"]);
    expect(back.myNotes).toBe("Try again next season in zone 7.");
  });

  it("update never sets year to NaN", () => {
    const dbUpdate = convertSeedToDbSeed(
      { year: undefined },
      { mode: "update" },
    );
    expect(dbUpdate.year).toBeUndefined();
  });

  it("maps a photos collection to the photos column on insert", () => {
    const db = convertSeedToDbSeed(
      {
        ...SEED,
        photos: [
          { id: "p1", path: "user/seed/p1.jpg", order: 0, label: "front" },
        ],
      },
      { mode: "insert" },
    );
    expect(db.photos).toEqual([
      { id: "p1", path: "user/seed/p1.jpg", order: 0, label: "front" },
    ]);
  });

  it("stores SQL null for an empty photos collection", () => {
    const db = convertSeedToDbSeed({ photos: [] }, { mode: "update" });
    expect(db.photos).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Photo collection shim (lazy read-time migration)
// ---------------------------------------------------------------------------

describe("buildPhotoCollection", () => {
  it("synthesizes an ordered collection from legacy front/back", () => {
    const photos = buildPhotoCollection({
      photo_front: "data:image/png;base64,FRONT",
      photo_back: "data:image/png;base64,BACK",
    });
    expect(photos).toEqual([
      { id: "legacy-front", path: "data:image/png;base64,FRONT", order: 0, label: "front" },
      { id: "legacy-back", path: "data:image/png;base64,BACK", order: 1, label: "back" },
    ]);
  });

  it("synthesizes a single-photo collection from a legacy front only", () => {
    const photos = buildPhotoCollection({
      photo_front: "https://cdn.example/front.jpg",
    });
    expect(photos).toEqual([
      { id: "legacy-front", path: "https://cdn.example/front.jpg", order: 0, label: "front" },
    ]);
  });

  it("passes through an existing photos column, sorted by order", () => {
    const photos = buildPhotoCollection({
      photos: JSON.stringify([
        { id: "b", path: "https://cdn.example/2.jpg", order: 1 },
        { id: "a", path: "https://cdn.example/1.jpg", order: 0 },
      ]),
      // Legacy columns are ignored once the photos column is present.
      photo_front: "data:image/png;base64,IGNORED",
    });
    expect(photos).toEqual([
      { id: "a", path: "https://cdn.example/1.jpg", order: 0, label: undefined },
      { id: "b", path: "https://cdn.example/2.jpg", order: 1, label: undefined },
    ]);
  });

  it("returns undefined when there are no photos at all", () => {
    expect(buildPhotoCollection({})).toBeUndefined();
  });

  it("convertDbSeedToSeed populates seed.photos via the shim", () => {
    const seed = convertDbSeedToSeed({
      id: "s",
      name: "Tomato",
      variety: "Black Krim",
      type: "vegetable",
      photo_front: "data:image/png;base64,FRONT",
      created_at: "2026-05-11T00:00:00Z",
      updated_at: "2026-05-11T00:00:00Z",
    });
    expect(seed.photos).toEqual([
      { id: "legacy-front", path: "data:image/png;base64,FRONT", order: 0, label: "front" },
    ]);
  });
});
