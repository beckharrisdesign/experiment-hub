import { describe, it, expect } from "vitest";
import { convertSvg } from "@/lib/svg-to-stitch/convert";
import type { StitchPlan } from "@/lib/svg-to-stitch/plan";

const OPTS = { targetWidthMm: 50, stitchLengthMm: 2.5 };

function maxStitchSegment(plan: StitchPlan): number {
  let max = 0;
  let prev: { x: number; y: number } | null = null;
  for (const e of plan.entries) {
    if (e.kind === "stitch") {
      if (prev) max = Math.max(max, Math.hypot(e.x - prev.x, e.y - prev.y));
      prev = e;
    } else {
      prev = null;
    }
  }
  return max;
}

// A hairline (0.5 units = 0.25 mm at 50 mm over 100 units) — far below the
// satin gate, so only a tag can make it satin.
const HAIRLINE = (id: string) => `<svg xmlns="http://www.w3.org/2000/svg">
  <line id="${id}" x1="0" y1="50" x2="100" y2="50"
        stroke="#204080" stroke-width="0.5" />
</svg>`;

describe("st- layer-name tags", () => {
  it("st-satin with a width sews a hairline as satin", () => {
    // Figma sanitizes "border st-satin w25" to underscores.
    const { plan } = convertSvg(HAIRLINE("border_st-satin_w25"), OPTS);
    // 2.5 mm traverses = 25 machine units.
    expect(maxStitchSegment(plan)).toBeGreaterThanOrEqual(24);
    expect(plan.stats.satinRuns).toBe(1);
  });

  it("st-satin without a width uses the 2 mm default on hairlines", () => {
    const { plan } = convertSvg(HAIRLINE("border st-satin"), OPTS);
    expect(plan.stats.satinRuns).toBe(1);
    // Top stitches only — the center-run underlay legitimately carries
    // stitch-length (25-unit) segments beneath the zigzag.
    let max = 0;
    let prev: { x: number; y: number } | null = null;
    for (const e of plan.entries) {
      if (e.kind === "stitch" && !e.underlay) {
        if (prev) max = Math.max(max, Math.hypot(e.x - prev.x, e.y - prev.y));
        prev = e;
      } else {
        prev = null;
      }
    }
    expect(max).toBeGreaterThanOrEqual(19);
    expect(max).toBeLessThanOrEqual(23);
  });

  it("st-run pins a satin-range stroke to running stitch", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <line id="vein_st-run" x1="0" y1="50" x2="100" y2="50"
            stroke="#204080" stroke-width="8" />
    </svg>`;
    const { plan } = convertSvg(svg, OPTS);
    expect(plan.stats.satinRuns).toBe(0);
    expect(maxStitchSegment(plan)).toBeLessThanOrEqual(26);
  });

  it("a group tag inherits to every untagged child", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <g id="flowers_st-satin_w20" stroke="#204080" stroke-width="0.5">
        <line x1="0" y1="20" x2="100" y2="20" />
        <line x1="0" y1="80" x2="100" y2="80" />
      </g>
    </svg>`;
    const { plan } = convertSvg(svg, OPTS);
    expect(plan.stats.satinRuns).toBe(2);
  });

  it("a child's own tag overrides the group's", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <g id="flowers_st-satin_w20" stroke="#204080" stroke-width="0.5">
        <line x1="0" y1="20" x2="100" y2="20" />
        <line id="vein_st-run" x1="0" y1="80" x2="100" y2="80" />
      </g>
    </svg>`;
    const { plan } = convertSvg(svg, OPTS);
    expect(plan.stats.satinRuns).toBe(1);
  });

  it("st-skip prunes guides out of the design entirely", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <line x1="0" y1="50" x2="100" y2="50" stroke="#204080" />
      <g id="hoop_guide_st-skip" stroke="#ff0000">
        <circle cx="50" cy="50" r="45" fill="none" />
      </g>
    </svg>`;
    const { plan } = convertSvg(svg, OPTS);
    expect(plan.colors).toEqual(["#204080"]);
  });

  it("st-tatami forces a narrow fill to tatami with its own angle", () => {
    // A 2 mm bar that auto-satin would otherwise claim.
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <rect id="bar_st-tatami_a0_d8" x="48" y="0" width="4" height="100"
            fill="#204080" />
    </svg>`;
    const { plan } = convertSvg(svg, OPTS);
    expect(plan.stats.satinRuns).toBe(0);
    expect(maxStitchSegment(plan)).toBeLessThanOrEqual(26);
  });

  it("st-satin on an unsatinable fill errors loudly with the layer name", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <rect id="big_patch_st-satin" x="0" y="0" width="100" height="60"
            fill="#204080" />
    </svg>`;
    expect(() => convertSvg(svg, OPTS)).toThrow(/big patch st-satin/);
  });

  it("an over-range declared satin width errors loudly", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <line id="fat_st-satin_w150" x1="0" y1="50" x2="100" y2="50"
            stroke="#204080" stroke-width="0.5" />
    </svg>`;
    expect(() => convertSvg(svg, OPTS)).toThrow(/tops out/);
  });

  it("an out-of-range tag density errors loudly", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <line id="dense_st-satin_w20_d1" x1="0" y1="50" x2="100" y2="50"
            stroke="#204080" stroke-width="0.5" />
    </svg>`;
    expect(() => convertSvg(svg, OPTS)).toThrow(/0.2 and 2/);
  });
});
