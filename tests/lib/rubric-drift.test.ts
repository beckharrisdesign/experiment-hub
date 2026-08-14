/**
 * Drift guard: the anchor strings in lib/rubric.ts (rendered as in-place
 * legends by components/ImpactScores.tsx) must match the rubric store
 * `rules/scoring-criteria.mdc`. Edit both together or this fails.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { IMPACT_ANCHORS } from "@/lib/rubric";

const RULES_PATH = join(process.cwd(), "rules", "scoring-criteria.mdc");

/** Anchor lines (`- **N** — text`) under a `## <heading>` section. */
function anchorsUnderHeading(source: string, heading: string) {
  const section = source.split(new RegExp(`^## ${heading}`, "m"))[1];
  expect(section, `missing section "## ${heading}"`).toBeTruthy();
  const body = section.split(/^## /m)[0];
  const anchors: { score: number; text: string }[] = [];
  for (const match of body.matchAll(/^- \*\*(\d)\*\* — (.+)$/gm)) {
    anchors.push({ score: Number(match[1]), text: match[2].trim() });
  }
  return anchors;
}

describe("rubric drift guard", () => {
  const source = readFileSync(RULES_PATH, "utf8");

  const sections: [keyof typeof IMPACT_ANCHORS, string][] = [
    ["personal", "Personal Impact"],
    ["social", "Social Impact"],
    ["business", "Business Impact"],
  ];

  it.each(sections)(
    "%s anchors match rules/scoring-criteria.mdc",
    (dimension, heading) => {
      const fromRules = anchorsUnderHeading(source, heading);
      expect(fromRules).toEqual(IMPACT_ANCHORS[dimension]);
    },
  );

  it("the rules file declares the v3 scale", () => {
    expect(source).toContain("scored 1–5, total 3–15");
  });
});
