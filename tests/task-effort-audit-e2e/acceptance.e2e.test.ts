import { describe, it, expect, beforeAll } from "vitest";
import { mkdtemp, readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import os from "node:os";
import path from "node:path";
import { executeRun } from "../../scripts/task-effort-audit/lib/runner.mjs";
import {
  approveBaseline,
  loadBaselines,
  runDirOf,
} from "../../scripts/task-effort-audit/lib/store.mjs";
import { SafetyError } from "../../scripts/task-effort-audit/lib/util.mjs";

/**
 * Acceptance criteria 1–12 from the v1 brief, run against the local fixture
 * in a real browser. Each test names the criterion it demonstrates.
 */

const ROOT = path.resolve(__dirname, "../..");
const AUDITS = path.join(ROOT, "scripts/task-effort-audit/audits");
const FIXTURE = path.join(ROOT, "scripts/task-effort-audit/fixture/server.mjs");

let work: string;
let dataDir: string;
let taskPath: string;
let baseTask: any;

function freePort(): Promise<number> {
  return new Promise((resolve) => {
    const s = createServer();
    s.listen(0, "127.0.0.1", () => {
      const { port } = s.address() as any;
      s.close(() => resolve(port));
    });
  });
}

async function writeTask(name: string, mutate: (t: any) => void = () => {}) {
  const t = structuredClone(baseTask);
  mutate(t);
  const p = path.join(work, "tasks", `${name}.json`);
  await writeFile(p, JSON.stringify(t, null, 2));
  return p;
}

const run = (opts: Record<string, any>) =>
  executeRun({
    taskPath,
    dataDir,
    allowWrites: true,
    fixtureVariant: "v1",
    log: () => {},
    ...opts,
  });

beforeAll(async () => {
  work = await mkdtemp(path.join(os.tmpdir(), "tea-e2e-"));
  dataDir = path.join(work, "data");
  await mkdir(path.join(work, "tasks"), { recursive: true });
  await mkdir(path.join(work, "properties"), { recursive: true });
  // Same property, on a free port, with the fixture module resolved absolutely.
  const prop = JSON.parse(
    await readFile(path.join(AUDITS, "properties/local-fixture.json"), "utf8"),
  );
  prop.baseUrl = `http://127.0.0.1:${await freePort()}`;
  prop.fixture.module = FIXTURE;
  await writeFile(
    path.join(work, "properties/local-fixture.json"),
    JSON.stringify(prop, null, 2),
  );
  baseTask = JSON.parse(
    await readFile(
      path.join(AUDITS, "tasks/update-contact-email.json"),
      "utf8",
    ),
  );
  taskPath = await writeTask("update-contact-email");
});

describe("task-effort audit acceptance (local fixture)", () => {
  let baselineRunId: string;

  it("1 · two identical runs produce identical metric counts", async () => {
    const a = await run({});
    const b = await run({});
    expect(a.exitCode).toBe(0);
    expect(b.exitCode).toBe(0);
    expect(b.run.runId).not.toBe(a.run.runId);
    expect(b.run.metrics).toEqual(a.run.metrics);
    expect(a.run.metrics.path.actions).toBe(9);
    baselineRunId = a.run.runId;
  });

  it("8 · a completed run never becomes a baseline without the explicit approve command", async () => {
    expect(
      await loadBaselines(dataDir, "update-contact-email", "normal"),
    ).toBeNull();
    await approveBaseline(dataDir, baselineRunId, { by: "e2e" });
    expect(
      (await loadBaselines(dataDir, "update-contact-email", "normal")).current
        .runId,
    ).toBe(baselineRunId);
  });

  it("2 · a supported conditional confirmation dialog changes the count by exactly one", async () => {
    const { run: r } = await run({ fixtureVariant: "v2-confirm" });
    expect(r.comparison.status).toBe("compared");
    const actions = r.comparison.metrics.find(
      (m: any) => m.key === "path.actions",
    );
    expect(actions).toMatchObject({ baseline: 9, current: 10, delta: 1 });
    expect(r.comparison.findings.new).toEqual([
      "conditional-performed:normal:confirm-change-if-asked",
    ]);
    expect(r.exitCode).toBe(0); // metric changes are prominent but do not fail the run
  });

  it("3 · annotated repeated-entry fields are counted", async () => {
    const { run: r } = await run({});
    expect(r.metrics.path.repeatedEntryFields).toBe(2);
    expect(r.metrics.path.contextSwitches).toBe(2);
    const keys = r.findings.map((f: any) => f.key);
    expect(keys).toContain("repeated-entry:normal:confirm-email");
    expect(keys).toContain("repeated-entry:normal:enter-account-number");
  });

  it("4 · recovery actions stay separate from normal-path actions", async () => {
    const { run: r, exitCode } = await run({ scenario: "recovery" });
    expect(exitCode).toBe(0);
    expect(r.metrics.path.actions).toBe(9);
    expect(r.metrics.recovery.actions).toBe(2);
    expect(r.metrics.recovery.repeatedEntryFields).toBe(1);
    const ledger = JSON.parse(
      await readFile(
        path.join(runDirOf(dataDir, r.runId), "actions.json"),
        "utf8",
      ),
    );
    const err = ledger.entries.find((e: any) => e.do === "expectError");
    expect(err).toMatchObject({
      outcome: "done",
      counted: false,
      phase: "error-induction",
    });
  });

  it("5 + 11 · a broken locator stops for review, is not a product failure, and yields no completed-path deltas", async () => {
    const { run: r, exitCode } = await run({ fixtureVariant: "v3-renamed" });
    expect(exitCode).toBe(1);
    expect(r.execution.status).toBe("stopped");
    expect(r.execution.failure).toMatchObject({
      stepId: "save",
      category: "reference-path",
      rootCause: "not established",
    });
    expect(r.verification.status).toBe("unknown");
    expect(r.comparison.status).toBe("not-comparable");
    expect(r.comparison.metrics).toEqual([]);
    expect(r.comparison.partial).toMatchObject({
      stoppedAtStep: "save",
      actionsBeforeStop: 8,
    });
    const report = await readFile(
      path.join(runDirOf(dataDir, r.runId), "report.md"),
      "utf8",
    );
    expect(report).toMatch(/Not a confirmed product failure/);
  });

  it("6 · completion needs an independent assertion — a success message alone is not enough", async () => {
    const { run: r, exitCode } = await run({ fixtureVariant: "v4-no-persist" });
    expect(r.execution.status).toBe("completed"); // path ran, toast appeared
    expect(r.verification.status).toBe("fail"); // reload showed the old value
    expect(exitCode).toBe(1);
    const toastOnly = await writeTask("toast-only", (t) => {
      t.verify = [
        {
          id: "toast",
          do: "assertText",
          target: { role: "status" },
          value: "Contact details saved",
        },
      ];
    });
    await expect(run({ taskPath: toastOnly })).rejects.toThrow(
      /no independent assertion/,
    );
  });

  it("7 · a changed task definition blocks direct baseline comparison", async () => {
    const changed = await writeTask("update-contact-email", (t) => {
      t.limits.maxActions = 19;
    });
    const { run: r } = await run({ taskPath: changed });
    expect(r.execution.status).toBe("completed");
    expect(r.comparison.status).toBe("not-comparable");
    expect(r.comparison.reasons.join(" ")).toMatch(/task definition changed/);
    taskPath = await writeTask("update-contact-email"); // restore
  });

  it("9 · safety restrictions reject unauthorized mutations", async () => {
    await expect(run({ allowWrites: false })).rejects.toBeInstanceOf(
      SafetyError,
    );
    // A task that claims to be read-only but clicks Save is stopped at runtime.
    const sneaky = await writeTask("sneaky", (t) => {
      t.allowedMutations = [];
      t.setup = [];
      t.cleanup = [];
      for (const s of t.scenarios.normal.steps) delete s.mutates;
      delete t.scenarios.recovery;
      t.verify = [
        {
          id: "api",
          do: "httpJson",
          path: "/api/account",
          expect: { email: "alex@example.test" },
        },
      ];
    });
    const { run: r, exitCode } = await run({
      taskPath: sneaky,
      allowWrites: false,
    });
    expect(exitCode).toBe(1);
    expect(r.execution.failure).toMatchObject({
      stepId: "save",
      category: "safety-stop",
    });
    expect(r.safety.blockedRequests[0]).toMatchObject({
      method: "POST",
      stepId: "save",
    });
    expect(r.safety.mutationsPerformed).toEqual([]);
  });

  it("10 · every reported finding points to evidence that exists", async () => {
    const { run: r } = await run({ fixtureVariant: "v3-renamed" });
    const dir = runDirOf(dataDir, r.runId);
    const ledger = JSON.parse(
      await readFile(path.join(dir, "actions.json"), "utf8"),
    );
    expect(r.findings.length).toBeGreaterThan(0);
    for (const f of r.findings) {
      expect(f.evidence.length).toBeGreaterThan(0);
      for (const e of f.evidence) {
        expect(path.isAbsolute(e.ref)).toBe(false);
        if (e.type === "ledger")
          expect(ledger.entries[Number(e.ref.split("#")[1])]).toBeDefined();
        else if (e.type !== "run")
          expect(existsSync(path.join(dir, e.ref))).toBe(true);
      }
    }
  });

  it("12 · audits execute with no LLM call — the browser only contacts the property", async () => {
    const { run: r } = await run({});
    expect(r.exitCode).toBe(0);
    // The static import check lives in tests/scripts/task-effort-audit/config.test.ts.
    expect(r.safety.requestOrigins).toEqual([new URL(r.property.baseUrl).origin]);
  });
});
