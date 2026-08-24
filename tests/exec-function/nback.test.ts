import { describe, it, expect } from "vitest";
import {
  BASE_TRIALS_PER_BLOCK,
  DECREASE_THRESHOLDS,
  DEFAULT_DECREASE_THRESHOLD,
  INCREASE_THRESHOLD,
  MIN_N,
  POSITION_COUNT,
  STIMULUS_MS,
  INTERSTIMULUS_MS,
  TRIAL_MS,
  TARGETS_PER_BLOCK,
  accuracyByLevel,
  generateBlock,
  nextN,
  scoreBlock,
  trialsPerBlock,
} from "@/lib/exec-function/nback";

/** Deterministic pseudo-random source, so block generation is reproducible. */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

// ---------------------------------------------------------------------------
// Timing
// ---------------------------------------------------------------------------

describe("stimulus timing", () => {
  it("presents one stimulus every 3 seconds", () => {
    expect(TRIAL_MS).toBe(3000);
    expect(STIMULUS_MS + INTERSTIMULUS_MS).toBe(TRIAL_MS);
  });
});

// ---------------------------------------------------------------------------
// Block generation
// ---------------------------------------------------------------------------

describe("generateBlock", () => {
  it("uses 20 + N trials so the scorable count stays constant", () => {
    for (let n = 1; n <= 5; n += 1) {
      expect(trialsPerBlock(n)).toBe(BASE_TRIALS_PER_BLOCK + n);
      const block = generateBlock(n, seeded(n + 1));
      expect(block.positions).toHaveLength(BASE_TRIALS_PER_BLOCK + n);
      expect(block.positions.length - n).toBe(BASE_TRIALS_PER_BLOCK);
    }
  });

  it("places exactly six targets in every block", () => {
    for (let n = 1; n <= 6; n += 1) {
      for (let seed = 1; seed <= 20; seed += 1) {
        const block = generateBlock(n, seeded(seed * 31 + n));
        expect(block.targets.filter(Boolean)).toHaveLength(TARGETS_PER_BLOCK);
      }
    }
  });

  it("marks a trial as a target exactly when it repeats the position N back", () => {
    // No accidental targets: a non-target must never coincidentally match.
    for (let n = 1; n <= 4; n += 1) {
      for (let seed = 1; seed <= 30; seed += 1) {
        const block = generateBlock(n, seeded(seed * 17 + n));
        for (let i = n; i < block.positions.length; i += 1) {
          const matches = block.positions[i] === block.positions[i - n];
          expect(matches).toBe(block.targets[i]);
        }
      }
    }
  });

  it("never marks the first N trials as targets", () => {
    for (let n = 1; n <= 5; n += 1) {
      const block = generateBlock(n, seeded(n * 7));
      expect(block.targets.slice(0, n).some(Boolean)).toBe(false);
    }
  });

  it("stays inside the eight-position field", () => {
    const block = generateBlock(3, seeded(99));
    for (const position of block.positions) {
      expect(position).toBeGreaterThanOrEqual(0);
      expect(position).toBeLessThan(POSITION_COUNT);
    }
  });

  it("rejects an N below the floor", () => {
    expect(() => generateBlock(0)).toThrow(RangeError);
  });
});

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

describe("scoreBlock", () => {
  it("scores a perfect block as 100%", () => {
    const block = generateBlock(2, seeded(5));
    const result = scoreBlock(block, block.targets);
    expect(result.accuracy).toBe(1);
    expect(result.hits).toBe(TARGETS_PER_BLOCK);
    expect(result.misses).toBe(0);
    expect(result.falseAlarms).toBe(0);
  });

  it("excludes the first N trials from scoring", () => {
    const n = 3;
    const block = generateBlock(n, seeded(11));
    const result = scoreBlock(block, block.targets);
    expect(result.scorableTrials).toBe(BASE_TRIALS_PER_BLOCK);
    expect(result.hits + result.misses + result.falseAlarms + result.correctRejections).toBe(
      BASE_TRIALS_PER_BLOCK,
    );
  });

  it("does not credit a response on an unscored lead-in trial", () => {
    const n = 2;
    const block = generateBlock(n, seeded(13));
    const responded = block.positions.map((_, i) => i < n);
    const result = scoreBlock(block, responded);
    expect(result.hits).toBe(0);
    expect(result.falseAlarms).toBe(0);
  });

  it("counts a missed target and a false alarm separately", () => {
    const block = generateBlock(2, seeded(21));
    const responded = block.positions.map(() => false);
    const result = scoreBlock(block, responded);
    expect(result.misses).toBe(TARGETS_PER_BLOCK);
    expect(result.hits).toBe(0);
    expect(result.correctRejections).toBe(BASE_TRIALS_PER_BLOCK - TARGETS_PER_BLOCK);
    expect(result.falseAlarms).toBe(0);
  });

  it("scores responding to everything as chance-like, not perfect", () => {
    const block = generateBlock(2, seeded(23));
    const result = scoreBlock(block, block.positions.map(() => true));
    expect(result.hits).toBe(TARGETS_PER_BLOCK);
    expect(result.falseAlarms).toBe(BASE_TRIALS_PER_BLOCK - TARGETS_PER_BLOCK);
    expect(result.accuracy).toBeCloseTo(TARGETS_PER_BLOCK / BASE_TRIALS_PER_BLOCK, 10);
  });

  it("treats a short response array as no response", () => {
    const block = generateBlock(2, seeded(29));
    const result = scoreBlock(block, []);
    expect(result.misses).toBe(TARGETS_PER_BLOCK);
  });
});

// ---------------------------------------------------------------------------
// Adaptive rule
// ---------------------------------------------------------------------------

describe("nextN", () => {
  it("raises N at or above 85% accuracy", () => {
    expect(nextN(2, INCREASE_THRESHOLD)).toBe(3);
    expect(nextN(2, 0.95)).toBe(3);
    expect(nextN(2, 1)).toBe(3);
  });

  it("holds N just below the increase threshold", () => {
    expect(nextN(2, 0.84)).toBe(2);
  });

  it("lowers N at or below the decrease threshold", () => {
    expect(nextN(3, DEFAULT_DECREASE_THRESHOLD)).toBe(2);
    expect(nextN(3, 0.4)).toBe(2);
  });

  it("holds N between the two thresholds", () => {
    expect(nextN(3, 0.8, 0.75)).toBe(3);
  });

  it("honours a configurable decrease threshold", () => {
    // 60% accuracy: a drop under the 75% rule, a hold under the 50% rule.
    expect(nextN(3, 0.6, 0.75)).toBe(2);
    expect(nextN(3, 0.6, 0.5)).toBe(3);
  });

  it("offers the full 50-75% range the literature uses", () => {
    expect(DECREASE_THRESHOLDS[0]).toBe(0.5);
    expect(DECREASE_THRESHOLDS[DECREASE_THRESHOLDS.length - 1]).toBe(0.75);
  });

  it("never drops below N = 1", () => {
    expect(nextN(MIN_N, 0)).toBe(MIN_N);
  });
});

// ---------------------------------------------------------------------------
// Per-level accuracy
// ---------------------------------------------------------------------------

describe("accuracyByLevel", () => {
  it("averages the blocks run at each N", () => {
    const blocks = [
      { n: 2, accuracy: 0.9 },
      { n: 2, accuracy: 0.7 },
      { n: 3, accuracy: 0.5 },
    ].map((b) => ({
      ...b,
      hits: 0,
      misses: 0,
      falseAlarms: 0,
      correctRejections: 0,
      scorableTrials: 20,
    }));

    const byLevel = accuracyByLevel(blocks);
    expect(byLevel[2].blocks).toBe(2);
    expect(byLevel[2].meanAccuracy).toBeCloseTo(0.8, 10);
    expect(byLevel[3].blocks).toBe(1);
    expect(byLevel[3].meanAccuracy).toBeCloseTo(0.5, 10);
  });

  it("returns an empty record for a session with no blocks", () => {
    expect(accuracyByLevel([])).toEqual({});
  });
});
