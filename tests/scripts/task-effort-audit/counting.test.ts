// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  createLedger,
  computeMetrics,
  flattenMetrics,
} from "../../../scripts/task-effort-audit/lib/ledger.mjs";

/**
 * The counting rules are the measurement. These pin them so a refactor can't
 * quietly change what "one action" means.
 */

type Step = Record<string, any>;
const step = (id: string, d: string, extra: Step = {}) => ({
  id,
  do: d,
  ...extra,
});

function record(entries: Array<[Step, string, string?, Record<string, any>?]>) {
  const ledger = createLedger();
  for (const [s, phase, outcome = "done", extra = {}] of entries) {
    ledger.record({ step: s, phase, outcome, at: 0, ...extra });
  }
  return ledger.entries;
}

// ---------------------------------------------------------------------------
// One operation = one action
// ---------------------------------------------------------------------------

describe("counting rules", () => {
  it("counts each click, fill, select, check, press and tab switch once", () => {
    const entries = record([
      [step("a", "click"), "path"],
      [step("b", "fill", { value: "a very long value typed in full" }), "path"],
      [step("c", "select"), "path"],
      [step("d", "check"), "path"],
      [step("e", "press", { value: "Enter" }), "path"],
      [step("f", "switchPage", { to: "main" }), "path"],
    ]);
    expect(computeMetrics(entries).path.actions).toBe(6);
  });

  it("never counts waits, assertions, reads, screenshots or verify/setup steps", () => {
    const entries = record([
      [step("w", "waitFor"), "path"],
      [step("a", "assertText"), "path"],
      [step("e", "expectError"), "path"],
      [step("r", "read"), "path"],
      [step("s", "screenshot"), "path"],
      [step("v", "reload"), "verify"],
      [step("h", "httpJson"), "verify"],
    ]);
    expect(entries.every((e: any) => e.counted === false)).toBe(true);
    expect(computeMetrics(entries).path.actions).toBe(0);
  });

  it("records scrolls separately, not as actions", () => {
    const m = computeMetrics(
      record([
        [step("s", "scroll"), "path"],
        [step("c", "click"), "path"],
      ]),
    );
    expect(m.scrolls).toBe(1);
    expect(m.path.actions).toBe(1);
  });

  it("does not count a failed action or a skipped conditional", () => {
    const m = computeMetrics(
      record([
        [step("ok", "click"), "path"],
        [
          step("cond", "click"),
          "path",
          "skipped",
          { conditional: { performed: false, reason: "r" } },
        ],
        [step("broke", "click"), "path", "failed"],
      ]),
    );
    expect(m.path.actions).toBe(1);
    expect(m.conditional).toEqual({ performed: 0, skipped: 1 });
  });

  it("counts a conditional step once when its condition was met", () => {
    const m = computeMetrics(
      record([
        [
          step("cond", "click"),
          "path",
          "done",
          { conditional: { performed: true, reason: "dialog" } },
        ],
      ]),
    );
    expect(m.path.actions).toBe(1);
    expect(m.conditional.performed).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Annotation-driven metrics and recovery separation
// ---------------------------------------------------------------------------

describe("annotated metrics", () => {
  const repeated = {
    repeatedEntry: { source: "step enter", explanation: "typed twice" },
  };
  const cs = {
    contextSwitch: { from: "a", to: "b", boundary: "new-browser-tab" },
  };

  it("counts repeated entry and context switches only from annotations", () => {
    const m = computeMetrics(
      record([
        [step("enter", "fill"), "path"],
        [step("again", "fill", { annotations: repeated }), "path"],
        [step("tab", "click", { annotations: cs }), "path"],
        [step("plain-nav", "click"), "path"],
      ]),
    );
    expect(m.path).toEqual({
      actions: 4,
      repeatedEntryFields: 1,
      contextSwitches: 1,
    });
  });

  it("keeps recovery actions separate from path actions", () => {
    const m = computeMetrics(
      record([
        [step("a", "click"), "path"],
        [step("bad", "fill"), "error-induction"],
        [step("err", "expectError"), "error-induction"],
        [step("fix", "fill", { annotations: repeated }), "recovery"],
        [step("resave", "click"), "recovery"],
      ]),
    );
    expect(m.path).toEqual({
      actions: 2,
      repeatedEntryFields: 0,
      contextSwitches: 0,
    });
    expect(m.recovery).toEqual({
      actions: 2,
      repeatedEntryFields: 1,
      contextSwitches: 0,
    });
  });

  it("produces identical metrics for identical ledgers", () => {
    const build = () =>
      record([
        [step("a", "click"), "path"],
        [step("b", "fill", { annotations: repeated }), "path"],
      ]);
    expect(flattenMetrics(computeMetrics(build()))).toEqual(
      flattenMetrics(computeMetrics(build())),
    );
  });
});
