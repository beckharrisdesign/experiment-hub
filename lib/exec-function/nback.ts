/**
 * Adaptive visuospatial N-Back task.
 *
 * Protocol implemented here:
 *   - Stimulus = one of eight peripheral cells of a 3x3 grid (centre unused).
 *   - ~3 s per stimulus (500 ms visible + 2500 ms inter-stimulus interval).
 *   - Single-response target detection: the participant signals "match" when
 *     the current position repeats the one N positions back.
 *   - Blocks of 20 + N trials with a fixed 6 targets, per the standard
 *     adaptive dual n-back block structure (Jaeggi et al., 2008).
 *   - Between blocks: accuracy >= 85% -> N + 1; accuracy <= the decrease
 *     threshold -> N - 1; otherwise hold. The decrease threshold is
 *     configurable across the 50-75% range the literature uses.
 *
 * Session length is the one deliberate departure from the research protocol:
 * six blocks (~7 minutes) rather than the 20-25 minute clinical administration.
 * The adaptive rule itself is unchanged — only the number of blocks it runs for.
 *
 * Pure module: no timers, no DOM.
 */

// ---------------------------------------------------------------------------
// Protocol constants
// ---------------------------------------------------------------------------

/** Eight positions: a 3x3 grid with the centre cell (index 4) left out. */
export const GRID_CELLS = [0, 1, 2, 3, 5, 6, 7, 8] as const;
export const POSITION_COUNT = GRID_CELLS.length;

/** 500 ms lit + 2500 ms blank = 3 s per stimulus. */
export const STIMULUS_MS = 500;
export const INTERSTIMULUS_MS = 2500;
export const TRIAL_MS = STIMULUS_MS + INTERSTIMULUS_MS;

/** Trials per block are 20 + N so the number of *scorable* trials is constant. */
export const BASE_TRIALS_PER_BLOCK = 20;
export const TARGETS_PER_BLOCK = 6;

/** Six blocks x ~21-23 trials x 3 s ~= 7 minutes. */
export const DEFAULT_BLOCKS = 6;
export const DEFAULT_STARTING_N = 2;

export const INCREASE_THRESHOLD = 0.85;
/** The literature's decrease rule spans 50-75%; both ends are selectable. */
export const DECREASE_THRESHOLDS = [0.5, 0.6, 0.75] as const;
export const DEFAULT_DECREASE_THRESHOLD = 0.75;

export const MIN_N = 1;

// ---------------------------------------------------------------------------
// Block generation
// ---------------------------------------------------------------------------

export interface NBackBlockPlan {
  n: number;
  /** Position index (0-7 into GRID_CELLS) for each trial, in order. */
  positions: number[];
  /** Parallel array: is this trial a target (matches the one N back)? */
  targets: boolean[];
}

export function trialsPerBlock(n: number): number {
  return BASE_TRIALS_PER_BLOCK + n;
}

/**
 * Build one block.
 *
 * Non-target trials are drawn from the positions that do NOT match the one N
 * back, so the realised target count always equals TARGETS_PER_BLOCK. Letting
 * non-targets collide by chance would make the target rate drift block to
 * block, and accuracy would stop being comparable across blocks — which is
 * precisely the number the adaptive rule reads.
 */
export function generateBlock(
  n: number,
  random: () => number = Math.random,
): NBackBlockPlan {
  if (n < MIN_N) throw new RangeError(`n must be >= ${MIN_N}, got ${n}`);

  const total = trialsPerBlock(n);
  const scorable = total - n;
  if (TARGETS_PER_BLOCK > scorable) {
    throw new RangeError(`cannot place ${TARGETS_PER_BLOCK} targets in ${scorable} scorable trials`);
  }

  // Choose which of the scorable trials (indices n..total-1) are targets.
  const scorableIndices = Array.from({ length: scorable }, (_, i) => n + i);
  for (let i = 0; i < TARGETS_PER_BLOCK; i += 1) {
    const j = i + Math.floor(random() * (scorableIndices.length - i));
    [scorableIndices[i], scorableIndices[j]] = [scorableIndices[j], scorableIndices[i]];
  }
  const targetSet = new Set(scorableIndices.slice(0, TARGETS_PER_BLOCK));

  const positions: number[] = [];
  const targets: boolean[] = [];

  for (let i = 0; i < total; i += 1) {
    if (i < n) {
      // The first N trials have nothing N back to match, so they are unscored.
      positions.push(Math.floor(random() * POSITION_COUNT));
      targets.push(false);
      continue;
    }

    const nBack = positions[i - n];
    if (targetSet.has(i)) {
      positions.push(nBack);
      targets.push(true);
    } else {
      // Draw from the 7 positions that are not the n-back one.
      const offset = 1 + Math.floor(random() * (POSITION_COUNT - 1));
      positions.push((nBack + offset) % POSITION_COUNT);
      targets.push(false);
    }
  }

  return { n, positions, targets };
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

export interface NBackBlockResult {
  n: number;
  hits: number;
  misses: number;
  falseAlarms: number;
  correctRejections: number;
  /** (hits + correct rejections) / scorable trials. */
  accuracy: number;
  scorableTrials: number;
}

/**
 * Score one block from the participant's per-trial responses.
 *
 * `responded[i]` is true when the participant signalled a match on trial i.
 * The first N trials are excluded: no stimulus exists N back for them, so they
 * can be neither hit nor false alarm and counting them would inflate accuracy
 * by a constant that varies with N.
 */
export function scoreBlock(
  plan: NBackBlockPlan,
  responded: readonly boolean[],
): NBackBlockResult {
  let hits = 0;
  let misses = 0;
  let falseAlarms = 0;
  let correctRejections = 0;

  for (let i = plan.n; i < plan.positions.length; i += 1) {
    const said = responded[i] === true;
    if (plan.targets[i]) {
      if (said) hits += 1;
      else misses += 1;
    } else if (said) {
      falseAlarms += 1;
    } else {
      correctRejections += 1;
    }
  }

  const scorableTrials = plan.positions.length - plan.n;
  const accuracy = scorableTrials === 0 ? 0 : (hits + correctRejections) / scorableTrials;

  return { n: plan.n, hits, misses, falseAlarms, correctRejections, accuracy, scorableTrials };
}

// ---------------------------------------------------------------------------
// Adaptive rule
// ---------------------------------------------------------------------------

/** The N to present next, given how the block that just finished went. */
export function nextN(
  currentN: number,
  accuracy: number,
  decreaseThreshold: number = DEFAULT_DECREASE_THRESHOLD,
): number {
  if (accuracy >= INCREASE_THRESHOLD) return currentN + 1;
  if (accuracy <= decreaseThreshold) return Math.max(MIN_N, currentN - 1);
  return currentN;
}

/** Mean accuracy at each N level presented, for the session record. */
export function accuracyByLevel(
  blocks: readonly NBackBlockResult[],
): Record<number, { blocks: number; meanAccuracy: number }> {
  const byLevel: Record<number, { blocks: number; meanAccuracy: number }> = {};
  for (const block of blocks) {
    const entry = byLevel[block.n] ?? { blocks: 0, meanAccuracy: 0 };
    // Running mean so the record stays correct without a second pass.
    const total = entry.meanAccuracy * entry.blocks + block.accuracy;
    entry.blocks += 1;
    entry.meanAccuracy = total / entry.blocks;
    byLevel[block.n] = entry;
  }
  return byLevel;
}

// ---------------------------------------------------------------------------
// Session record
// ---------------------------------------------------------------------------

export interface NBackSession {
  id: string;
  timestamp: string;
  startingN: number;
  /** The N the adaptive rule arrived at after the final block. */
  endingN: number;
  /** Highest N actually presented during the session. */
  peakN: number;
  meanAccuracy: number;
  decreaseThreshold: number;
  durationMs: number;
  blocks: NBackBlockResult[];
  accuracyByLevel: Record<number, { blocks: number; meanAccuracy: number }>;
  /** False when the tab was backgrounded mid-run — see CorsiSession.timingReliable. */
  timingReliable: boolean;
}
