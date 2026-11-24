// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import {
  definitionHash,
  parseTaskAndProperty,
  resolveTemplate,
} from "../../../scripts/task-effort-audit/lib/config.mjs";
import { rawProperty, rawTask } from "./helpers";

const parse = (task: any, prop: any = rawProperty()) =>
  parseTaskAndProperty(task, prop);
const problemsOf = (task: any, prop: any = rawProperty()) => {
  try {
    parse(task, prop);
    return [];
  } catch (e: any) {
    return e.problems as string[];
  }
};

// ---------------------------------------------------------------------------
// Completion requires an independent assertion
// ---------------------------------------------------------------------------

describe("verification rules", () => {
  it("accepts an assertion made after a reload", () => {
    expect(problemsOf(rawTask())).toEqual([]);
  });

  it("rejects a verify block that only checks the toast left by the path", () => {
    const task = rawTask({
      verify: [
        {
          id: "toast",
          do: "assertText",
          target: { role: "status" },
          value: "Saved",
        },
      ],
    });
    expect(problemsOf(task).join("\n")).toMatch(/no independent assertion/);
  });

  it("rejects a scenario with no verify at all", () => {
    expect(problemsOf(rawTask({ verify: undefined })).join("\n")).toMatch(
      /requires an independent success assertion/,
    );
  });

  it("accepts an httpJson state check as independent", () => {
    const task = rawTask({
      verify: [
        {
          id: "api",
          do: "httpJson",
          path: "/api/thing",
          expect: { value: "new" },
        },
      ],
    });
    expect(problemsOf(task)).toEqual([]);
  });

  it("does not allow counted actions inside verify", () => {
    const task = rawTask({
      verify: [
        { id: "reload", do: "reload" },
        { id: "click", do: "click", target: { role: "button", name: "Open" } },
        { id: "check", do: "assertVisible", target: { testId: "x" } },
      ],
    });
    expect(problemsOf(task).join("\n")).toMatch(/not allowed in verify/);
  });
});

// ---------------------------------------------------------------------------
// Path and annotation rules
// ---------------------------------------------------------------------------

describe("path rules", () => {
  const withSteps = (steps: any[], kind = "normal") =>
    rawTask({ scenarios: { normal: { kind, steps } } });

  it("rejects goto in the reviewed path (it would bypass UI work)", () => {
    expect(
      problemsOf(withSteps([{ id: "jump", do: "goto", path: "/x" }])).join(
        "\n",
      ),
    ).toMatch(/only allowed in verify/);
  });

  it("requires repeated-entry annotations on a field-entry step, with a source", () => {
    const onClick = withSteps([
      {
        id: "c",
        do: "click",
        target: { role: "button", name: "Go" },
        annotations: { repeatedEntry: { source: "s", explanation: "e" } },
      },
    ]);
    expect(problemsOf(onClick).join("\n")).toMatch(
      /only applies to fill\/select/,
    );
    const noSource = withSteps([
      {
        id: "f",
        do: "fill",
        target: { label: "X" },
        value: "v",
        annotations: { repeatedEntry: { explanation: "e" } },
      },
    ]);
    expect(problemsOf(noSource).join("\n")).toMatch(/source/);
  });

  it("requires a documented boundary for a context switch", () => {
    const task = withSteps([
      {
        id: "c",
        do: "click",
        target: { role: "link", name: "Help" },
        annotations: {
          contextSwitch: { from: "a", to: "b", boundary: "somewhere" },
        },
      },
    ]);
    expect(problemsOf(task).join("\n")).toMatch(/boundary/);
  });

  it("rejects recovery phases outside a recovery scenario", () => {
    const task = withSteps([
      {
        id: "f",
        do: "fill",
        target: { label: "X" },
        value: "v",
        phase: "recovery",
      },
    ]);
    expect(problemsOf(task).join("\n")).toMatch(
      /only allowed in a recovery scenario/,
    );
  });

  it("requires a recovery scenario to confirm the intended error before recovery steps", () => {
    const task = withSteps(
      [
        {
          id: "bad",
          do: "fill",
          target: { label: "X" },
          value: "oops",
          phase: "error-induction",
        },
        {
          id: "fix",
          do: "fill",
          target: { label: "X" },
          value: "ok",
          phase: "recovery",
        },
      ],
      "recovery",
    );
    expect(problemsOf(task).join("\n")).toMatch(
      /must follow the expectError step/,
    );
  });

  it("rejects template references to undefined data or values not yet read", () => {
    const task = withSteps([
      { id: "a", do: "fill", target: { label: "X" }, value: "{{data.nope}}" },
      { id: "b", do: "fill", target: { label: "Y" }, value: "{{saved.later}}" },
    ]);
    const p = problemsOf(task).join("\n");
    expect(p).toMatch(/data\.nope/);
    expect(p).toMatch(/saved\.later/);
  });

  it("rejects mutations that are not in allowedMutations", () => {
    const task = withSteps([
      {
        id: "s",
        do: "click",
        target: { role: "button", name: "Save" },
        mutates: "other.thing",
      },
    ]);
    expect(problemsOf(task).join("\n")).toMatch(
      /not listed in allowedMutations/,
    );
  });
});

// ---------------------------------------------------------------------------
// Definition hash — decides baseline compatibility
// ---------------------------------------------------------------------------

describe("definition hash", () => {
  const hashOf = (raw: any, scenario = "normal") =>
    definitionHash(parse(raw).task, scenario);

  it("is stable for the same definition", () => {
    expect(hashOf(rawTask())).toBe(hashOf(rawTask()));
  });

  it("changes when a step changes", () => {
    const changed = rawTask();
    (changed.scenarios as any).normal.steps[0].target.name = "Things";
    expect(hashOf(changed)).not.toBe(hashOf(rawTask()));
  });

  it("changes when limits, viewport or comparison context change", () => {
    expect(hashOf(rawTask({ comparisonContext: "v2" }))).not.toBe(
      hashOf(rawTask()),
    );
    expect(hashOf(rawTask({ viewport: { width: 390, height: 844 } }))).not.toBe(
      hashOf(rawTask()),
    );
  });

  it("ignores editorial fields (task name, descriptions, notes)", () => {
    const edited = rawTask({ name: "Renamed", notes: "hello" });
    (edited.scenarios as any).normal.description = "words";
    (edited.scenarios as any).normal.steps[0].note = "a note";
    expect(hashOf(edited)).toBe(hashOf(rawTask()));
  });

  it("is per scenario — editing another scenario does not break this one's baseline", () => {
    const withRecovery = (extra: string) =>
      rawTask({
        scenarios: {
          ...(rawTask().scenarios as any),
          recovery: {
            kind: "recovery",
            steps: [
              {
                id: "bad",
                do: "fill",
                target: { label: "Value" },
                value: extra,
                phase: "error-induction",
              },
              { id: "err", do: "expectError", target: { role: "alert" } },
              {
                id: "fix",
                do: "fill",
                target: { label: "Value" },
                value: "ok",
                phase: "recovery",
              },
            ],
          },
        },
      });
    expect(hashOf(withRecovery("x"))).toBe(hashOf(withRecovery("y")));
    expect(hashOf(withRecovery("x"), "recovery")).not.toBe(
      hashOf(withRecovery("y"), "recovery"),
    );
  });
});

// ---------------------------------------------------------------------------
// Templates and the shipped example
// ---------------------------------------------------------------------------

describe("templates", () => {
  it("marks runtime values (saved/env) as not loggable", () => {
    expect(resolveTemplate("{{data.a}}", { data: { a: "x" } })).toEqual({
      value: "x",
      loggable: true,
    });
    expect(resolveTemplate("{{saved.n}}", { saved: { n: "42" } })).toEqual({
      value: "42",
      loggable: false,
    });
  });
});

describe("shipped example task", () => {
  it("validates", () => {
    const dir = path.resolve(
      __dirname,
      "../../../scripts/task-effort-audit/audits",
    );
    const task = JSON.parse(
      readFileSync(path.join(dir, "tasks/update-contact-email.json"), "utf8"),
    );
    const prop = JSON.parse(
      readFileSync(path.join(dir, "properties/local-fixture.json"), "utf8"),
    );
    expect(Object.keys((parse(task, prop).task as any).scenarios)).toEqual([
      "normal",
      "recovery",
    ]);
  });
});

// ---------------------------------------------------------------------------
// No LLM in the audit runtime (acceptance criterion 12)
// ---------------------------------------------------------------------------

describe("runtime dependencies", () => {
  it("imports no LLM SDK anywhere in the audit tool", () => {
    const root = path.resolve(__dirname, "../../../scripts/task-effort-audit");
    const files: string[] = [];
    const walk = (d: string) => {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        if (e.isDirectory()) walk(path.join(d, e.name));
        else if (e.name.endsWith(".mjs")) files.push(path.join(d, e.name));
      }
    };
    walk(root);
    expect(files.length).toBeGreaterThan(5);
    const offenders = files.filter((f) =>
      /from\s+['"](@anthropic-ai|openai|@experiment-hub\/ai-utils|@google\/generative-ai)/.test(
        readFileSync(f, "utf8"),
      ),
    );
    expect(offenders).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// nth and templates in targets
// ---------------------------------------------------------------------------

describe("targets with nth and templates", () => {
  const withSteps = (steps: any[], verify?: any[]) =>
    rawTask({ allowedMutations: [], scenarios: { normal: { kind: "normal", steps, ...(verify ? { verify } : {}) } } });
  const read = { id: "read-first", do: "read", target: { role: "button", nth: 0, within: { role: "row", name: "Doc", exact: false } }, saveAs: "keyword" };

  it("accepts nth and a saved value used in a later target and a verify path", () => {
    const task = withSteps(
      [read, { id: "pick", do: "click", target: { role: "button", name: "{{saved.keyword}}" } }],
      [
        { id: "load", do: "goto", path: "/list?kw={{saved.keyword}}" },
        { id: "chip", do: "assertVisible", target: { role: "button", name: "Remove {{saved.keyword}}" } },
      ],
    );
    expect(problemsOf(task)).toEqual([]);
  });

  it("rejects a target that uses a value not read yet", () => {
    const task = withSteps([{ id: "pick", do: "click", target: { role: "button", name: "{{saved.keyword}}" } }, read]);
    expect(problemsOf(task).join("\n")).toMatch(/\{\{saved\.keyword\}\} is not saved by an earlier read step/);
  });

  it("rejects a verify step that uses a value the path never reads", () => {
    const task = withSteps(
      [{ id: "open", do: "click", target: { role: "link", name: "Thing" } }],
      [{ id: "load", do: "goto", path: "/list?kw={{saved.nope}}" }, { id: "x", do: "assertVisible", target: { text: "x" } }],
    );
    expect(problemsOf(task).join("\n")).toMatch(/\{\{saved\.nope\}\} is not saved by a read step in the path/);
  });

  it("rejects a negative nth", () => {
    const task = withSteps([{ id: "open", do: "click", target: { role: "link", name: "Thing", nth: -1 } }]);
    expect(problemsOf(task).length).toBeGreaterThan(0);
  });
});
