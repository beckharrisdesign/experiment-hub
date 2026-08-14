/**
 * scoring-impact-rubric: the /scoring, /heuristics, and /harness doc pages
 * were removed (they restated rules/ and skills/ content). Guard against the
 * routes or their dead dependencies quietly returning.
 */
import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";

const gone = [
  "app/scoring",
  "app/heuristics",
  "app/harness",
  "components/ExperimentScores.tsx",
  "lib/agent-rubrics.ts",
];

describe("removed doc pages stay removed", () => {
  it.each(gone)("%s does not exist", (relPath) => {
    expect(existsSync(join(process.cwd(), relPath))).toBe(false);
  });
});
