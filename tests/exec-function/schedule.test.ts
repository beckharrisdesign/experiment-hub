import { describe, it, expect } from "vitest";
import {
  CYCLE_LENGTH,
  assignmentFor,
  currentStreak,
  dayKeyFor,
  recentDayKeys,
} from "@/lib/exec-function/schedule";

describe("daily assignment", () => {
  it("gives the same assignment every time it is asked for one day", () => {
    const a = assignmentFor("2026-08-24");
    const b = assignmentFor("2026-08-24");
    expect(a).toEqual(b);
  });

  it("repeats on a seven-day cycle", () => {
    expect(assignmentFor("2026-08-24")).toEqual(assignmentFor("2026-08-31"));
    expect(CYCLE_LENGTH).toBe(7);
  });

  it("covers all three modules and both Corsi conditions within one cycle", () => {
    const week = recentDayKeys("2026-08-30", 7).map(assignmentFor);
    expect(new Set(week.map((a) => a.module))).toEqual(
      new Set(["corsi", "n-back", "self-report"]),
    );
    const corsi = week.filter((a) => a.module === "corsi");
    expect(new Set(corsi.map((a) => a.condition))).toEqual(
      new Set(["forward", "backward"]),
    );
  });

  it("schedules the questionnaire once a week", () => {
    const week = recentDayKeys("2026-08-30", 7).map(assignmentFor);
    expect(week.filter((a) => a.module === "self-report")).toHaveLength(1);
  });

  it("carries the condition through to the link it hands the email", () => {
    for (const dayKey of recentDayKeys("2026-08-30", 7)) {
      const assignment = assignmentFor(dayKey);
      if (assignment.condition) {
        expect(assignment.href).toContain(`condition=${assignment.condition}`);
      }
    }
  });

  it("stays on the cycle across a month and a year boundary", () => {
    expect(assignmentFor("2025-12-29")).toEqual(assignmentFor("2026-01-05"));
  });
});

describe("dayKeyFor", () => {
  it("formats as YYYY-MM-DD", () => {
    expect(dayKeyFor(new Date("2026-08-24T12:00:00Z"))).toBe("2026-08-24");
  });

  it("files a late-evening session under the local day, not the UTC one", () => {
    // 9pm Eastern on the 24th is already the 25th in UTC.
    const instant = new Date("2026-08-25T01:00:00Z");
    expect(dayKeyFor(instant, "UTC")).toBe("2026-08-25");
    expect(dayKeyFor(instant, "America/New_York")).toBe("2026-08-24");
  });
});

describe("recentDayKeys", () => {
  it("returns the window oldest-first, ending on the given day", () => {
    expect(recentDayKeys("2026-08-24", 3)).toEqual([
      "2026-08-22",
      "2026-08-23",
      "2026-08-24",
    ]);
  });

  it("walks back across a month boundary", () => {
    expect(recentDayKeys("2026-03-02", 3)).toEqual([
      "2026-02-28",
      "2026-03-01",
      "2026-03-02",
    ]);
  });
});

describe("currentStreak", () => {
  it("counts consecutive completed days up to today", () => {
    expect(currentStreak(["2026-08-22", "2026-08-23", "2026-08-24"], "2026-08-24")).toBe(3);
  });

  it("keeps the streak intact while today is still unfinished", () => {
    expect(currentStreak(["2026-08-22", "2026-08-23"], "2026-08-24")).toBe(2);
  });

  it("breaks on a day that passed with nothing logged", () => {
    expect(currentStreak(["2026-08-20", "2026-08-23"], "2026-08-24")).toBe(1);
  });

  it("is zero with no history at all", () => {
    expect(currentStreak([], "2026-08-24")).toBe(0);
  });

  it("is zero when the last session was two days ago", () => {
    expect(currentStreak(["2026-08-22"], "2026-08-24")).toBe(0);
  });
});
