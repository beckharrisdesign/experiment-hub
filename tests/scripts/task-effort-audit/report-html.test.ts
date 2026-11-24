import { describe, it, expect } from "vitest";
import { renderHtmlReport } from "../../../scripts/task-effort-audit/lib/report-html.mjs";
import { compareToBaseline } from "../../../scripts/task-effort-audit/lib/compare.mjs";
import { baselineFrom, runRecord } from "./helpers";

/**
 * The HTML report is a shareable artifact, so it must escape everything that
 * came from a page or config, keep every in-page link working, and never show
 * a stopped run as if it completed. Parsed with jsdom's DOMParser.
 */

const SHOT = "screenshots/02-save.png";
const PIXEL = "data:image/png;base64,iVBORw0KGgo=";

function entries() {
  return [
    {
      index: 0,
      stepId: "open",
      do: "click",
      phase: "path",
      kind: "action",
      counted: true,
      outcome: "done",
      target: 'link "Thing"',
    },
    {
      index: 1,
      stepId: "save",
      do: "click",
      phase: "path",
      kind: "action",
      counted: true,
      outcome: "done",
      target: 'button "Save"',
      screenshot: SHOT,
      annotations: {
        repeatedEntry: { source: "step open", explanation: "again" },
      },
    },
  ];
}

function fullRun(overrides: Record<string, any> = {}) {
  const base = runRecord();
  const run: any = {
    ...base,
    task: {
      ...base.task,
      name: "Edit a thing",
      goal: "g",
      userRole: "r",
      familiarity: "f",
    },
    property: {
      ...base.property,
      name: "Prop",
      environment: "local",
      baseUrl: "http://127.0.0.1:1",
    },
    executionContext: {
      ...base.executionContext,
      startedAt: "2026-11-24T00:00:00Z",
      viewport: { width: 1280, height: 800 },
      locale: "en-US",
      authRef: "owner",
      nonUiSteps: ["setup: POST /__fixture/reset"],
    },
    execution: { ...base.execution, diagnostics: { browserDurationMs: 1000 } },
    verification: {
      status: "pass",
      note: "1 independent assertion(s) held",
      assertions: [],
    },
    safety: {
      mode: "read-only",
      mutationsPerformed: [],
      blockedRequests: [],
      requestOrigins: ["http://127.0.0.1:1"],
    },
    cleanup: { status: "done", residualChanges: false, detail: "ok" },
    findings: [
      {
        id: "F1",
        key: "repeated-entry:normal:save",
        kind: "annotation",
        stepId: "save",
        statement: "field asks again",
        reviewRequired: true,
        reviewNote: "Confirm it.",
        evidence: [
          { type: "screenshot", ref: SHOT },
          { type: "ledger", ref: "actions.json#1" },
          { type: "trace", ref: "trace.zip" },
        ],
      },
    ],
    artifacts: { screenshots: ["screenshots/01-start.png", SHOT] },
    ...overrides,
  };
  run.comparison ??= compareToBaseline(baselineFrom(runRecord()), run);
  return run;
}

const parse = (html: string) =>
  new DOMParser().parseFromString(html, "text/html");

function brokenAnchors(doc: Document) {
  return [...doc.querySelectorAll('a[href^="#"]')]
    .map((a) => a.getAttribute("href")!.slice(1))
    .filter((id) => !doc.getElementById(id));
}

// ---------------------------------------------------------------------------
// Structure
// ---------------------------------------------------------------------------

describe("renderHtmlReport", () => {
  it("shows execution, verification and comparison as three separate answers", () => {
    const doc = parse(
      renderHtmlReport(fullRun(), entries(), { [SHOT]: PIXEL }),
    );
    const labels = [...doc.querySelectorAll(".card-label")].map(
      (n) => n.textContent,
    );
    expect(labels).toEqual([
      "A. Execution",
      "B. Verified completion",
      "C. Comparison",
    ]);
    expect(doc.querySelector("h1")?.textContent).toBe("Edit a thing");
  });

  it("links every finding's evidence to something on the page", () => {
    const doc = parse(
      renderHtmlReport(fullRun(), entries(), { [SHOT]: PIXEL }),
    );
    expect(doc.querySelectorAll(".evidence a").length).toBe(2);
    expect(brokenAnchors(doc)).toEqual([]);
  });

  it("embeds screenshots, and says so plainly when one is missing", () => {
    const doc = parse(
      renderHtmlReport(fullRun(), entries(), { [SHOT]: PIXEL }),
    );
    expect(
      doc
        .querySelector(`#shot-screenshots-02-save-png img`)
        ?.getAttribute("src"),
    ).toBe(PIXEL);
    expect(
      doc.querySelector("#shot-screenshots-01-start-png .missing")?.textContent,
    ).toMatch(/not available/);
  });

  it("marks counted vs uncounted steps in the ledger", () => {
    const e = [
      ...entries(),
      {
        index: 2,
        stepId: "check",
        do: "assertText",
        phase: "path",
        kind: "assertion",
        counted: false,
        outcome: "done",
        target: "status",
      },
    ];
    const doc = parse(renderHtmlReport(fullRun(), e));
    const counts = [...doc.querySelectorAll(".entry-count")].map(
      (n) => n.textContent,
    );
    expect(counts).toEqual(["1", "1", "0"]);
  });
});

// ---------------------------------------------------------------------------
// Honesty about stopped runs
// ---------------------------------------------------------------------------

describe("stopped runs", () => {
  it("shows partial execution and no metric table", () => {
    const run = fullRun({
      execution: {
        status: "stopped",
        stepsExecuted: 1,
        stepsPlanned: 3,
        diagnostics: { browserDurationMs: 5 },
        failure: {
          stepId: "save",
          label: "Reference-path or locator failure",
          observed: "Timeout",
          rootCause: "not established",
          reviewNote: "Not a confirmed product failure.",
        },
      },
      verification: {
        status: "unknown",
        note: "Not run: the reference path did not complete",
        assertions: [],
      },
      comparison: undefined,
    });
    const doc = parse(renderHtmlReport(run, entries().slice(0, 1)));
    expect(doc.querySelector(".card-bad .card-value")?.textContent).toBe(
      "Stopped",
    );
    expect(doc.querySelector("table")).toBeNull();
    expect(doc.body.textContent).toMatch(
      /Partial execution, not a completed path/,
    );
    expect(doc.body.textContent).toMatch(/Root cause:\s*not established/);
  });

  it("flags residual test changes prominently", () => {
    const run = fullRun({
      cleanup: {
        status: "failed",
        residualChanges: true,
        detail: "cleanup failed: HTTP 500",
      },
    });
    const alert = parse(renderHtmlReport(run, entries())).querySelector(
      '[role="alert"]',
    );
    expect(alert?.textContent).toMatch(/Residual test changes may remain/);
  });
});

// ---------------------------------------------------------------------------
// Escaping
// ---------------------------------------------------------------------------

describe("escaping", () => {
  it("escapes page- and config-derived text", () => {
    const evil = '<img src=x onerror="alert(1)"><script>alert(2)</script>';
    const run = fullRun();
    run.findings[0].statement = evil;
    const e = entries();
    e[0].target = evil;
    const html = renderHtmlReport(run, e);
    const doc = parse(html);
    expect(doc.querySelectorAll("script")).toHaveLength(1); // only the zoom toggle
    expect(doc.querySelector("img[onerror]")).toBeNull();
    expect(html).toContain("&lt;script&gt;alert(2)&lt;/script&gt;");
  });
});

// ---------------------------------------------------------------------------
// MVDS principle tags
// ---------------------------------------------------------------------------

describe("MVDS principles", () => {
  const principle = {
    id: "recognition-rather-than-recall",
    title: "Names that mean what they say",
    source: { kind: "external", name: "Nielsen Norman Group", url: "https://www.nngroup.com/articles/ten-usability-heuristics/", ref: "Heuristic 6" },
  };

  it("links finding tags to a principles section whose step and finding links resolve", () => {
    const run = fullRun();
    run.findings[0].principles = [principle];
    run.principles = { mvdsCommit: "dae12d7", evidence: [{ ...principle, steps: ["save"], findings: ["F1"] }] };
    const doc = parse(renderHtmlReport(run, entries()));
    expect(doc.querySelector(".principle-tags a")?.getAttribute("href")).toBe("#principle-recognition-rather-than-recall");
    expect(doc.querySelector("#principle-recognition-rather-than-recall a[href^='https://www.nngroup.com']")).not.toBeNull();
    expect(doc.body.textContent).toMatch(/not a verdict on the principle/);
    expect(brokenAnchors(doc)).toEqual([]);
  });

  it("omits the section when nothing is tagged", () => {
    const doc = parse(renderHtmlReport(fullRun(), entries()));
    expect(doc.getElementById("h-principles")).toBeNull();
  });
});
