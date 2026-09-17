import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { convertSvg } from "@/lib/svg-to-stitch/convert";

// The sticker sheet and its companions are the manual walkthrough's material.
// Running them here means they cannot rot between walkthroughs: if a promise
// stops holding, this fails before anyone opens the app.

const DIR = "experiments/svg-to-stitch/fixtures";
const OPTS = { targetWidthMm: 63.5, stitchLengthMm: 2.5 };
const read = (p: string) => readFileSync(`${DIR}/${p}`, "utf8");

describe("sticker sheet", () => {
  const { plan, size, dst, exp } = convertSvg(read("sticker-sheet.svg"), OPTS);

  it("takes its size from the document, margin included", () => {
    expect(size.declared).toBe(true);
    expect(size.widthMm).toBeCloseTo(100, 1);
    expect(size.heightMm).toBeCloseTo(140, 1);
    // Artwork is inset 40 units of 400, so the stitching spans about 80% of
    // the sheet rather than being scaled up to fill it.
    expect(plan.stats.widthMm).toBeGreaterThan(78);
    expect(plan.stats.widthMm).toBeLessThan(90);
  });

  it("sews every promised specimen", () => {
    // Six built-in brushes, plus a group tag inherited by one child and
    // overridden by another.
    expect(plan.stats.brushRuns).toBe(8);
    // Declared satin, an untagged narrow stroke, an untagged narrow fill.
    expect(plan.stats.satinRuns).toBe(3);
    expect(plan.colors).toHaveLength(5);
    expect(plan.stats.stitches).toBeGreaterThan(2000);
  });

  it("downloads as both machine formats", () => {
    expect(dst.length).toBeGreaterThan(512);
    expect((dst.length - 512) % 3).toBe(0);
    expect(exp.length).toBeGreaterThan(0);
  });
});

describe("failure fixtures", () => {
  const EXPECTED: Record<string, RegExp> = {
    "01-brush-on-a-fill.svg": /filled shape tagged st-brush/,
    "02-unknown-brush.svg": /isn't in the library/,
    "03-satin-too-wide.svg": /satin tops out/,
    "04-size-on-a-bare-group.svg": /clip/i,
    "05-size-out-of-range.svg": /10 to 400 mm/,
    "06-both-unit-systems.svg": /both a metric and an imperial size/,
    "07-density-out-of-range.svg": /density of 0.1 mm/,
    "09-nested-size.svg": /nesting them is not supported/,
  };

  for (const [file, message] of Object.entries(EXPECTED)) {
    it(`${file} fails loudly`, () => {
      expect(() => convertSvg(read(`errors/${file}`), OPTS)).toThrow(message);
    });
  }

  it("every failure fixture is covered here", () => {
    const onDisk = readdirSync(`${DIR}/errors`).filter((f) =>
      f.endsWith(".svg"),
    );
    const covered = [...Object.keys(EXPECTED), "08-size-in-inches.svg"];
    expect(onDisk.sort()).toEqual(covered.sort());
  });

  it("08-size-in-inches converts and reports inches", () => {
    const { size } = convertSvg(read("errors/08-size-in-inches.svg"), OPTS);
    expect(size.unit).toBe("in");
    expect(size.widthMm).toBeCloseTo(88.9, 1);
  });
});
