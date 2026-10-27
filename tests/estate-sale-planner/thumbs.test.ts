import { describe, it, expect } from "vitest";
import { cropRect, thumbSize, THUMB } from "@/lib/estate-sale-planner/thumbs";

// ---------------------------------------------------------------------------
// Crop geometry — the pure half of "what it thinks it found"
// ---------------------------------------------------------------------------

describe("thumbSize", () => {
  // Phone test 2026-10-27: "tall selection boxes don't thumbnail well" — a square crop cut the
  // top and bottom off a tall statue. The thumbnail now keeps the box's own shape.
  it("keeps the crop's shape, longest edge at the thumbnail size", () => {
    expect(thumbSize(300, 900)).toEqual({ w: Math.round(THUMB.size / 3), h: THUMB.size });
    expect(thumbSize(1200, 600)).toEqual({ w: THUMB.size, h: THUMB.size / 2 });
  });

  it("never upscales a small crop", () => {
    expect(thumbSize(120, 90)).toEqual({ w: 120, h: 90 });
  });
});

describe("cropRect", () => {
  it("uses the whole frame when there is no box", () => {
    expect(cropRect(null, 768, 432)).toEqual({ x: 0, y: 0, w: 768, h: 432 });
    expect(cropRect({ x: 0.2, y: 0.2, w: 0, h: 0.3 }, 768, 432).w).toBe(768);
  });

  it("pads the model's box and keeps it centred on the object", () => {
    const r = cropRect({ x: 0.4, y: 0.4, w: 0.2, h: 0.2 }, 1000, 1000);
    // 0.2 padded by 15% each side = 0.26, but the floor is minFraction (0.28)
    expect(r.w).toBe(Math.round(THUMB.minFraction * 1000));
    expect(r.x + r.w / 2).toBeCloseTo(500, -1);
    expect(r.y + r.h / 2).toBeCloseTo(500, -1);
  });

  it("widens a tiny box to the minimum fraction so a thumbnail has context", () => {
    const r = cropRect({ x: 0.5, y: 0.5, w: 0.02, h: 0.02 }, 1000, 500);
    expect(r.w).toBe(280);
    expect(r.h).toBe(140);
  });

  it("clamps a box at the edge inside the frame", () => {
    const r = cropRect({ x: 0.9, y: 0.9, w: 0.3, h: 0.3 }, 1000, 1000);
    expect(r.x + r.w).toBeLessThanOrEqual(1000);
    expect(r.y + r.h).toBeLessThanOrEqual(1000);
    expect(r.x).toBeGreaterThanOrEqual(0);
  });

  it("a full-frame box stays the full frame", () => {
    expect(cropRect({ x: 0, y: 0, w: 1, h: 1 }, 640, 480)).toEqual({ x: 0, y: 0, w: 640, h: 480 });
  });
});
