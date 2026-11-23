import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import { DECISION_TAGS, parseVocabulary } from "@/lib/pdf-taxonomy";

const real = readFileSync(
  path.join(process.cwd(), "config", "pdf-metadata-viewer", "tag-vocabulary.md"),
  "utf-8",
);

describe("parseVocabulary", () => {
  it("reads every section of the real vocabulary file", () => {
    const v = parseVocabulary(real);
    expect(v.documentTypes).toContain("receipt");
    expect(v.documentTypes).toContain("invoice");
    expect(v.categories.length).toBeGreaterThan(0);
    expect(v.actions.length).toBeGreaterThan(0);
    expect(v.specials.length).toBeGreaterThan(0);
  });

  // design.md: these record a decision about a document, not its content, and
  // become columns. A model choosing them from page imagery was always noise.
  it("never offers the four decision tags", () => {
    const v = parseVocabulary(real);
    const offered = [...v.documentTypes, ...v.categories, ...v.actions, ...v.statuses, ...v.specials];
    for (const tag of DECISION_TAGS) expect(offered).not.toContain(tag);
  });

  it("skips table headers and separators", () => {
    const v = parseVocabulary(
      "### 1. DOCUMENT TYPE TAGS\n| Tag Slug | D |\n|---|---|\n| `receipt` | x |\n### 2. CATEGORY TAGS\n",
    );
    expect(v.documentTypes).toEqual(["receipt"]);
  });
});
