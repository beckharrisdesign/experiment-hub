/**
 * Trend display: every session is shown, and two sessions on one day are
 * tellable apart.
 *
 * The filtering test is a guard, not a feature test. An earlier draft of this
 * change would have classified a zero-scoring Corsi run as a false start and
 * dropped it from the trend and the figures; that was reversed because a run
 * that measured badly is still a run that happened. This suite fails if
 * score-based filtering is reintroduced.
 */
import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { act } from "react";
import { render, screen, cleanup } from "@testing-library/react";
import TrendChart from "@/app/exec-function-assessment/components/TrendChart";
import {
  summarizeTrack,
  TRACKS,
  secondaryCount,
  type StoredSession,
} from "@/lib/exec-function/sessions";
import type { CorsiSession } from "@/lib/exec-function/corsi";

const BACKWARD = TRACKS.find((t) => t.id === "corsi-backward")!;

function corsi(
  id: string,
  timestamp: string,
  dayKey: string,
  headline: number,
  trials: number,
  durationMs: number,
): StoredSession {
  return {
    id,
    module: "corsi",
    variant: "backward",
    timestamp,
    dayKey,
    durationMs,
    headline,
    detail: {
      trials: Array.from({ length: trials }, () => ({})),
    } as unknown as CorsiSession,
  };
}

// The two runs actually stored on 2026-08-25: a nine-second false start that
// scored 0, then a full administration that scored 20.
const FALSE_START = corsi("a", "2026-08-25T15:00:45.810Z", "2026-08-25", 0, 2, 9509);
const REAL_RUN = corsi("b", "2026-08-25T15:02:00.638Z", "2026-08-25", 20, 8, 65459);

describe("no score-based filtering", () => {
  it("keeps a zero-scoring session in the count, the series and the figures", () => {
    const summary = summarizeTrack(BACKWARD, [FALSE_START, REAL_RUN]);
    expect(summary.sessionCount).toBe(2);
    expect(summary.points).toHaveLength(2);
    expect(summary.points.map((p) => p.value)).toEqual([0, 20]);
    expect(summary.best).toBe(20);
    expect(summary.latestDelta).toBe(20);
  });

  it("reaches the series with exactly the sessions stored for the track", () => {
    const stored = [FALSE_START, REAL_RUN];
    const summary = summarizeTrack(BACKWARD, stored);
    expect(summary.points.map((p) => p.sessionId).sort()).toEqual(
      stored.map((s) => s.id).sort(),
    );
  });

  it("summarizes a track whose every session scored zero", () => {
    const summary = summarizeTrack(BACKWARD, [FALSE_START]);
    expect(summary.sessionCount).toBe(1);
    expect(summary.best).toBe(0);
  });
});

describe("series points carry row context", () => {
  it("carries duration and trial count", () => {
    const [first] = summarizeTrack(BACKWARD, [FALSE_START, REAL_RUN]).points;
    expect(first.durationMs).toBe(9509);
    expect(first.count).toBe(2);
  });

  it("reports no count for modules whose run length never varies", () => {
    const nback: StoredSession = {
      id: "n",
      module: "n-back",
      variant: null,
      timestamp: "2026-08-26T15:00:00.000Z",
      dayKey: "2026-08-26",
      durationMs: 420000,
      headline: 3,
      detail: {} as never,
    };
    expect(secondaryCount(nback)).toBeNull();
    expect(TRACKS.find((t) => t.id === "n-back")!.countLabel).toBeUndefined();
    expect(BACKWARD.countLabel).toBe("Trials");
  });
});

describe("TrendChart", () => {
  beforeAll(() => {
    // jsdom has no ResizeObserver and no layout to report, so the stub captures
    // the callback and lets a test drive it. Without that, the chart would keep
    // its first-paint width and the resize behaviour would go untested.
    globalThis.ResizeObserver = class {
      constructor(cb: ResizeObserverCallback) {
        observers.push(cb);
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  });
  afterEach(() => {
    observers.length = 0;
    cleanup();
  });

  const observers: ResizeObserverCallback[] = [];

  /** Report a container width to every mounted chart. */
  function resizeTo(width: number) {
    act(() => {
      for (const cb of observers) {
        cb(
          [{ contentRect: { width } } as unknown as ResizeObserverEntry],
          {} as ResizeObserver,
        );
      }
    });
  }

  const points = summarizeTrack(BACKWARD, [FALSE_START, REAL_RUN]).points;

  function circles(container: HTMLElement) {
    return Array.from(container.querySelectorAll("circle"));
  }

  it("separates two sessions recorded on the same day", () => {
    const { container } = render(
      <TrendChart points={points} valueLabel="Total Score" direction="higher is better" />,
    );
    // Marks only; the oversized transparent hit targets share their centres.
    const xs = circles(container)
      .filter((c) => c.getAttribute("fill") !== "transparent")
      .map((c) => Number(c.getAttribute("cx")));
    const unique = new Set(xs);
    expect(unique.size).toBeGreaterThan(1);
  });

  it("spreads a single-day series across the plot rather than centring it", () => {
    const { container } = render(
      <TrendChart points={points} valueLabel="Total Score" direction="higher is better" />,
    );
    const xs = circles(container).map((c) => Number(c.getAttribute("cx")));
    expect(Math.min(...xs)).toBe(38); // PAD.left
    expect(Math.max(...xs)).toBeGreaterThan(Math.min(...xs) + 100);
  });

  it("keeps horizontal distance proportional to elapsed time", () => {
    const later = corsi("c", "2026-09-01T15:00:00.000Z", "2026-09-01", 24, 8, 60000);
    const three = summarizeTrack(BACKWARD, [FALSE_START, REAL_RUN, later]).points;
    const { container } = render(
      <TrendChart points={three} valueLabel="Total Score" direction="higher is better" />,
    );
    const xs = Array.from(new Set(circles(container).map((c) => Number(c.getAttribute("cx")))))
      .sort((a, b) => a - b);
    // 75 seconds between the first two, a week to the third.
    expect(xs[1] - xs[0]).toBeLessThan((xs[2] - xs[1]) / 100);
  });

  it("labels the axis once when the series covers one day", () => {
    render(
      <TrendChart points={points} valueLabel="Total Score" direction="higher is better" />,
    );
    expect(screen.getAllByText("8/25")).toHaveLength(1);
  });

  it("keeps both labels when the series spans more than one day", () => {
    const later = corsi("c", "2026-09-01T15:00:00.000Z", "2026-09-01", 24, 8, 60000);
    const three = summarizeTrack(BACKWARD, [FALSE_START, REAL_RUN, later]).points;
    render(
      <TrendChart points={three} valueLabel="Total Score" direction="higher is better" />,
    );
    expect(screen.getByText("8/25")).toBeTruthy();
    expect(screen.getByText("9/1")).toBeTruthy();
  });

  it("renders at a fixed height whatever its width", () => {
    const { container } = render(
      <TrendChart points={points} valueLabel="Total Score" direction="higher is better" />,
    );
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("height")).toBe("200");
    expect(svg.getAttribute("width")).toBe("100%");
    expect(svg.getAttribute("viewBox")).toMatch(/^0 0 \d+ 200$/);
    expect(svg.getAttribute("class") ?? "").not.toContain("max-w");
  });

  it("re-measures on resize, holding its height and its type size", () => {
    const { container } = render(
      <TrendChart points={points} valueLabel="Total Score" direction="higher is better" />,
    );
    const svg = container.querySelector("svg")!;

    resizeTo(912);
    expect(svg.getAttribute("viewBox")).toBe("0 0 912 200");
    const wideSpan = spanOf(container);

    resizeTo(416);
    expect(svg.getAttribute("viewBox")).toBe("0 0 416 200");
    const narrowSpan = spanOf(container);

    resizeTo(912);
    expect(svg.getAttribute("viewBox")).toBe("0 0 912 200");

    // The plot absorbs the width; the band never deepens.
    expect(wideSpan).toBeGreaterThan(narrowSpan);
    expect(svg.getAttribute("height")).toBe("200");

    // Labels are sized in CSS pixels, so they do not scale with the container.
    for (const text of Array.from(container.querySelectorAll("text"))) {
      expect(text.getAttribute("class") ?? "").toContain("text-[10px]");
    }
  });

  function spanOf(container: HTMLElement) {
    const xs = circles(container).map((c) => Number(c.getAttribute("cx")));
    return Math.max(...xs) - Math.min(...xs);
  }

  it("writes the caption as a sentence", () => {
    render(
      <TrendChart points={points} valueLabel="Total Score" direction="higher is better" />,
    );
    expect(screen.getByText(/Latest point ringed\. Higher is better\./)).toBeTruthy();
  });
});
