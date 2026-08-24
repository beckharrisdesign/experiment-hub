import { describe, it, expect } from "vitest";
import {
  dailyEmailHtml,
  dailyEmailText,
  dailySubject,
  type DailyEmailContext,
} from "@/lib/exec-function/email";
import { assignmentFor } from "@/lib/exec-function/schedule";

const base: DailyEmailContext = {
  assignment: assignmentFor("2026-08-24"),
  link: "https://labs.example.com/exec-function-assessment/corsi?condition=forward&k=secret",
  streak: 4,
  lastScore: { label: "Total Score", value: 30 },
};

describe("daily email", () => {
  it("names today's task in the subject", () => {
    expect(dailySubject(base)).toContain(base.assignment.label);
  });

  it("carries the link in both the HTML and the plain-text part", () => {
    expect(dailyEmailHtml(base)).toContain(base.link);
    expect(dailyEmailText(base)).toContain(base.link);
  });

  it("states the estimated time so the ask is legible before tapping", () => {
    expect(dailyEmailText(base)).toContain(`${base.assignment.estimatedMinutes} minutes`);
  });

  it("includes the streak and last score as plain retrieved facts", () => {
    const text = dailyEmailText(base);
    expect(text).toContain("Streak: 4 days");
    expect(text).toContain("Last Total Score: 30");
  });

  it("omits the facts line entirely on a first-ever send", () => {
    const text = dailyEmailText({ ...base, streak: 0, lastScore: null });
    expect(text).not.toContain("Streak");
    expect(text).not.toContain("Last ");
  });

  it("says day, not days, for a one-day streak", () => {
    expect(dailyEmailText({ ...base, streak: 1 })).toContain("Streak: 1 day");
  });

  it("carries the non-clinical disclaimer", () => {
    expect(dailyEmailText(base)).toContain("Not a clinical assessment");
    expect(dailyEmailHtml(base)).toContain("Not a clinical assessment");
  });

  it("offers no interpretation, encouragement, or advice", () => {
    // An explicit non-goal: a measurement tool that comments on its own
    // readings changes the thing it is measuring.
    const text = dailyEmailText(base).toLowerCase();
    for (const word of [
      "great", "well done", "keep it up", "improve", "improving", "try to",
      "you should", "nice work", "progress is", "don't worry",
    ]) {
      expect(text).not.toContain(word);
    }
  });
});
