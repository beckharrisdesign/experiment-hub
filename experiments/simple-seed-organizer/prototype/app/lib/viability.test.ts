import { describe, it, expect } from "vitest";
import {
  getSeedAgeYears,
  getViabilityStatus,
  isUseFirst,
  getCropViabilityThreshold,
  USE_FIRST_THRESHOLD_YEARS,
} from "./viability";

describe("USE_FIRST_THRESHOLD_YEARS", () => {
  it("is 3", () => {
    expect(USE_FIRST_THRESHOLD_YEARS).toBe(3);
  });
});

describe("getSeedAgeYears", () => {
  it("returns undefined for undefined year", () => {
    expect(getSeedAgeYears(undefined, 2026)).toBeUndefined();
  });

  it("returns 0 for the current year", () => {
    expect(getSeedAgeYears(2026, 2026)).toBe(0);
  });

  it("returns correct age for past years", () => {
    expect(getSeedAgeYears(2023, 2026)).toBe(3);
    expect(getSeedAgeYears(2020, 2026)).toBe(6);
  });

  it("returns 1 for one year ago", () => {
    expect(getSeedAgeYears(2025, 2026)).toBe(1);
  });
});

describe("getViabilityStatus", () => {
  it('returns "unknown" when year is undefined', () => {
    expect(getViabilityStatus(undefined, 2026)).toBe("unknown");
  });

  it('returns "good" for seeds packed this year', () => {
    expect(getViabilityStatus(2026, 2026)).toBe("good");
  });

  it('returns "good" for 1-year-old seeds', () => {
    expect(getViabilityStatus(2025, 2026)).toBe("good");
  });

  it('returns "watch" for 2-year-old seeds', () => {
    expect(getViabilityStatus(2024, 2026)).toBe("watch");
  });

  it('returns "use-first" at the threshold (3 years)', () => {
    expect(getViabilityStatus(2023, 2026)).toBe("use-first");
  });

  it('returns "use-first" for seeds older than the threshold', () => {
    expect(getViabilityStatus(2019, 2026)).toBe("use-first");
  });
});

describe("isUseFirst", () => {
  it("returns false for undefined year", () => {
    expect(isUseFirst(undefined, 2026)).toBe(false);
  });

  it("returns false for seeds under the threshold", () => {
    expect(isUseFirst(2025, 2026)).toBe(false);
    expect(isUseFirst(2024, 2026)).toBe(false);
  });

  it("returns true at the threshold", () => {
    expect(isUseFirst(2023, 2026)).toBe(true);
  });

  it("returns true for old seeds", () => {
    expect(isUseFirst(2018, 2026)).toBe(true);
  });
});

describe("getCropViabilityThreshold", () => {
  it("returns default threshold for unknown crop", () => {
    expect(getCropViabilityThreshold()).toBe(USE_FIRST_THRESHOLD_YEARS);
    expect(getCropViabilityThreshold("mystery plant")).toBe(
      USE_FIRST_THRESHOLD_YEARS,
    );
  });

  it("returns 2 for short-lived crops", () => {
    expect(getCropViabilityThreshold("Onion")).toBe(2);
    expect(getCropViabilityThreshold("Sweet Corn")).toBe(2);
    expect(getCropViabilityThreshold("Leek")).toBe(2);
  });

  it("returns 4 for long-lived crops", () => {
    expect(getCropViabilityThreshold("Tomato")).toBe(4);
    expect(getCropViabilityThreshold("Cucumber")).toBe(4);
    expect(getCropViabilityThreshold("Spaghetti Squash")).toBe(4);
  });

  it("returns 5 for very long-lived crops", () => {
    expect(getCropViabilityThreshold("Lettuce")).toBe(5);
    expect(getCropViabilityThreshold("Swiss Chard")).toBe(5);
  });
});

describe("getViabilityStatus with cropName", () => {
  it("onion: 1-year-old is watch, 2-year-old is use-first", () => {
    expect(getViabilityStatus(2025, 2026, "Onion")).toBe("watch");
    expect(getViabilityStatus(2024, 2026, "Onion")).toBe("use-first");
  });

  it("tomato: 2-year-old is good, 3-year-old is watch, 4-year-old is use-first", () => {
    expect(getViabilityStatus(2024, 2026, "Tomato")).toBe("good");
    expect(getViabilityStatus(2023, 2026, "Tomato")).toBe("watch");
    expect(getViabilityStatus(2022, 2026, "Tomato")).toBe("use-first");
  });

  it("lettuce: 3-year-old is good, 4-year-old is watch, 5-year-old is use-first", () => {
    expect(getViabilityStatus(2023, 2026, "Lettuce")).toBe("good");
    expect(getViabilityStatus(2022, 2026, "Lettuce")).toBe("watch");
    expect(getViabilityStatus(2021, 2026, "Lettuce")).toBe("use-first");
  });
});
