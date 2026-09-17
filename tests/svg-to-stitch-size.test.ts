import { describe, expect, it } from "vitest";
import { convertSvg } from "@/lib/svg-to-stitch/convert";

// Physical size is declared in the design file, not chosen in the tool. The
// tagged element's own box is the design's extent, so margin drawn around the
// artwork survives instead of being scaled away.

const OPTS = { targetWidthMm: 63.5, stitchLengthMm: 2.5 };

/** A 200x200 frame with a motif across the middle 100 units. */
const INSET = (id: string, h = 200) =>
  `<svg xmlns="http://www.w3.org/2000/svg" id="${id}" viewBox="0 0 200 ${h}">
     <path d="M50 ${h / 2} L150 ${h / 2}" stroke="#b6114c" stroke-width="1"/>
   </svg>`;

describe("document-declared size", () => {
  it("margin inside the frame survives", () => {
    const { plan, size } = convertSvg(INSET("patch st-size w635"), OPTS);
    expect(size.declared).toBe(true);
    expect(size.widthMm).toBeCloseTo(63.5, 1);
    // The motif spans half the frame, so it sews about half the declared
    // width — not scaled up to fill it.
    expect(plan.stats.widthMm).toBeGreaterThan(28);
    expect(plan.stats.widthMm).toBeLessThan(36);
  });

  it("the declared size actually scales the plan, not just the readout", () => {
    // Regression: the scale reached the stitch maths but not buildPlan, so a
    // 100 mm design sewed at the 63.5 mm fallback while reporting 100 mm.
    const { plan } = convertSvg(INSET("patch st-size w1000"), OPTS);
    // The motif spans half of a 100 mm frame.
    expect(plan.stats.widthMm).toBeGreaterThan(45);
    expect(plan.stats.widthMm).toBeLessThan(56);
  });

  it("scales a tall design by its larger side", () => {
    // buildPlan fits the larger side, so a declared width must hand it the
    // height when the design is taller than it is wide.
    const { size } = convertSvg(INSET("patch st-size w635", 400), OPTS);
    expect(size.widthMm).toBeCloseTo(63.5, 1);
    expect(size.heightMm).toBeCloseTo(127, 0);
  });

  it("a non-square frame stays non-square", () => {
    const { size } = convertSvg(INSET("patch st-size w635", 120), OPTS);
    expect(size.widthMm).toBeCloseTo(63.5, 1);
    // 200x120 is 5:3, so the height follows the document, not the tool.
    expect(size.heightMm).toBeCloseTo(38.1, 0);
  });

  it("inches and millimetres agree", () => {
    const metric = convertSvg(INSET("patch st-size w889"), OPTS).size;
    const imperial = convertSvg(INSET("patch st-size in350"), OPTS).size;
    expect(imperial.widthMm).toBeCloseTo(metric.widthMm, 1);
    expect(imperial.widthMm).toBeCloseTo(88.9, 1);
  });

  it("the readout speaks the declared system", () => {
    expect(convertSvg(INSET("patch st-size in350"), OPTS).size.unit).toBe("in");
    expect(convertSvg(INSET("patch st-size w889"), OPTS).size.unit).toBe("mm");
    expect(convertSvg(INSET("plain"), OPTS).size.unit).toBe("mm");
  });

  it("honours real physical units on the root", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="88.9mm" height="88.9mm" viewBox="0 0 200 200">
       <path d="M50 100 L150 100" stroke="#b6114c" stroke-width="1"/>
     </svg>`;
    const { size } = convertSvg(svg, OPTS);
    expect(size.declared).toBe(true);
    expect(size.widthMm).toBeCloseTo(88.9, 1);
  });

  it("declaring both systems at once errors loudly", () => {
    expect(() => convertSvg(INSET("patch st-size w635 in350"), OPTS)).toThrow(
      /both a metric and an imperial size/,
    );
  });

  it("a bare group cannot declare a size", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
       <g id="frame st-size w635">
         <path d="M50 100 L150 100" stroke="#b6114c" stroke-width="1"/>
       </g>
     </svg>`;
    expect(() => convertSvg(svg, OPTS)).toThrow(/frame st-size w635/);
    expect(() => convertSvg(svg, OPTS)).toThrow(/clip/i);
  });

  it("reads a clipped group's box", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
       <g id="frame st-size w635" clip-path="url(#c0)">
         <path d="M50 100 L150 100" stroke="#b6114c" stroke-width="1"/>
       </g>
       <defs><clipPath id="c0"><rect width="200" height="200"/></clipPath></defs>
     </svg>`;
    const { size } = convertSvg(svg, OPTS);
    expect(size.declared).toBe(true);
    expect(size.widthMm).toBeCloseTo(63.5, 1);
  });

  it("an impossible size is refused", () => {
    expect(() => convertSvg(INSET("patch st-size w5000"), OPTS)).toThrow(
      /10 to 400 mm/,
    );
  });

  it("bought art still converts at the documented default", () => {
    const { size } = convertSvg(INSET("no tag here"), OPTS);
    expect(size.declared).toBe(false);
    expect(size.widthMm).toBeCloseTo(63.5, 1);
  });
});
