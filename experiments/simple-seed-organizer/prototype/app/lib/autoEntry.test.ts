/**
 * Tests for the Auto Entry merge/apply helpers.
 *
 * These tests pin the two bugs that caused data loss and edit-overwriting when
 * the "Auto Entry" button was clicked:
 *
 *   Bug A — stale aiExtractedData: both front and back closures captured
 *   aiExtractedData at click time. If back was clicked while front was still
 *   in-flight, the back closure saw null and lost the front result.
 *
 *   Bug B — stale form fields: applyFormFieldsFromExtracted closed over form
 *   state at click time. If the user typed into a field while the request was
 *   in-flight, the stale empty-string check would overwrite their edit when
 *   the response arrived.
 */

import { describe, it, expect } from "vitest";
import { mergeExtractedData, fieldAfterAutoEntry } from "./autoEntry";
import { AIExtractedData } from "./packetReaderAI";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const FRONT: AIExtractedData = {
  name: "Tomato",
  variety: "Black Krim",
  brand: "Baker Creek",
  year: 2023,
  quantity: "30 seeds",
  description: "Rich, dark fruits.",
  fieldSources: {
    name: "front",
    variety: "front",
    brand: "front",
    year: "front",
    quantity: "front",
    description: "front",
  },
  rawKeyValuePairs: [{ key: "Lot", value: "T23A", source: "front" }],
  confidence: 0.9,
};

const BACK: AIExtractedData = {
  daysToGermination: "7-14 days",
  daysToMaturity: "80 days",
  plantingDepth: "1/4 inch",
  spacing: "24-36 inches",
  sunRequirement: "Full sun",
  plantingInstructions: "Start indoors 6-8 weeks before last frost.",
  fieldSources: {
    daysToGermination: "back",
    daysToMaturity: "back",
    plantingDepth: "back",
    spacing: "back",
    sunRequirement: "back",
    plantingInstructions: "back",
  },
  rawKeyValuePairs: [{ key: "Lot", value: "T23B", source: "back" }],
  confidence: 0.9,
};

// ---------------------------------------------------------------------------
// mergeExtractedData
// ---------------------------------------------------------------------------

describe("mergeExtractedData", () => {
  describe("basic merging", () => {
    it("applies front-side fields when existing is null", () => {
      const result = mergeExtractedData(null, FRONT, "front");
      expect(result.name).toBe("Tomato");
      expect(result.variety).toBe("Black Krim");
      expect(result.brand).toBe("Baker Creek");
      expect(result.year).toBe(2023);
    });

    it("applies back-side fields when existing is null", () => {
      const result = mergeExtractedData(null, BACK, "back");
      expect(result.daysToGermination).toBe("7-14 days");
      expect(result.daysToMaturity).toBe("80 days");
      expect(result.plantingInstructions).toBe(
        "Start indoors 6-8 weeks before last frost.",
      );
    });

    it("merges back into existing front without losing front fields", () => {
      const existing = mergeExtractedData(null, FRONT, "front");
      const result = mergeExtractedData(existing, BACK, "back");

      // Front fields preserved
      expect(result.name).toBe("Tomato");
      expect(result.variety).toBe("Black Krim");
      expect(result.brand).toBe("Baker Creek");
      expect(result.description).toBe("Rich, dark fruits.");

      // Back fields added
      expect(result.daysToGermination).toBe("7-14 days");
      expect(result.daysToMaturity).toBe("80 days");
      expect(result.spacing).toBe("24-36 inches");
    });

    it("merges front into existing back without losing back fields", () => {
      const existing = mergeExtractedData(null, BACK, "back");
      const result = mergeExtractedData(existing, FRONT, "front");

      // Back fields preserved
      expect(result.daysToMaturity).toBe("80 days");
      expect(result.plantingInstructions).toBe(
        "Start indoors 6-8 weeks before last frost.",
      );

      // Front fields added
      expect(result.name).toBe("Tomato");
      expect(result.brand).toBe("Baker Creek");
    });
  });

  describe("Bug A — stale aiExtractedData (concurrent scans)", () => {
    it("composing two independent merges (null→front, null→back) produces complete data", () => {
      // This simulates what SHOULD happen when front and back are clicked
      // simultaneously and each response is applied via functional update
      // (i.e. setAiExtractedData(prev => mergeExtractedData(prev, data, side))).
      // The two merges compose correctly even though both started from null.
      const afterFront = mergeExtractedData(null, FRONT, "front");
      const afterBoth = mergeExtractedData(afterFront, BACK, "back");

      expect(afterBoth.name).toBe("Tomato"); // from front
      expect(afterBoth.daysToMaturity).toBe("80 days"); // from back
    });

    it("back merge starting from null does NOT lose back fields (stale-null scenario)", () => {
      // The old bug: closure captured aiExtractedData=null, so when back
      // response arrived it merged (null, backData) and the result was set,
      // overwriting whatever the front had already written.
      // The functional-update fix means each response is applied on top of
      // whatever state exists AT THAT MOMENT — but we can verify the pure
      // function itself preserves back fields even when existing=null.
      const result = mergeExtractedData(null, BACK, "back");
      expect(result.daysToGermination).toBe("7-14 days");
      expect(result.plantingInstructions).toBe(
        "Start indoors 6-8 weeks before last frost.",
      );
      // Front fields absent (not yet scanned) — not contaminated
      expect(result.name).toBeUndefined();
    });

    it("applying front on top of back result restores front fields", () => {
      // When front response arrives second (after back was already merged),
      // the functional updater runs: mergeExtractedData(backState, frontData, "front")
      const afterBack = mergeExtractedData(null, BACK, "back");
      const afterFrontToo = mergeExtractedData(afterBack, FRONT, "front");

      expect(afterFrontToo.name).toBe("Tomato");
      expect(afterFrontToo.daysToMaturity).toBe("80 days"); // back preserved
    });
  });

  describe("name/variety front-wins rule", () => {
    it("back scan does not overwrite name when front already set it", () => {
      const existing = mergeExtractedData(null, FRONT, "front");

      const backWithName: AIExtractedData = {
        ...BACK,
        name: "TOMATO",
        fieldSources: { ...BACK.fieldSources, name: "back" },
      };
      const result = mergeExtractedData(existing, backWithName, "back");

      expect(result.name).toBe("Tomato"); // front wins
    });

    it("back scan does not overwrite variety when front already set it", () => {
      const existing = mergeExtractedData(null, FRONT, "front");

      const backWithVariety: AIExtractedData = {
        ...BACK,
        variety: "BLACK KRIM",
        fieldSources: { ...BACK.fieldSources, variety: "back" },
      };
      const result = mergeExtractedData(existing, backWithVariety, "back");

      expect(result.variety).toBe("Black Krim"); // front wins
    });

    it("back scan CAN set name when front never set it", () => {
      const backWithName: AIExtractedData = {
        ...BACK,
        name: "Tomato",
        fieldSources: { ...BACK.fieldSources, name: "back" },
      };
      const result = mergeExtractedData(null, backWithName, "back");

      expect(result.name).toBe("Tomato");
    });
  });

  describe("rawKeyValuePairs side isolation", () => {
    it("keeps existing front pairs when merging back", () => {
      const existing = mergeExtractedData(null, FRONT, "front");
      const result = mergeExtractedData(existing, BACK, "back");

      const sources = result.rawKeyValuePairs?.map((p) => p.source);
      expect(sources).toContain("front");
      expect(sources).toContain("back");
    });

    it("replaces old back pairs with new back pairs on re-scan", () => {
      const existing = mergeExtractedData(null, BACK, "back"); // has T23B

      const reScan: AIExtractedData = {
        ...BACK,
        rawKeyValuePairs: [{ key: "Lot", value: "T23C", source: "back" }],
      };
      const result = mergeExtractedData(existing, reScan, "back");

      const values = result.rawKeyValuePairs?.map((p) => p.value);
      expect(values).toContain("T23C");
      expect(values).not.toContain("T23B"); // old back pair replaced
    });

    it("does not include pairs whose source doesn't match the side", () => {
      const mislabeledBack: AIExtractedData = {
        ...BACK,
        rawKeyValuePairs: [
          { key: "Lot", value: "T23B", source: "back" },
          { key: "Stray", value: "oops", source: "front" }, // wrong side label
        ],
      };
      const result = mergeExtractedData(null, mislabeledBack, "back");

      const values = result.rawKeyValuePairs?.map((p) => p.value) ?? [];
      expect(values).toContain("T23B");
      expect(values).not.toContain("oops");
    });
  });

  describe("field attribution guard", () => {
    it("skips a field whose fieldSources entry doesn't match the scan side", () => {
      // If the AI mistakenly tags a back-image field as "front", it should
      // NOT be written when we merge with side="back".
      const mislabeled: AIExtractedData = {
        ...BACK,
        daysToMaturity: "80 days",
        fieldSources: { ...BACK.fieldSources, daysToMaturity: "front" }, // wrong side
      };
      const result = mergeExtractedData(null, mislabeled, "back");

      // daysToMaturity is skipped because fieldSources says "front" but side is "back"
      expect(result.daysToMaturity).toBeUndefined();
    });

    it("applies a field only when fieldSources matches the scan side", () => {
      const correct: AIExtractedData = {
        ...BACK,
        daysToMaturity: "80 days",
        fieldSources: { ...BACK.fieldSources, daysToMaturity: "back" },
      };
      const result = mergeExtractedData(null, correct, "back");
      expect(result.daysToMaturity).toBe("80 days");
    });
  });

  describe("immutability", () => {
    it("does not mutate the existing argument", () => {
      const existing = mergeExtractedData(null, FRONT, "front");
      const snapshot = { ...existing };
      mergeExtractedData(existing, BACK, "back");
      expect(existing.name).toBe(snapshot.name);
      expect(existing.daysToMaturity).toBe(snapshot.daysToMaturity);
    });

    it("does not mutate the incoming argument", () => {
      const incoming = { ...BACK };
      mergeExtractedData(null, incoming, "back");
      expect(incoming.daysToGermination).toBe(BACK.daysToGermination);
    });
  });
});

// ---------------------------------------------------------------------------
// fieldAfterAutoEntry — the functional-update helper (fixes Bug B)
// ---------------------------------------------------------------------------

describe("fieldAfterAutoEntry", () => {
  describe("Bug B — stale form-field closure", () => {
    it("returns the current value when the user has already typed something", () => {
      // Simulates: user typed "Cherry Tomato" AFTER clicking Auto Entry.
      // The functional updater runs with prev="Cherry Tomato" (current state),
      // NOT the stale "" that the closure captured.
      expect(fieldAfterAutoEntry("Cherry Tomato", "Tomato")).toBe(
        "Cherry Tomato",
      );
    });

    it("fills an empty field with the AI value", () => {
      expect(fieldAfterAutoEntry("", "Tomato")).toBe("Tomato");
    });

    it("returns empty string when field is empty and AI has nothing", () => {
      expect(fieldAfterAutoEntry("", undefined)).toBe("");
    });

    it("returns current value even when AI value differs", () => {
      expect(fieldAfterAutoEntry("My custom note", "AI note")).toBe(
        "My custom note",
      );
    });

    it("returns current value when AI value is undefined", () => {
      expect(fieldAfterAutoEntry("existing", undefined)).toBe("existing");
    });
  });

  describe("edge cases", () => {
    it("treats a whitespace-only current value as truthy (user deliberate empty)", () => {
      // A field containing only spaces counts as user-filled
      expect(fieldAfterAutoEntry("   ", "AI value")).toBe("   ");
    });

    it("fills when current is exactly empty string", () => {
      expect(fieldAfterAutoEntry("", "Baker Creek")).toBe("Baker Creek");
    });
  });
});
