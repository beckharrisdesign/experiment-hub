import { describe, it, expect } from "vitest";
import { ribbonSatin } from "@/lib/svg-to-stitch/ribbon";
import { convertSvg } from "@/lib/svg-to-stitch/convert";
import type { Point } from "@/lib/svg-to-stitch/path-data";

const OPTS = { density: 0.4, maxWidth: 10, minMedianWidth: 1 };

function arc(
  cx: number,
  cy: number,
  r: number,
  a0: number,
  a1: number,
  n: number,
): Point[] {
  const out: Point[] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    out.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return out;
}

/** Open curved ribbon: a half-ring band of the given width — the shape a
 * flattened curved stroke exports as (one ring: out one rail, back the
 * other). */
function bandRing(r: number, width: number): Point[] {
  const outer = arc(0, 0, r + width / 2, 0, Math.PI, 96);
  const inner = arc(0, 0, r - width / 2, Math.PI, 0, 96);
  return [...outer, ...inner, outer[0]];
}

function circleRing(r: number, n = 128): Point[] {
  return arc(0, 0, r, 0, 2 * Math.PI, n);
}

function spans(run: Point[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < run.length; i++) {
    out.push(Math.hypot(run[i].x - run[i - 1].x, run[i].y - run[i - 1].y));
  }
  return out;
}

describe("ribbonSatin", () => {
  it("follows an open curved ribbon with full-width traverses", () => {
    const result = ribbonSatin([bandRing(20, 3)], OPTS);
    expect(result).not.toBeNull();
    const run = result!.runs[0];
    // Half-ring spine ≈ π·20 ≈ 63 units at 0.4 pitch → lots of penetrations.
    expect(run.length).toBeGreaterThan(100);
    // Penetrations alternate rails: radii flip between ~21.5 and ~18.5.
    let flips = 0;
    for (let i = 1; i < run.length; i++) {
      const r0 = Math.hypot(run[i - 1].x, run[i - 1].y);
      const r1 = Math.hypot(run[i].x, run[i].y);
      if (r0 > 20 !== r1 > 20) flips++;
    }
    expect(flips / (run.length - 1)).toBeGreaterThan(0.9);
    // Interior traverses cross the full ~3-unit width.
    const inner = spans(run).slice(5, -5);
    const median = [...inner].sort((a, b) => a - b)[
      Math.floor(inner.length / 2)
    ];
    expect(median).toBeGreaterThan(2.7);
    expect(median).toBeLessThan(3.5);
  });

  it("sews a closed ribbon (annulus) all the way around", () => {
    const result = ribbonSatin([circleRing(21.5), circleRing(18.5)], OPTS);
    expect(result).not.toBeNull();
    const run = result!.runs[0];
    // Angular coverage: penetrations span the whole circle.
    const angles = run.map((p) => Math.atan2(p.y, p.x));
    let covered = 0;
    const buckets = new Array(12).fill(false);
    for (const a of angles) {
      buckets[Math.floor(((a + Math.PI) / (2 * Math.PI)) * 12) % 12] = true;
    }
    covered = buckets.filter(Boolean).length;
    expect(covered).toBe(12);
    // Every penetration sits on one of the two rails.
    for (const p of run) {
      const r = Math.hypot(p.x, p.y);
      expect(Math.abs(r - 21.5) < 0.3 || Math.abs(r - 18.5) < 0.3).toBe(true);
    }
  });

  it("stays perpendicular through an S-curve inflection", () => {
    // Two joined half-rings bending opposite ways — the rails swap being
    // outer/inner mid-ribbon, which breaks fractional pairing; the greedy
    // shortest-diagonal pairing must keep traverses at the true 3-unit
    // width all the way through.
    const w = 3;
    const outer = [
      ...arc(0, 0, 10 + w / 2, Math.PI, 2 * Math.PI, 48),
      ...arc(20, 0, 10 - w / 2, Math.PI, 0, 48),
    ];
    const inner = [
      ...arc(20, 0, 10 + w / 2, 0, Math.PI, 48),
      ...arc(0, 0, 10 - w / 2, 2 * Math.PI, Math.PI, 48),
    ];
    const result = ribbonSatin([[...outer, ...inner, outer[0]]], OPTS);
    expect(result).not.toBeNull();
    const inner95 = spans(result!.runs[0])
      .slice(5, -5)
      .sort((a, b) => a - b);
    const median = inner95[Math.floor(inner95.length / 2)];
    const p95 = inner95[Math.floor(inner95.length * 0.95)];
    expect(median).toBeGreaterThan(2.7);
    expect(median).toBeLessThan(3.3);
    expect(p95).toBeLessThan(3.6);
  });

  it("rejects a ribbon wider than the satin maximum", () => {
    expect(ribbonSatin([circleRing(27.5), circleRing(12.5)], OPTS)).toBeNull();
  });

  it("rejects a blob — folding needs a spine, not a disc", () => {
    expect(ribbonSatin([circleRing(3)], OPTS)).toBeNull();
  });

  it("rejects three or more rings", () => {
    expect(
      ribbonSatin([circleRing(21.5), circleRing(18.5), circleRing(10)], OPTS),
    ).toBeNull();
  });
});

describe("convertSvg curved ribbons", () => {
  it("sews a circle border (flattened to an annulus fill) as curved satin", () => {
    // Two subpaths, even-odd: a 100-unit outer circle with a 92-unit hole —
    // exactly what a flattened circle stroke exports as. At 50 mm the band
    // is 2 mm wide; the fixed-axis pass can't hold it, the ribbon pass can.
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <path fill-rule="evenodd" fill="#cc4433"
        d="M 100 50 A 50 50 0 1 0 0 50 A 50 50 0 1 0 100 50 Z
           M 96 50 A 46 46 0 1 1 4 50 A 46 46 0 1 1 96 50 Z" />
    </svg>`;
    const { plan } = convertSvg(svg, {
      targetWidthMm: 50,
      stitchLengthMm: 2.5,
    });
    expect(plan.stats.satinRuns).toBeGreaterThanOrEqual(1);
    // Traverses ≈ 2 mm = 20 machine units — and thousands of them would be
    // absent if the band had (silently) sewn as boundary-only tatami.
    expect(plan.stats.stitches).toBeGreaterThan(500);
  });
});
