/**
 * Digital Corsi Block-Tapping Task — protocol per Kessels et al. (2000),
 * "The Corsi Block-Tapping Task: Standardization and Normative Data",
 * Applied Neuropsychology 7(4), 252-258.
 *
 * Protocol implemented here:
 *   - 9 blocks in a fixed IRREGULAR (non-grid) arrangement.
 *   - Sequences are flashed at ~1 block/second.
 *   - Span starts at 2; two trials are administered at every span length.
 *   - >= 1 of 2 correct at a span -> span + 1. Both wrong -> terminate.
 *   - Block Span   = longest span with at least one correct reproduction.
 *   - Total Score  = Block Span x number of correctly reproduced sequences.
 *
 * Everything in this file is pure. Timing and rendering live in the UI layer;
 * the state machine below is driven one trial at a time so it can be tested
 * without a clock.
 */

// ---------------------------------------------------------------------------
// Board
// ---------------------------------------------------------------------------

export interface CorsiBlock {
  /** Stable 1-9 identifier. Sequences are recorded in terms of these. */
  id: number;
  /** Position in a normalized 0-1 unit square, origin top-left. */
  x: number;
  y: number;
}

/**
 * The nine block positions, normalized to a unit square.
 *
 * The irregular scatter is the protocol-relevant property: an even grid would
 * let a participant chunk the sequence into rows/columns or verbalize it as
 * coordinates, which is exactly the strategy the standard board is shaped to
 * prevent. These coordinates reproduce that irregular arrangement and are held
 * fixed across sessions so scores stay comparable; they are a digitization,
 * not a claim to the physical board's exact millimetre offsets.
 */
export const CORSI_BLOCKS: readonly CorsiBlock[] = [
  { id: 1, x: 0.12, y: 0.19 },
  { id: 2, x: 0.43, y: 0.06 },
  { id: 3, x: 0.76, y: 0.15 },
  { id: 4, x: 0.21, y: 0.46 },
  { id: 5, x: 0.55, y: 0.37 },
  { id: 6, x: 0.87, y: 0.47 },
  { id: 7, x: 0.09, y: 0.79 },
  { id: 8, x: 0.46, y: 0.71 },
  { id: 9, x: 0.73, y: 0.89 },
] as const;

// ---------------------------------------------------------------------------
// Protocol constants
// ---------------------------------------------------------------------------

/** Kessels: administration begins at a sequence length of two. */
export const START_SPAN = 2;
/** Nine blocks, and sequences never repeat a block, so nine is the ceiling. */
export const MAX_SPAN = CORSI_BLOCKS.length;
/** Two trials are administered at every span length. */
export const TRIALS_PER_SPAN = 2;

/** ~1 block/second: 600 ms lit + 400 ms dark = one block per second. */
export const FLASH_ON_MS = 600;
export const FLASH_GAP_MS = 400;
/** Pause between the end of the demonstration and the response window. */
export const PRE_RESPONSE_MS = 500;

export type CorsiCondition = "forward" | "backward";

// ---------------------------------------------------------------------------
// Sequence generation
// ---------------------------------------------------------------------------

/**
 * A sequence of `span` distinct block ids. Distinct rather than sampled with
 * replacement: the standard sequences never tap the same block twice, and with
 * a nine-block board every span up to the ceiling can satisfy that.
 */
export function generateSequence(
  span: number,
  random: () => number = Math.random,
): number[] {
  if (span < 1 || span > MAX_SPAN) {
    throw new RangeError(`span must be between 1 and ${MAX_SPAN}, got ${span}`);
  }

  const pool = CORSI_BLOCKS.map((block) => block.id);
  // Partial Fisher-Yates: shuffle only as far as we need to draw.
  for (let i = 0; i < span; i += 1) {
    const j = i + Math.floor(random() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, span);
}

/** The order the participant must produce, given the condition. */
export function expectedResponse(
  sequence: readonly number[],
  condition: CorsiCondition,
): number[] {
  return condition === "backward" ? [...sequence].reverse() : [...sequence];
}

/** A reproduction is correct only if it matches the expected order exactly. */
export function isCorrect(
  sequence: readonly number[],
  response: readonly number[],
  condition: CorsiCondition,
): boolean {
  const expected = expectedResponse(sequence, condition);
  return (
    response.length === expected.length &&
    expected.every((id, i) => response[i] === id)
  );
}

// ---------------------------------------------------------------------------
// Adaptive staircase
// ---------------------------------------------------------------------------

export interface CorsiTrialResult {
  span: number;
  /** 1 or 2 — which of the two trials at this span this was. */
  trialInSpan: number;
  sequence: number[];
  response: number[];
  correct: boolean;
}

export interface CorsiRunState {
  span: number;
  /** 0-based index of the trial about to be run at the current span. */
  trialIndex: number;
  results: CorsiTrialResult[];
  finished: boolean;
}

export function initialRunState(): CorsiRunState {
  return { span: START_SPAN, trialIndex: 0, results: [], finished: false };
}

/**
 * Record a completed trial and move the staircase.
 *
 * Both trials at a span are always administered, even when the first is
 * correct. Stopping early would inflate Block Span relative to the norms and
 * would make Total Score depend on when the participant happened to succeed —
 * the count of correct reproductions is only comparable if the number of
 * opportunities is fixed.
 */
export function recordTrial(
  state: CorsiRunState,
  trial: { sequence: number[]; response: number[]; correct: boolean },
): CorsiRunState {
  if (state.finished) return state;

  const results = [
    ...state.results,
    {
      span: state.span,
      trialInSpan: state.trialIndex + 1,
      sequence: trial.sequence,
      response: trial.response,
      correct: trial.correct,
    },
  ];

  const moreTrialsAtThisSpan = state.trialIndex + 1 < TRIALS_PER_SPAN;
  if (moreTrialsAtThisSpan) {
    return { ...state, trialIndex: state.trialIndex + 1, results };
  }

  const passedSpan = results
    .filter((r) => r.span === state.span)
    .some((r) => r.correct);

  if (!passedSpan) {
    return { ...state, results, finished: true };
  }

  const nextSpan = state.span + 1;
  if (nextSpan > MAX_SPAN) {
    return { ...state, results, finished: true };
  }

  return { span: nextSpan, trialIndex: 0, results, finished: false };
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

export interface CorsiScore {
  /** Longest sequence length reproduced correctly at least once. */
  blockSpan: number;
  /** Count of correctly reproduced sequences across the whole run. */
  correctSequences: number;
  /** Kessels' Total Score: Block Span x correct sequences. */
  totalScore: number;
}

export function scoreRun(results: readonly CorsiTrialResult[]): CorsiScore {
  const correct = results.filter((r) => r.correct);
  const blockSpan = correct.reduce((max, r) => Math.max(max, r.span), 0);
  const correctSequences = correct.length;
  return { blockSpan, correctSequences, totalScore: blockSpan * correctSequences };
}

// ---------------------------------------------------------------------------
// Session record
// ---------------------------------------------------------------------------

export interface CorsiSession extends CorsiScore {
  id: string;
  /** ISO 8601, local wall clock at the moment the session ended. */
  timestamp: string;
  condition: CorsiCondition;
  durationMs: number;
  /**
   * False when the tab was backgrounded mid-run. Browsers throttle timers in
   * hidden tabs, so the sequence was not flashed at ~1 block/second and the
   * score is not comparable to the rest of the log.
   */
  timingReliable: boolean;
  trials: CorsiTrialResult[];
}
