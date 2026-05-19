import { describe, expect, it, vi } from "vitest";
import { parseSeedYearFromInput } from "./seedFormYear";

vi.setConfig({ testTimeout: 10_000 });

describe("parseSeedYearFromInput", () => {
  it("returns undefined for empty or non-numeric input", () => {
    expect(parseSeedYearFromInput("")).toBeUndefined();
    expect(parseSeedYearFromInput("   ")).toBeUndefined();
    expect(parseSeedYearFromInput("abc")).toBeUndefined();
  });

  it("returns integer for valid year strings", () => {
    expect(parseSeedYearFromInput("2024")).toBe(2024);
    expect(parseSeedYearFromInput("  2020  ")).toBe(2020);
  });

  it("never returns NaN", () => {
    expect(parseSeedYearFromInput("x")).toBeUndefined();
    expect(parseSeedYearFromInput("12.5")).toBe(12); // parseInt stops at decimal — acceptable for year field
  });
});
