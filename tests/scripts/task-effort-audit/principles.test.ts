// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  definitionHash,
  parseTaskAndProperty,
} from "../../../scripts/task-effort-audit/lib/config.mjs";
import {
  loadCatalog,
  summarizePrinciples,
} from "../../../scripts/task-effort-audit/lib/principles.mjs";
import { buildFindings } from "../../../scripts/task-effort-audit/lib/findings.mjs";
import { rawProperty, rawTask } from "./helpers";

/**
 * MVDS principle tags: optional ids on steps and scenarios that must resolve
 * against the committed MVDS catalog. They label evidence; they never change
 * what runs or what counts, so they stay out of the definition hash.
 */

const catalog = loadCatalog();

function tagged(stepTags?: string[], scenarioTags?: string[]) {
  const t: any = rawTask();
  if (stepTags) t.scenarios.normal.steps[2].principles = stepTags;
  if (scenarioTags) t.scenarios.normal.principles = scenarioTags;
  return t;
}

const problemsOf = (task: any) => {
  try {
    parseTaskAndProperty(task, rawProperty());
    return [];
  } catch (e: any) {
    return e.problems as string[];
  }
};

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

describe("MVDS catalog snapshot", () => {
  it("records which MVDS commit it came from", () => {
    expect(catalog.mvdsCommit).toMatch(/^[0-9a-f]{7,40}$/);
  });

  it("carries the ten Nielsen heuristics, each with a checkable source url", () => {
    const nng = catalog.principles.filter(
      (p: any) => p.source?.name === "Nielsen Norman Group",
    );
    expect(nng).toHaveLength(10);
    expect(
      nng.every(
        (p: any) =>
          p.checkKind === "guiding" && /^https:\/\//.test(p.source.url),
      ),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Validation: declarations must resolve
// ---------------------------------------------------------------------------

describe("principle tags in task config", () => {
  it("accepts guiding principles on steps and scenarios", () => {
    expect(
      problemsOf(tagged(["error-prevention"], ["user-control-and-freedom"])),
    ).toEqual([]);
  });

  it("rejects an id that is not in the MVDS catalog", () => {
    expect(problemsOf(tagged(["be-nice"])).join("\n")).toMatch(
      /"be-nice" is not in the MVDS principle catalog/,
    );
  });

  it("rejects principles MVDS already enforces in code", () => {
    expect(problemsOf(tagged(["no-margin-spacing"])).join("\n")).toMatch(
      /enforced in code by MVDS/,
    );
  });

  it("rejects duplicate tags", () => {
    expect(
      problemsOf(tagged(["error-prevention", "error-prevention"])).join("\n"),
    ).toMatch(/duplicate principle/);
  });

  it("validates tags on verify steps too", () => {
    const t: any = rawTask();
    t.verify[1].principles = ["nope"];
    expect(problemsOf(t).join("\n")).toMatch(
      /"nope" is not in the MVDS principle catalog/,
    );
  });

  it("does not change the definition hash, so existing baselines stay comparable", () => {
    const plain = parseTaskAndProperty(rawTask(), rawProperty()).task;
    const withTags = parseTaskAndProperty(
      tagged(["error-prevention"], ["user-control-and-freedom"]),
      rawProperty(),
    ).task;
    expect(definitionHash(withTags, "normal")).toBe(
      definitionHash(plain, "normal"),
    );
  });
});

// ---------------------------------------------------------------------------
// Findings and the run summary
// ---------------------------------------------------------------------------

describe("tag scoping", () => {
  const entries = [
    { index: 0, stepId: "typo", counted: true, phase: "error-induction", outcome: "done", target: "f", principles: ["error-prevention"] },
    { index: 1, stepId: "err", do: "expectError", counted: false, phase: "error-induction", outcome: "done", target: "alert", principles: ["error-recovery"] },
    { index: 2, stepId: "fix", counted: true, phase: "recovery", outcome: "done", target: "f" },
    { index: 3, stepId: "dialog", counted: false, phase: "recovery", outcome: "skipped", target: "d", principles: ["consistency-and-standards"], conditional: { performed: false, reason: "r" } },
  ];
  const findings = buildFindings({ taskId: "t", scenario: "recovery", entries, failure: null, verification: { assertions: [] }, catalog });

  it("doesn't give the recovery finding the tags of the step that caused the error, or of skipped steps", () => {
    const recovery = findings.find((f: any) => f.key === "recovery:recovery");
    expect(recovery.principles.map((p: any) => p.id)).toEqual(["error-recovery"]);
  });

  it("leaves skipped steps out of the evidence summary", () => {
    const ids = summarizePrinciples({ entries, findings, verification: { assertions: [] }, catalog }).map((p: any) => p.id);
    expect(ids).not.toContain("consistency-and-standards");
  });
});

describe("principles on findings", () => {
  const entries = [
    {
      index: 0,
      stepId: "confirm",
      counted: true,
      phase: "path",
      target: 'field "Confirm"',
      annotations: { repeatedEntry: { source: "s", explanation: "e" } },
      principles: ["recognition-rather-than-recall"],
    },
    {
      index: 1,
      stepId: "err",
      do: "expectError",
      counted: false,
      outcome: "done",
      phase: "error-induction",
      target: "alert",
      principles: ["error-recovery"],
    },
    {
      index: 2,
      stepId: "fix",
      counted: true,
      phase: "recovery",
      target: 'field "Confirm"',
    },
  ];
  const verification = {
    assertions: [
      {
        stepId: "persisted",
        outcome: "failed",
        observed: "old value",
        ledgerIndex: 3,
        principles: ["visibility-of-system-status"],
      },
    ],
  };
  const findings = buildFindings({
    taskId: "t",
    scenario: "recovery",
    entries,
    failure: null,
    verification,
    catalog,
    scenarioPrinciples: ["user-control-and-freedom"],
  });
  const byKey = Object.fromEntries(
    findings.map((f: any) => [f.key.split(":")[0], f]),
  );

  it("resolves a step's tags onto its finding, with title and source", () => {
    expect(byKey["repeated-entry"].principles).toEqual([
      expect.objectContaining({
        id: "recognition-rather-than-recall",
        title: expect.any(String),
        source: expect.objectContaining({
          name: "Nielsen Norman Group",
          url: expect.stringMatching(/^https:/),
        }),
      }),
    ]);
  });

  it("gives the recovery finding the scenario's tags plus its steps' tags", () => {
    expect(byKey.recovery.principles.map((p: any) => p.id)).toEqual([
      "user-control-and-freedom",
      "error-recovery",
    ]);
  });

  it("gives a failed verification its verify step's tags", () => {
    expect(
      byKey["verification-failed"].principles.map((p: any) => p.id),
    ).toEqual(["visibility-of-system-status"]);
  });

  it("summarizes which steps and findings are evidence for each principle", () => {
    const summary = summarizePrinciples({
      entries,
      findings,
      verification,
      scenarioPrinciples: ["user-control-and-freedom"],
      catalog,
    });
    const ids = summary.map((s: any) => s.id);
    expect(ids).toEqual([
      "user-control-and-freedom",
      "recognition-rather-than-recall",
      "error-recovery",
      "visibility-of-system-status",
    ]);
    const recall = summary.find(
      (s: any) => s.id === "recognition-rather-than-recall",
    );
    expect(recall.steps).toEqual(["confirm"]);
    expect(recall.findings).toEqual([byKey["repeated-entry"].id]);
  });
});
