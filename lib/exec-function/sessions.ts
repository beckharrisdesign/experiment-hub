/**
 * The shape every module's result takes once it leaves the task and enters the
 * log, plus the summary maths the history page reads.
 *
 * Each module keeps its own metrics in `detail` and contributes one `headline`
 * number — the single value its trend chart plots. There is deliberately no
 * cross-module composite: the three instruments measure different things on
 * incomparable scales, and averaging them would produce a number that moves
 * for reasons you could not attribute.
 */

import type { CorsiSession } from "./corsi";
import type { NBackSession } from "./nback";
import type { SelfReportSession } from "./self-report";
import type { ModuleId } from "./schedule";

export interface StoredSession {
  id: string;
  module: ModuleId;
  /** Distinguishes series within a module — Corsi's forward vs backward. */
  variant: string | null;
  /** ISO 8601 instant the session finished. */
  timestamp: string;
  /** Calendar day the session counts toward, in the schedule's timezone. */
  dayKey: string;
  durationMs: number;
  /** The number this module's trend chart plots. */
  headline: number;
  detail: CorsiSession | NBackSession | SelfReportSession;
}

/**
 * A track is one line on the history page: a module, plus the variant that
 * makes it its own measure. Corsi forward and backward are separate tracks
 * rather than two series on one chart — they are administered as separate
 * conditions, load different things (backward adds a mental reversal on top of
 * the span), and have their own norms. Overlaying them invites reading a gap
 * between the two lines as a finding, when it is just the task being harder.
 */
export interface Track {
  /** Stable key: the module, plus the variant when the module has more than one. */
  id: string;
  module: ModuleId;
  variant: string | null;
  label: string;
  headlineLabel: string;
  /** Which direction on the chart is the better one, in plain words. */
  direction: "higher is better" | "lower is better";
  href: string;
}

export const TRACKS: Track[] = [
  {
    id: "corsi-forward",
    module: "corsi",
    variant: "forward",
    label: "Corsi — forward",
    headlineLabel: "Total Score",
    direction: "higher is better",
    href: "/exec-function-assessment/corsi?condition=forward",
  },
  {
    id: "corsi-backward",
    module: "corsi",
    variant: "backward",
    label: "Corsi — backward",
    headlineLabel: "Total Score",
    direction: "higher is better",
    href: "/exec-function-assessment/corsi?condition=backward",
  },
  {
    id: "n-back",
    module: "n-back",
    variant: null,
    label: "Adaptive n-back",
    headlineLabel: "Peak N",
    direction: "higher is better",
    href: "/exec-function-assessment/n-back",
  },
  {
    id: "self-report",
    module: "self-report",
    variant: null,
    label: "Everyday check-in",
    headlineLabel: "Composite (45-135)",
    direction: "lower is better",
    href: "/exec-function-assessment/self-report",
  },
];

/** The track a given session or assignment belongs to. */
export function trackFor(module: ModuleId, variant: string | null): Track | undefined {
  return TRACKS.find(
    (track) => track.module === module && track.variant === (variant ?? null),
  );
}

/** Modules the API will accept a write for. */
export const MODULE_ORDER: ModuleId[] = ["corsi", "n-back", "self-report"];

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

export interface SeriesPoint {
  dayKey: string;
  timestamp: string;
  value: number;
  sessionId: string;
}

export interface TrackSummary {
  track: Track;
  sessionCount: number;
  /** One series — a track is a single measure by construction. */
  points: SeriesPoint[];
  latest: StoredSession | null;
  /** Change from the previous session on this same track, if there is one. */
  latestDelta: number | null;
  best: number | null;
}

function ascendingByTime(a: { timestamp: string }, b: { timestamp: string }) {
  return a.timestamp.localeCompare(b.timestamp);
}

/** Sessions belonging to one track, oldest first. */
export function sessionsFor(
  track: Track,
  sessions: readonly StoredSession[],
): StoredSession[] {
  return sessions
    .filter(
      (s) =>
        s.module === track.module &&
        (track.variant === null || s.variant === track.variant),
    )
    .slice()
    .sort(ascendingByTime);
}

export function summarizeTrack(
  track: Track,
  sessions: readonly StoredSession[],
): TrackSummary {
  const mine = sessionsFor(track, sessions);

  const points: SeriesPoint[] = mine.map((s) => ({
    dayKey: s.dayKey,
    timestamp: s.timestamp,
    value: s.headline,
    sessionId: s.id,
  }));

  const latest = mine.length > 0 ? mine[mine.length - 1] : null;
  const latestDelta =
    mine.length >= 2 ? mine[mine.length - 1].headline - mine[mine.length - 2].headline : null;

  const values = mine.map((s) => s.headline);
  const best =
    values.length === 0
      ? null
      : track.direction === "lower is better"
        ? Math.min(...values)
        : Math.max(...values);

  return { track, sessionCount: mine.length, points, latest, latestDelta, best };
}

export function summarizeAll(sessions: readonly StoredSession[]): TrackSummary[] {
  return TRACKS.map((track) => summarizeTrack(track, sessions));
}

/** Distinct calendar days with at least one completed session. */
export function completedDayKeys(sessions: readonly StoredSession[]): string[] {
  return Array.from(new Set(sessions.map((s) => s.dayKey))).sort();
}
