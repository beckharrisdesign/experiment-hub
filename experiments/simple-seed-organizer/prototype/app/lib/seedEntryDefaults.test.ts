import { describe, it, expect } from "vitest";
import {
  getEntryDefaults,
  applyDefaultIfEmpty,
} from "./seedEntryDefaults";

/**
 * seed-entry-defaults: a new packet pre-fills common fields with editable
 * defaults, and a default must NEVER overwrite a value the user or extraction
 * already supplied. `applyDefaultIfEmpty` is the guard that enforces that.
 */
describe("getEntryDefaults", () => {
  it("suggests the current year (injectable for determinism)", () => {
    const defaults = getEntryDefaults(new Date("2031-04-01T00:00:00Z"));
    expect(defaults.year).toBe("2031");
    expect(defaults.type).toBe("vegetable");
  });
});

describe("applyDefaultIfEmpty", () => {
  it("fills an empty field with the default", () => {
    expect(applyDefaultIfEmpty("", "2026")).toBe("2026");
    expect(applyDefaultIfEmpty(undefined, "2026")).toBe("2026");
    expect(applyDefaultIfEmpty("   ", "2026")).toBe("2026");
  });

  it("never overwrites a value the user or extraction supplied", () => {
    expect(applyDefaultIfEmpty("2023", "2026")).toBe("2023");
    expect(applyDefaultIfEmpty("Heirloom", "vegetable")).toBe("Heirloom");
  });
});
