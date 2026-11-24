import { describe, it, expect, beforeEach } from "vitest";
import { mkdtemp, writeFile, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  collectDashboard,
  renderDashboard,
  stateOf,
} from "../../../scripts/task-effort-audit/lib/dashboard.mjs";
import {
  appendIndex,
  runDirOf,
  writeJson,
} from "../../../scripts/task-effort-audit/lib/store.mjs";
import { runRecord } from "./helpers";

/**
 * The runs page summarizes many runs at once, so it must order tasks the same
 * way it counts them, never show a stopped run as fine, and only link reports
 * that exist. Parsed with jsdom's DOMParser.
 */

function run(id: string, taskId: string, overrides: Record<string, any> = {}) {
  const base = runRecord({ runId: id, ...overrides });
  return {
    ...base,
    task: {
      ...base.task,
      id: taskId,
      name: `Task ${taskId}`,
      ...(overrides.task ?? {}),
    },
    property: { ...base.property, name: "Prop" },
    executionContext: {
      ...base.executionContext,
      startedAt: "2026-11-24T10:00:00.000Z",
      viewport: { width: 390, height: 844 },
    },
    comparison: overrides.comparison ?? {
      status: "compared",
      changed: [],
      metrics: [{ key: "path.actions", baseline: 3, current: 3 }],
      reasons: [],
    },
  };
}

let dataDir: string;

async function save(r: any, { report = true } = {}) {
  await writeJson(path.join(runDirOf(dataDir, r.runId), "run.json"), r);
  if (report)
    await writeFile(
      path.join(runDirOf(dataDir, r.runId), "report.html"),
      "<p>report</p>",
    );
  await appendIndex(dataDir, {
    event: "started",
    runId: r.runId,
    taskId: r.task.id,
    scenario: r.task.scenario,
  });
  await appendIndex(dataDir, {
    event: "finished",
    runId: r.runId,
    taskId: r.task.id,
    scenario: r.task.scenario,
    executionStatus: r.execution.status,
  });
}

beforeEach(async () => {
  dataDir = await mkdtemp(path.join(os.tmpdir(), "tea-dash-"));
});

const parse = (html: string) =>
  new DOMParser().parseFromString(html, "text/html");

// ---------------------------------------------------------------------------
// States
// ---------------------------------------------------------------------------

describe("stateOf", () => {
  it("never calls a stopped or unverified run unchanged", () => {
    expect(stateOf(runRecord({ execution: { status: "stopped" } }))).toBe(
      "stopped",
    );
    expect(stateOf(runRecord({ verification: { status: "fail" } }))).toBe(
      "not-verified",
    );
    expect(
      stateOf({
        ...runRecord(),
        comparison: { status: "compared", changed: ["path.actions"] },
      }),
    ).toBe("changed");
    expect(
      stateOf({
        ...runRecord(),
        comparison: { status: "compared", changed: [] },
      }),
    ).toBe("unchanged");
    expect(stateOf(null)).toBe("no-local-runs");
  });
});

// ---------------------------------------------------------------------------
// Collect + render
// ---------------------------------------------------------------------------

describe("runs page", () => {
  it("shows each task's latest run, attention first, with counts that match the rows", async () => {
    await save(run("20261124T090000Z-a", "alpha"));
    await save(
      run("20261124T100000Z-a", "alpha", {
        comparison: {
          status: "compared",
          changed: ["path.actions"],
          metrics: [{ key: "path.actions", baseline: 3, current: 4 }],
          reasons: [],
        },
        metrics: {
          ...runRecord().metrics,
          path: { actions: 4, repeatedEntryFields: 0, contextSwitches: 0 },
        },
      }),
    );
    await save(
      run("20261124T100000Z-b", "beta", {
        execution: {
          status: "stopped",
          stepsExecuted: 1,
          stepsPlanned: 3,
          failure: {
            stepId: "save",
            label: "Reference-path or locator failure",
          },
        },
        verification: { status: "unknown", assertions: [] },
      }),
    );
    await save(run("20261124T100000Z-c", "gamma"));

    const data = await collectDashboard(dataDir);
    expect(data.rows.map((r: any) => [r.taskId, r.state])).toEqual([
      ["beta", "stopped"],
      ["alpha", "changed"],
      ["gamma", "unchanged"],
    ]);
    expect(data.rows[1].latest.runId).toBe("20261124T100000Z-a");
    expect(data.rows[1].runCount).toBe(2);

    const doc = parse(renderDashboard(data));
    const summary = [...doc.querySelectorAll(".summary li")].map((li) =>
      li.textContent?.replace(/\s+/g, " ").trim(),
    );
    expect(summary).toEqual(["1 Stopped", "1 Changed", "1 Unchanged"]);
    const firstRow = doc.querySelector("table.tasks tbody tr");
    expect(firstRow?.textContent).toMatch(/Stopped at save/);
  });

  it("lists a committed baseline with no local runs", async () => {
    await writeJson(path.join(dataDir, "baselines", "delta--normal.json"), {
      current: {
        taskId: "delta",
        scenario: "normal",
        runId: "r0",
        approvedAt: "2026-11-24T00:00:00Z",
        metrics: { path: { actions: 2 } },
      },
      history: [{ action: "approved", runId: "r0" }],
    });
    const data = await collectDashboard(dataDir);
    expect(data.rows).toEqual([
      expect.objectContaining({
        taskId: "delta",
        state: "no-local-runs",
        latest: null,
      }),
    ]);
    expect(parse(renderDashboard(data)).body.textContent).toMatch(
      /Committed baseline, no local runs/,
    );
  });

  it("links only reports that exist, and escapes task text", async () => {
    await save(
      run("20261124T100000Z-x", "x", {
        task: { name: '<img src=x onerror="alert(1)">' },
      }),
      { report: false },
    );
    await save(run("20261124T100000Z-y", "y"));
    const doc = parse(renderDashboard(await collectDashboard(dataDir)));
    const hrefs = [...doc.querySelectorAll("a[href]")].map((a) =>
      a.getAttribute("href"),
    );
    expect(hrefs).toContain("runs/20261124T100000Z-y/report.html");
    expect(hrefs).not.toContain("runs/20261124T100000Z-x/report.html");
    expect(doc.querySelector("img[onerror]")).toBeNull();
  });

  it("can render without the document wrapper, for embedding", async () => {
    await save(run("20261124T100000Z-y", "y"));
    const html = renderDashboard(await collectDashboard(dataDir), {
      standalone: false,
    });
    expect(html).not.toMatch(/<!doctype|<html|<body/i);
    expect(html).toMatch(/<title>/);
  });
});
