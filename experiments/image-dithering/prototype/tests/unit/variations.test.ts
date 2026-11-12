import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../../src/engine/pipeline";
import { variations } from "../../src/lib/variations";

const base = { ...DEFAULT_SETTINGS, gamma: 1.2, contrast: 10 };
const byName = (round: number, s = base) => Object.fromEntries(variations(s, round).map((v) => [v.name, v.settings]));

describe("fine-tune variations", () => {
  it("offers exactly Lighter, Darker, More contrast, Softer", () => {
    expect(variations(base, 1).map((v) => v.name)).toEqual(["Lighter", "Darker", "More contrast", "Softer"]);
  });

  it("round 1 moves gamma ×1.25 / ÷1.25 and contrast ±25", () => {
    const v = byName(1);
    expect(v.Lighter.gamma).toBeCloseTo(1.5, 5);
    expect(v.Darker.gamma).toBeCloseTo(0.96, 5);
    expect(v["More contrast"].contrast).toBe(35);
    expect(v.Softer.contrast).toBe(-15);
  });

  it("each round halves the step, so picks converge", () => {
    const v = byName(2);
    expect(v.Lighter.gamma).toBeCloseTo(1.2 * 1.125, 5);
    expect(v["More contrast"].contrast).toBeCloseTo(22.5, 5);
  });

  it("changes only the tone it names", () => {
    const v = byName(1);
    expect(v.Lighter.contrast).toBe(base.contrast);
    expect(v["More contrast"].gamma).toBe(base.gamma);
    expect(v.Lighter.algorithm).toBe(base.algorithm);
    expect(v.Lighter.mode).toBe(base.mode);
  });

  it("stays inside the control ranges", () => {
    const edge = { ...DEFAULT_SETTINGS, gamma: 2.9, contrast: 95 };
    const v = byName(1, edge);
    expect(v.Lighter.gamma).toBeLessThanOrEqual(3);
    expect(v["More contrast"].contrast).toBeLessThanOrEqual(100);
    const low = byName(1, { ...DEFAULT_SETTINGS, gamma: 0.22, contrast: -95 });
    expect(low.Darker.gamma).toBeGreaterThanOrEqual(0.2);
    expect(low.Softer.contrast).toBeGreaterThanOrEqual(-100);
  });
});
