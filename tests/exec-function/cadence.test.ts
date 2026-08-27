/**
 * Cadence: what is available, when, and how a day's later session is shown.
 *
 * The behaviour under test replaces a per-day gate that hid every task once
 * anything was logged. The guard that survives is narrower — a track cannot be
 * repeated inside its own interval — so most of these cases are about one
 * track's state not leaking into another's.
 */
import { describe, it, expect } from "vitest";
import {
  dayOrdinals,
  trackAvailability,
  summarizeTrack,
  TRACKS,
  type StoredSession,
} from "@/lib/exec-function/sessions";

const track = (id: string) => TRACKS.find((t) => t.id === id)!;
const BACKWARD = track("corsi-backward");
const NBACK = track("n-back");
const CHECKIN = track("self-report");

function session(
  id: string,
  module: StoredSession["module"],
  variant: string | null,
  timestamp: string,
): StoredSession {
  return {
    id,
    module,
    variant,
    timestamp,
    dayKey: timestamp.slice(0, 10),
    durationMs: 60000,
    headline: 10,
    detail: { trials: [] } as never,
  };
}

const CORSI_TODAY = session("a", "corsi", "backward", "2026-08-27T15:02:00.000Z");

describe("per-track intervals", () => {
  it("gives the timed measures a day and the check-in a week", () => {
    expect(BACKWARD.minIntervalDays).toBe(1);
    expect(NBACK.minIntervalDays).toBe(1);
    expect(CHECKIN.minIntervalDays).toBe(7);
  });

  it("treats a never-run track as due", () => {
    const a = trackAvailability(NBACK, [], "2026-08-27");
    expect(a.due).toBe(true);
    expect(a.lastDayKey).toBeNull();
  });
});

describe("availability is decided per track", () => {
  it("leaves the other tracks available once one is run", () => {
    expect(trackAvailability(NBACK, [CORSI_TODAY], "2026-08-27").due).toBe(true);
    expect(trackAvailability(track("corsi-forward"), [CORSI_TODAY], "2026-08-27").due).toBe(true);
    expect(trackAvailability(CHECKIN, [CORSI_TODAY], "2026-08-27").due).toBe(true);
  });

  it("refuses to re-run the same measure the same day", () => {
    const a = trackAvailability(BACKWARD, [CORSI_TODAY], "2026-08-27");
    expect(a.due).toBe(false);
    expect(a.nextDueDayKey).toBe("2026-08-28");
  });

  it("releases the same measure the next day", () => {
    expect(trackAvailability(BACKWARD, [CORSI_TODAY], "2026-08-28").due).toBe(true);
  });

  it("holds the check-in for a week", () => {
    const checkin = session("c", "self-report", null, "2026-08-26T19:38:00.000Z");
    const six = trackAvailability(CHECKIN, [checkin], "2026-09-01");
    expect(six.due).toBe(false);
    expect(six.nextDueDayKey).toBe("2026-09-02");
    expect(trackAvailability(CHECKIN, [checkin], "2026-09-02").due).toBe(true);
  });
});

describe("day ordinals", () => {
  const first = session("1", "corsi", "backward", "2026-08-25T15:00:45.000Z");
  const second = session("2", "n-back", null, "2026-08-25T15:02:00.000Z");
  const nextDay = session("3", "corsi", "forward", "2026-08-26T09:00:00.000Z");

  it("numbers a day's sessions in the order they happened", () => {
    const o = dayOrdinals([second, first, nextDay]);
    expect(o.get("1")).toBe(1);
    expect(o.get("2")).toBe(2);
  });

  it("counts across tracks, not within one", () => {
    // The n-back is that track's first ever session but the day's second.
    expect(dayOrdinals([first, second]).get("2")).toBe(2);
  });

  it("restarts the count each day", () => {
    expect(dayOrdinals([first, second, nextDay]).get("3")).toBe(1);
  });

  it("reaches the series points, counted across tracks", () => {
    const points = summarizeTrack(NBACK, [first, second]).points;
    expect(points).toHaveLength(1);
    expect(points[0].ordinalInDay).toBe(2);
  });

  it("leaves a day's first session at 1", () => {
    const points = summarizeTrack(BACKWARD, [first, second]).points;
    expect(points[0].ordinalInDay).toBe(1);
  });
});

describe("check-in recall window", () => {
  it("names a week, and states it in one place", async () => {
    const m = await import("@/lib/exec-function/self-report");
    expect(m.RECALL_WINDOW).toBe("week");
    expect(m.RECALL_WINDOW_PROMPT).toMatch(/past week/i);
    expect(m.RECALL_WINDOW_CHIP).toMatch(/past week/i);
  });

  it("keeps a check-in stored before any window was stated identifiable", () => {
    // The real 2026-08-26 session: answered against no declared window.
    const legacy = {
      id: "4a18b466",
      timestamp: "2026-08-26T19:38:32.916Z",
      durationMs: 174492,
      responses: {},
      scores: {} as never,
    };
    expect("recallWindow" in legacy).toBe(false);
  });
});

describe("the assigned block stays reachable", () => {
  it("does not hide a track that is both assigned and due", () => {
    // The failure this change exists to fix, approached from the other side:
    // gating per track must not also remove the day's own assignment.
    const availability = trackAvailability(BACKWARD, [], "2026-08-27");
    expect(availability.due).toBe(true);
    expect(availability.nextDueDayKey).toBeNull();
  });

  it("keeps every other track due when only the assigned one has run", () => {
    const due = TRACKS.filter((t) => trackAvailability(t, [CORSI_TODAY], "2026-08-27").due);
    expect(due.map((t) => t.id)).toEqual(["corsi-forward", "n-back", "self-report"]);
  });
});
