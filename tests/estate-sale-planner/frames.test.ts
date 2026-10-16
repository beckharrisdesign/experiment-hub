import { describe, it, expect } from "vitest";
import { grayFromRgba, meanAbsDiff, sampleTimes, selectFrames } from "@/lib/estate-sale-planner/frames";
import { FRAME_BUDGET } from "@/lib/estate-sale-planner/config";

function thumb(value: number, jitter = 0): number[] {
  return Array.from({ length: 64 }, (_, i) => Math.max(0, Math.min(255, value + ((i % 2) ? jitter : -jitter))));
}

// ---------------------------------------------------------------------------
// Sampling times
// ---------------------------------------------------------------------------

describe("sampleTimes", () => {
  it("steps through a video on the budget interval, starting at 0", () => {
    const times = sampleTimes(10, 2.5);
    expect(times).toEqual([0, 2.5, 5, 7.5]);
  });

  it("returns a single frame for an unreadable duration", () => {
    expect(sampleTimes(NaN)).toEqual([0]);
    expect(sampleTimes(0)).toEqual([0]);
  });

  it("a ten-minute walkthrough samples 240 candidates before de-duplication", () => {
    expect(sampleTimes(600)).toHaveLength(240);
  });
});

// ---------------------------------------------------------------------------
// De-duplication and budget
// ---------------------------------------------------------------------------

describe("selectFrames", () => {
  it("drops a frame that looks like the last kept one", () => {
    const frames = [
      { id: "a", at: 0, gray: thumb(100) },
      { id: "b", at: 2.5, gray: thumb(100, 3) }, // same view, tiny noise
      { id: "c", at: 5, gray: thumb(200) }, // new room
    ];
    expect(selectFrames(frames).map((f) => f.id)).toEqual(["a", "c"]);
  });

  it("never exceeds the frame budget, and thins evenly rather than truncating", () => {
    // Every frame is a genuinely different view (37 grey levels apart, well over the
    // duplicate threshold), so only the budget can shrink the set.
    const frames = Array.from({ length: 240 }, (_, i) => ({ id: `f${i}`, at: i * 2.5, gray: thumb((i * 37) % 256) }));
    const kept = selectFrames(frames);
    expect(kept).toHaveLength(FRAME_BUDGET.maxFrames);
    expect(kept[0].id).toBe("f0");
    // The last room survives: the final kept frame is from the end of the walk.
    expect(Number(kept[kept.length - 1].id.slice(1))).toBeGreaterThan(220);
  });

  it("keeps everything under budget when every frame is distinct", () => {
    const frames = Array.from({ length: 10 }, (_, i) => ({ id: `f${i}`, at: i, gray: thumb(i * 25) }));
    expect(selectFrames(frames)).toHaveLength(10);
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

describe("meanAbsDiff / grayFromRgba", () => {
  it("is 0 for identical thumbnails and 255 for empty input", () => {
    expect(meanAbsDiff(thumb(50), thumb(50))).toBe(0);
    expect(meanAbsDiff([], [])).toBe(255);
  });

  it("converts RGBA to luma", () => {
    const rgba = new Uint8ClampedArray(64 * 4);
    rgba.fill(255);
    const gray = grayFromRgba(rgba);
    expect(gray).toHaveLength(64);
    expect(gray[0]).toBe(255);
  });
});
