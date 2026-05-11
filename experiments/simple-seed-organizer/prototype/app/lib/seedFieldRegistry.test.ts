import { describe, expect, it } from "vitest";
import {
  CANONICAL_SEED_FIELDS,
  getActiveSeedFields,
  getEditableSeedFields,
  getRetiredFieldsWithValues,
  getSearchableSeedFields,
  validateSeedFieldValue,
} from "./seedFieldRegistry";
import { Seed } from "@/types/seed";

// ---------------------------------------------------------------------------
// Field metadata
// ---------------------------------------------------------------------------

describe("seed field registry", () => {
  it("defines required metadata for every canonical field", () => {
    expect(CANONICAL_SEED_FIELDS.length).toBeGreaterThan(0);

    for (const field of CANONICAL_SEED_FIELDS) {
      expect(field.key).toMatch(/^[a-z][A-Za-z0-9]*$/);
      expect(field.label.length).toBeGreaterThan(0);
      expect(field.valueType).toBeTruthy();
      expect(field.inputControl).toBeTruthy();
      expect(field.group).toBeTruthy();
      expect(field.sourceCategory).toBeTruthy();
      expect(field.status).toMatch(/active|hidden|retired/);
      expect(Number.isInteger(field.displayOrder)).toBe(true);
    }
  });

  it("marks current seed fields with source categories", () => {
    expect(
      CANONICAL_SEED_FIELDS.find((field) => field.key === "name")
        ?.sourceCategory,
    ).toBe("packet_fact");
    expect(
      CANONICAL_SEED_FIELDS.find((field) => field.key === "spacing")
        ?.sourceCategory,
    ).toBe("packet_fact");
    expect(
      CANONICAL_SEED_FIELDS.find((field) => field.key === "notes")
        ?.sourceCategory,
    ).toBe("user_note");
    expect(
      CANONICAL_SEED_FIELDS.find((field) => field.key === "useFirst")
        ?.sourceCategory,
    ).toBe("system");
  });

  it("returns active, editable, and searchable field subsets", () => {
    const activeKeys = getActiveSeedFields().map((field) => field.key);
    const editableKeys = getEditableSeedFields().map((field) => field.key);
    const searchableKeys = getSearchableSeedFields().map((field) => field.key);

    expect(activeKeys).toContain("name");
    expect(editableKeys).toContain("notes");
    expect(editableKeys).not.toContain("createdAt");
    expect(searchableKeys).toEqual(
      expect.arrayContaining(["name", "variety", "brand", "notes"]),
    );
  });

  it("shows retired fields only when a seed still has a value", () => {
    const seed = {
      id: "seed-1",
      name: "Tomato",
      variety: "Black Krim",
      type: "vegetable",
      legacyCatalogCode: "BK-2024",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    } as Seed;

    expect(getRetiredFieldsWithValues(seed).map((field) => field.key)).toContain(
      "legacyCatalogCode",
    );
  });

  it("validates values by field type", () => {
    expect(validateSeedFieldValue("year", "2026").valid).toBe(true);
    expect(validateSeedFieldValue("year", "twenty").valid).toBe(false);
    expect(validateSeedFieldValue("purchaseDate", "2026-05-11").valid).toBe(
      true,
    );
    expect(validateSeedFieldValue("purchaseDate", "05/11/2026").valid).toBe(
      false,
    );
    expect(validateSeedFieldValue("plantingMonths", [3, 4, 5]).valid).toBe(
      true,
    );
    expect(validateSeedFieldValue("plantingMonths", [0, 13]).valid).toBe(false);
  });
});
