import { describe, it, expect } from "vitest";
import {
  CORSI_BLOCKS,
  MAX_SPAN,
  START_SPAN,
  TRIALS_PER_SPAN,
  generateSequence,
  expectedResponse,
  isCorrect,
  initialRunState,
  recordTrial,
  scoreRun,
  type CorsiRunState,
} from "@/lib/exec-function/corsi";

/** Drive a whole run from a list of per-trial outcomes, in order. */
function runWith(outcomes: boolean[]): CorsiRunState {
  let state = initialRunState();
  for (const correct of outcomes) {
    if (state.finished) break;
    const sequence = generateSequence(state.span, () => 0.5);
    state = recordTrial(state, { sequence, response: sequence, correct });
  }
  return state;
}

// ---------------------------------------------------------------------------
// Board
// ---------------------------------------------------------------------------

describe("Corsi board", () => {
  it("has nine blocks with stable ids 1-9", () => {
    expect(CORSI_BLOCKS).toHaveLength(9);
    expect(CORSI_BLOCKS.map((b) => b.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("places every block inside the unit square", () => {
    for (const block of CORSI_BLOCKS) {
      expect(block.x).toBeGreaterThan(0);
      expect(block.x).toBeLessThan(1);
      expect(block.y).toBeGreaterThan(0);
      expect(block.y).toBeLessThan(1);
    }
  });

  it("is irregular — no three blocks share a row or column", () => {
    // The standard board's whole point: an even grid would let the sequence be
    // chunked or verbalized as coordinates.
    const xs = CORSI_BLOCKS.map((b) => b.x);
    const ys = CORSI_BLOCKS.map((b) => b.y);
    for (const axis of [xs, ys]) {
      for (const value of axis) {
        const nearlyAligned = axis.filter((v) => Math.abs(v - value) < 0.02);
        expect(nearlyAligned.length).toBeLessThan(3);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Sequences
// ---------------------------------------------------------------------------

describe("generateSequence", () => {
  it("returns the requested number of blocks", () => {
    for (let span = 1; span <= MAX_SPAN; span += 1) {
      expect(generateSequence(span)).toHaveLength(span);
    }
  });

  it("never repeats a block within a sequence", () => {
    for (let i = 0; i < 200; i += 1) {
      const seq = generateSequence(6);
      expect(new Set(seq).size).toBe(seq.length);
    }
  });

  it("only ever uses valid block ids", () => {
    const valid = new Set(CORSI_BLOCKS.map((b) => b.id));
    for (let i = 0; i < 100; i += 1) {
      for (const id of generateSequence(MAX_SPAN)) expect(valid.has(id)).toBe(true);
    }
  });

  it("rejects spans outside the board", () => {
    expect(() => generateSequence(0)).toThrow(RangeError);
    expect(() => generateSequence(MAX_SPAN + 1)).toThrow(RangeError);
  });
});

// ---------------------------------------------------------------------------
// Conditions
// ---------------------------------------------------------------------------

describe("forward and backward conditions", () => {
  it("expects the same order forward and the reverse backward", () => {
    const seq = [3, 7, 1, 9];
    expect(expectedResponse(seq, "forward")).toEqual([3, 7, 1, 9]);
    expect(expectedResponse(seq, "backward")).toEqual([9, 1, 7, 3]);
  });

  it("does not mutate the sequence it was given", () => {
    const seq = [3, 7, 1, 9];
    expectedResponse(seq, "backward");
    expect(seq).toEqual([3, 7, 1, 9]);
  });

  it("scores a reproduction as correct only on an exact order match", () => {
    const seq = [3, 7, 1];
    expect(isCorrect(seq, [3, 7, 1], "forward")).toBe(true);
    expect(isCorrect(seq, [3, 1, 7], "forward")).toBe(false);
    expect(isCorrect(seq, [1, 7, 3], "backward")).toBe(true);
    expect(isCorrect(seq, [3, 7, 1], "backward")).toBe(false);
  });

  it("rejects a reproduction of the wrong length", () => {
    expect(isCorrect([3, 7, 1], [3, 7], "forward")).toBe(false);
    expect(isCorrect([3, 7, 1], [3, 7, 1, 9], "forward")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Adaptive staircase — Kessels et al. (2000)
// ---------------------------------------------------------------------------

describe("staircase", () => {
  it("starts at span 2", () => {
    expect(initialRunState().span).toBe(START_SPAN);
  });

  it("administers both trials at a span even after the first is correct", () => {
    let state = initialRunState();
    const seq = generateSequence(2);
    state = recordTrial(state, { sequence: seq, response: seq, correct: true });
    expect(state.span).toBe(2);
    expect(state.trialIndex).toBe(1);
    expect(state.finished).toBe(false);
  });

  it("advances a span when one of two trials is correct", () => {
    const state = runWith([true, false]);
    expect(state.span).toBe(3);
    expect(state.finished).toBe(false);
  });

  it("advances a span when both trials are correct", () => {
    const state = runWith([true, true]);
    expect(state.span).toBe(3);
  });

  it("terminates when both trials at a span fail", () => {
    const state = runWith([false, false]);
    expect(state.finished).toBe(true);
    expect(state.results).toHaveLength(TRIALS_PER_SPAN);
  });

  it("does not terminate on a single failure", () => {
    const state = runWith([false]);
    expect(state.finished).toBe(false);
  });

  it("terminates after clearing the longest possible span", () => {
    // Correct on everything: span 2..9 inclusive, two trials each.
    const state = runWith(Array(64).fill(true));
    expect(state.finished).toBe(true);
    expect(state.span).toBe(MAX_SPAN);
    expect(state.results).toHaveLength((MAX_SPAN - START_SPAN + 1) * TRIALS_PER_SPAN);
  });

  it("ignores trials recorded after termination", () => {
    let state = runWith([false, false]);
    const before = state.results.length;
    state = recordTrial(state, { sequence: [1, 2], response: [1, 2], correct: true });
    expect(state.results).toHaveLength(before);
  });
});

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

describe("scoreRun", () => {
  it("scores a run that fails immediately as zero", () => {
    expect(scoreRun(runWith([false, false]).results)).toEqual({
      blockSpan: 0,
      correctSequences: 0,
      totalScore: 0,
    });
  });

  it("takes Block Span as the longest span reproduced at least once", () => {
    // span 2: both right -> span 3: first right -> span 4: both wrong.
    const score = scoreRun(runWith([true, true, true, false, false, false]).results);
    expect(score.blockSpan).toBe(3);
  });

  it("computes Total Score as Block Span x correct sequences", () => {
    const score = scoreRun(runWith([true, true, true, false, false, false]).results);
    expect(score.correctSequences).toBe(3);
    expect(score.totalScore).toBe(3 * 3);
  });

  it("separates two runs with the same Block Span but different consistency", () => {
    // This is exactly why Kessels prefers Total Score: both reach span 3.
    const consistent = scoreRun(runWith([true, true, true, true, false, false]).results);
    const patchy = scoreRun(runWith([true, false, true, false, false, false]).results);
    expect(consistent.blockSpan).toBe(patchy.blockSpan);
    expect(consistent.totalScore).toBeGreaterThan(patchy.totalScore);
  });

  it("reaches the maximum score on a perfect run", () => {
    const score = scoreRun(runWith(Array(64).fill(true)).results);
    expect(score.blockSpan).toBe(9);
    expect(score.correctSequences).toBe(16);
    expect(score.totalScore).toBe(144);
  });
});
