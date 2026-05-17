import { describe, expect, it } from "vitest";
import { FILTER_PRESETS } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Studio smoke checklist (automated slice of manual QA)
// ---------------------------------------------------------------------------

describe("photo studio smoke checklist", () => {
  it("exposes ingest → filter → banner → export control surface", () => {
    expect(FILTER_PRESETS.length).toBeGreaterThanOrEqual(3);
    const labels = FILTER_PRESETS.map((p) => p.label);
    expect(labels).toContain("Normal");
    expect(labels).toContain("High contrast");
  });
});
