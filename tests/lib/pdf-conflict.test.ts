import { describe, it, expect } from "vitest";
import {
  compareVersions,
  driveValues,
  resolveValues,
  summarizeComparison,
} from "@/lib/pdf-conflict";

const WAS = { title: "Untitled", subject: null, author: null, keywords: ["invoice", "utilities"] };

function stateOf(fields: ReturnType<typeof compareVersions>, field: string) {
  return fields.find((f) => f.field === field)?.state;
}

describe("compareVersions (spec: a conflict resolves against the baseline)", () => {
  // The frame 34:9 example: two conflicts, one only-you, one only-Drive.
  const fields = compareVersions(
    WAS,
    { title: "March electricity invoice", subject: "Utility bill", author: null, keywords: ["invoice", "utilities", "paid", "year-2026"] },
    { title: "Electric bill — March 2026", subject: null, author: "City Utilities", keywords: ["invoice", "utilities", "unpaid"] },
  );

  it("asks only where both sides changed a field differently", () => {
    expect(stateOf(fields, "title")).toBe("conflict");
    expect(stateOf(fields, "keywords")).toBe("conflict");
  });

  it("applies a change only you made, and one only Drive made, without asking", () => {
    expect(stateOf(fields, "subject")).toBe("yours");
    expect(stateOf(fields, "author")).toBe("drive");
  });

  it("counts them as the page reports them", () => {
    expect(summarizeComparison(fields)).toEqual({ needDecision: 2, applyWithoutConflict: 2 });
  });

  it("does not call the same change on both sides a conflict", () => {
    const agreed = compareVersions(WAS, { ...WAS, title: "March" }, { ...WAS, title: "March" });
    expect(stateOf(agreed, "title")).toBe("agreed");
  });

  it("compares keywords as a set, so a reorder alone is no change", () => {
    const reordered = compareVersions(WAS, WAS, { ...WAS, keywords: ["utilities", "invoice"] });
    expect(stateOf(reordered, "keywords")).toBe("unchanged");
  });
});

describe("resolveValues", () => {
  const fields = compareVersions(
    WAS,
    { title: "Mine", subject: "Utility bill", author: null, keywords: ["invoice", "utilities", "paid"] },
    { title: "Theirs", subject: null, author: "City Utilities", keywords: ["invoice", "utilities"] },
  );

  it("refuses rather than guessing when a conflict has no choice", () => {
    expect(resolveValues(fields, {})).toEqual({ ok: false, undecided: ["title"] });
  });

  it("takes yours where only you changed, Drive's where only Drive did, and the choice where both did", () => {
    expect(resolveValues(fields, { title: "drive" })).toEqual({
      ok: true,
      values: { title: "Theirs", subject: "Utility bill", author: "City Utilities", keywords: ["invoice", "utilities", "paid"] },
    });
    expect(resolveValues(fields, { title: "yours" })).toMatchObject({ values: { title: "Mine" } });
  });

  it("discarding takes Drive's version of every field", () => {
    expect(driveValues(fields)).toEqual({
      title: "Theirs",
      subject: null,
      author: "City Utilities",
      keywords: ["invoice", "utilities"],
    });
  });
});
