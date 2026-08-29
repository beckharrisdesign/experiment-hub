import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import {
  parseTasks,
  evidenceKindFor,
  evidenceSummary,
  progress,
} from "@/lib/change-visualizer/tasks";

const repo = process.cwd();
const read = (p: string) => readFileSync(path.join(repo, p), "utf8");

describe("parseTasks", () => {
  it("reads done, open and partial checkboxes", () => {
    const parsed = parseTasks(
      ["## 1. User outcomes", "- [x] 1.1 Done", "- [ ] 1.2 Open", "- [~] 1.3 Partial"].join("\n"),
    );
    expect(parsed.outcomes.map((o) => o.state)).toEqual(["done", "open", "partial"]);
  });

  it("captures back-references from a (→ 1.4, 1.5) pointer", () => {
    const parsed = parseTasks(
      ["## 4. QA", "- [x] 4.2 Automated (tests/lib/foo.test.ts, 19 tests) (→ 1.4, 1.5, 1.10)"].join("\n"),
    );
    expect(parsed.items[0].refs).toEqual(["1.4", "1.5", "1.10"]);
  });

  it("keeps an item that carries no id, rather than dropping it", () => {
    const parsed = parseTasks(["## 2. Work", "- [ ] Something with no number"].join("\n"));
    expect(parsed.items).toHaveLength(1);
    expect(parsed.items[0].id).toBe("");
  });

  it("does not count id-less items in progress", () => {
    const parsed = parseTasks(
      ["## 2. Work", "- [x] 2.1 Counted", "- [ ] Not counted"].join("\n"),
    );
    expect(progress(parsed).total).toBe(1);
  });
});

describe("evidenceKindFor", () => {
  const items = (md: string) => parseTasks(md).items;

  it("ranks a named test file above everything else", () => {
    const md = [
      "## 3. Implementation",
      "- [x] 3.1 Build the thing (→ 1.1)",
      "## 4. QA",
      "- [x] 4.1 Automated (tests/lib/thing.test.ts) (→ 1.1)",
    ].join("\n");
    expect(evidenceKindFor("1.1", items(md))).toBe("automated test");
  });

  it("calls an authoring-time check human review", () => {
    const md = ["## 4. QA", "- [ ] 4.4 Content review (Katy, authoring-time) (→ 1.6)"].join("\n");
    expect(evidenceKindFor("1.6", items(md))).toBe("human review");
  });

  it("calls a deferred item deferred, not a code path", () => {
    const md = ["## 3. Implementation", "- [ ] 3.6 Adapter — DEFERRED for now (→ 1.11)"].join("\n");
    expect(evidenceKindFor("1.11", items(md))).toBe("deferred");
  });

  it("falls back to code path for a plain implementation item", () => {
    const md = ["## 3. Implementation", "- [x] 3.2 Wire the reader (→ 1.9)"].join("\n");
    expect(evidenceKindFor("1.9", items(md))).toBe("code path");
  });

  it("says not stated when nothing points at the outcome", () => {
    const md = ["## 3. Implementation", "- [x] 3.2 Unrelated (→ 1.9)"].join("\n");
    expect(evidenceKindFor("1.4", items(md))).toBe("not stated");
  });
});

describe("against the real repo", () => {
  it("derives tell-the-story's evidence split from its back-references", () => {
    const parsed = parseTasks(read("openspec/changes/tell-the-story/tasks.md"));
    expect(parsed.outcomesAreScenarios).toBe(true);
    expect(parsed.outcomes).toHaveLength(11);

    // Every checked outcome is claimed by a test; the three open ones are
    // precisely the ones no test could settle. This is the *claim* recorded in
    // tasks.md, not an independent audit of the test suite.
    expect(evidenceSummary(parsed)).toEqual({
      "automated test": 8,
      "code path": 0,
      "human review": 2,
      deferred: 1,
      "not stated": 0,
    });
    expect(evidenceKindFor("1.6", parsed.items)).toBe("human review");
    expect(evidenceKindFor("1.7", parsed.items)).toBe("human review");
    expect(evidenceKindFor("1.11", parsed.items)).toBe("deferred");
  });

  it("refuses to treat pdf-metadata-viewer-cloud's workstreams as outcomes", () => {
    const parsed = parseTasks(read("openspec/changes/pdf-metadata-viewer-cloud/tasks.md"));
    expect(parsed.outcomesAreScenarios).toBe(false);
    expect(parsed.outcomes).toHaveLength(0);
    // The honest total is still available when the split is not.
    expect(progress(parsed).total).toBeGreaterThan(60);
  });
});
