// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { compareToBaseline } from "../../../scripts/task-effort-audit/lib/compare.mjs";
import {
  classifyFailure,
  StopError,
} from "../../../scripts/task-effort-audit/lib/classify.mjs";
import { buildFindings } from "../../../scripts/task-effort-audit/lib/findings.mjs";
import { renderReport } from "../../../scripts/task-effort-audit/lib/report.mjs";
import {
  appendIndex,
  approveBaseline,
  listRuns,
  loadBaselines,
  runDirOf,
  writeJson,
} from "../../../scripts/task-effort-audit/lib/store.mjs";
import { baselineFrom, runRecord } from "./helpers";

const withMetrics = (actions: number, extra: Record<string, any> = {}) =>
  runRecord({
    metrics: {
      path: { actions, repeatedEntryFields: 1, contextSwitches: 0 },
      recovery: { actions: 0, repeatedEntryFields: 0, contextSwitches: 0 },
      conditional: { performed: actions > 3 ? 1 : 0, skipped: 0 },
      scrolls: 0,
    },
    ...extra,
  });

// ---------------------------------------------------------------------------
// Comparison
// ---------------------------------------------------------------------------

describe("compareToBaseline", () => {
  it("reports zero deltas for identical counts", () => {
    const run = withMetrics(3);
    const cmp = compareToBaseline(baselineFrom(run), {
      ...run,
      runId: "later",
    });
    expect(cmp.status).toBe("compared");
    expect(cmp.changed).toEqual([]);
  });

  it("reports an added interaction as a delta to review", () => {
    const base = withMetrics(3);
    const cmp = compareToBaseline(baselineFrom(base), withMetrics(4));
    const actions = cmp.metrics.find((m: any) => m.key === "path.actions");
    expect(actions).toMatchObject({ baseline: 3, current: 4, delta: 1 });
    expect(cmp.changed).toContain("path.actions");
  });

  it("is not comparable when the task definition changed", () => {
    const base = withMetrics(3);
    const run = withMetrics(5, {
      task: { ...base.task, definitionHash: "h2" },
    });
    const cmp = compareToBaseline(baselineFrom(base), run);
    expect(cmp.status).toBe("not-comparable");
    expect(cmp.metrics).toEqual([]);
    expect(cmp.reasons.join(" ")).toMatch(/task definition changed/);
  });

  it("shows a stopped run as partial execution, never as completed-path deltas", () => {
    const base = withMetrics(9);
    const stopped = withMetrics(8, {
      execution: {
        status: "stopped",
        stepsExecuted: 9,
        stepsPlanned: 12,
        failure: { stepId: "save", label: "Reference-path or locator failure" },
      },
      verification: { status: "unknown", assertions: [] },
    });
    const cmp = compareToBaseline(baselineFrom(base), stopped);
    expect(cmp.status).toBe("not-comparable");
    expect(cmp.metrics).toEqual([]);
    expect(cmp.partial).toMatchObject({
      stoppedAtStep: "save",
      actionsBeforeStop: 8,
    });
  });

  it("does not compare a completed run whose final state was not verified", () => {
    const base = withMetrics(3);
    const cmp = compareToBaseline(
      baselineFrom(base),
      withMetrics(3, { verification: { status: "fail", assertions: [] } }),
    );
    expect(cmp.status).toBe("not-comparable");
    expect(cmp.reasons.join(" ")).toMatch(/not verified/);
  });

  it("tracks new, resolved and unchanged findings by stable key", () => {
    const base = runRecord({
      findings: [
        { key: "repeated-entry:normal:a" },
        { key: "context-switch:normal:b" },
      ],
    });
    const run = runRecord({
      findings: [
        { key: "repeated-entry:normal:a" },
        { key: "conditional-performed:normal:c" },
      ],
    });
    const cmp = compareToBaseline(baselineFrom(base), run);
    expect(cmp.findings).toEqual({
      new: ["conditional-performed:normal:c"],
      resolved: ["context-switch:normal:b"],
      unchanged: ["repeated-entry:normal:a"],
    });
  });
});

// ---------------------------------------------------------------------------
// Failure classification
// ---------------------------------------------------------------------------

describe("classifyFailure", () => {
  const timeout = () =>
    Object.assign(new Error("locator.click: Timeout 4000ms exceeded."), {
      name: "TimeoutError",
    });

  it("classifies a missing locator on an action as a reference-path failure, not a product failure", () => {
    const f = classifyFailure({
      step: { id: "save", do: "click" },
      error: timeout(),
      remainingMs: 20000,
      stepTimeoutMs: 4000,
    });
    expect(f.category).toBe("reference-path");
    expect(f.rootCause).toBe("not established");
    expect(f.reviewNote).toMatch(/Not a confirmed product failure/);
  });

  it("classifies a failed assertion as a product assertion failure", () => {
    const err = Object.assign(new Error('expected "a", observed "b"'), {
      name: "AssertionError",
    });
    expect(
      classifyFailure({ step: { id: "x", do: "assertText" }, error: err })
        .category,
    ).toBe("product-assertion");
  });

  it("classifies a timeout caused by the run's duration limit as a timeout", () => {
    const f = classifyFailure({
      step: { id: "save", do: "click" },
      error: timeout(),
      remainingMs: 500,
      stepTimeoutMs: 4000,
    });
    expect(f.category).toBe("timeout");
  });

  it("classifies connection errors as environment failures", () => {
    const err = new Error(
      "page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:4789/",
    );
    expect(
      classifyFailure({ step: { id: "x", do: "click" }, error: err }).category,
    ).toBe("environment");
  });

  it("keeps the category of the runner's own stops", () => {
    expect(
      classifyFailure({
        step: null,
        error: new StopError("safety-stop", "maxActions"),
      }).category,
    ).toBe("safety-stop");
    expect(
      classifyFailure({
        step: null,
        error: new StopError("authentication", "login"),
      }).category,
    ).toBe("authentication");
  });
});

// ---------------------------------------------------------------------------
// Findings always point to evidence
// ---------------------------------------------------------------------------

describe("buildFindings", () => {
  it("gives every finding evidence, a kind, and a stable key", () => {
    const entries = [
      {
        index: 0,
        stepId: "again",
        counted: true,
        phase: "path",
        target: 'field "Confirm"',
        screenshot: "screenshots/02-again.png",
        annotations: {
          repeatedEntry: { source: "s", explanation: "e" },
          suggestion: "merge fields",
        },
      },
      {
        index: 1,
        stepId: "tab",
        counted: true,
        phase: "path",
        target: 'link "Help"',
        annotations: {
          contextSwitch: { from: "a", to: "b", boundary: "new-browser-tab" },
        },
      },
      {
        index: 2,
        stepId: "ok",
        counted: true,
        phase: "path",
        conditional: { performed: true, reason: "dialog" },
      },
    ];
    const findings = buildFindings({
      taskId: "t",
      scenario: "normal",
      entries,
      failure: {
        stepId: "save",
        category: "reference-path",
        label: "Reference-path or locator failure",
        observed: "timeout",
        reviewNote: "r",
      },
      verification: {
        assertions: [
          {
            stepId: "persisted",
            outcome: "failed",
            observed: "nope",
            ledgerIndex: 3,
          },
        ],
      },
      blockedRequests: [
        { stepId: "save", method: "POST", url: "u", reason: "read-only" },
      ],
      cleanup: { residualChanges: true, detail: "cleanup failed" },
    });
    expect(findings.map((f: any) => f.key)).toEqual([
      "repeated-entry:normal:again",
      "context-switch:normal:tab",
      "conditional-performed:normal:ok",
      "path-stopped:normal:save:reference-path",
      "verification-failed:normal:persisted",
      "safety-blocked:normal:save",
      "residual-changes:normal",
    ]);
    for (const f of findings) {
      expect(f.evidence.length).toBeGreaterThan(0);
      expect(["observation", "annotation", "hypothesis"]).toContain(f.kind);
      expect(f.evidence.every((e: any) => !path.isAbsolute(e.ref))).toBe(true);
    }
    expect(findings[0].suggestion.label).toMatch(/not an observed fact/);
  });
});

// ---------------------------------------------------------------------------
// Baseline approval and the run index
// ---------------------------------------------------------------------------

describe("baseline approval", () => {
  let dataDir: string;
  beforeEach(async () => {
    dataDir = await mkdtemp(path.join(os.tmpdir(), "tea-store-"));
  });
  const save = (run: any) =>
    writeJson(path.join(runDirOf(dataDir, run.runId), "run.json"), run);

  it("refuses an incomplete or unverified run", async () => {
    const stopped = runRecord({
      runId: "r-stopped",
      execution: { status: "stopped", failure: { stepId: "x" } },
      verification: { status: "unknown" },
    });
    const unverified = runRecord({
      runId: "r-unverified",
      verification: { status: "fail" },
    });
    await save(stopped);
    await save(unverified);
    await expect(approveBaseline(dataDir, "r-stopped")).rejects.toThrow(
      /did not complete/,
    );
    await expect(approveBaseline(dataDir, "r-unverified")).rejects.toThrow(
      /not verified/,
    );
    expect(await loadBaselines(dataDir, "edit-thing", "normal")).toBeNull();
  });

  it("requires --supersede to replace a baseline and keeps history", async () => {
    await save(runRecord({ runId: "r1" }));
    await save(runRecord({ runId: "r2" }));
    await approveBaseline(dataDir, "r1", { by: "tester", note: "first" });
    await expect(approveBaseline(dataDir, "r2")).rejects.toThrow(/--supersede/);
    await approveBaseline(dataDir, "r2", { supersede: true });
    const b = await loadBaselines(dataDir, "edit-thing", "normal");
    expect(b.current.runId).toBe("r2");
    expect(b.history.map((h: any) => [h.runId, h.supersedes])).toEqual([
      ["r1", null],
      ["r2", "r1"],
    ]);
  });

  it("lists runs from the append-only index, newest first, flagging interrupted runs", async () => {
    await appendIndex(dataDir, { event: "started", runId: "a", taskId: "t" });
    await appendIndex(dataDir, {
      event: "finished",
      runId: "a",
      taskId: "t",
      executionStatus: "completed",
    });
    await appendIndex(dataDir, { event: "started", runId: "b", taskId: "t" });
    const runs = await listRuns(dataDir);
    expect(runs.map((r: any) => [r.runId, r.executionStatus])).toEqual([
      ["b", "interrupted (no finish recorded)"],
      ["a", "completed"],
    ]);
    const lines = (await readFile(path.join(dataDir, "index.jsonl"), "utf8"))
      .trim()
      .split("\n");
    expect(lines).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

describe("renderReport", () => {
  it("keeps execution, verification and comparison separate and flags residual changes", () => {
    const run: any = {
      ...runRecord(),
      task: { ...runRecord().task, name: "Edit a thing" },
      property: { id: "p", name: "Prop", environment: "local" },
      executionContext: {
        startedAt: "2026-11-24T00:00:00Z",
        fixtureVariant: "v1",
      },
      execution: {
        status: "completed",
        stepsExecuted: 3,
        stepsPlanned: 3,
        failure: null,
        diagnostics: { browserDurationMs: 1200 },
      },
      verification: { status: "pass", note: "1 held", assertions: [] },
      safety: { mode: "read-only", blockedRequests: [] },
      cleanup: { residualChanges: true, detail: "cleanup failed: HTTP 500" },
      comparison: compareToBaseline(null, runRecord()),
      artifacts: { screenshots: [] },
    };
    const md = renderReport(run);
    expect(md).toMatch(/A\. Execution/);
    expect(md).toMatch(/B\. Verified completion/);
    expect(md).toMatch(/C\. Comparison/);
    expect(md).toMatch(/RESIDUAL TEST CHANGES MAY REMAIN/);
    expect(md).toMatch(/diagnostic only/);
  });
});
