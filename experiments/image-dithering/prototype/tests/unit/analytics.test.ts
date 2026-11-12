import { describe, expect, it } from "vitest";
import { analyticsEnabledOn, downloadEvent, downloadPageview } from "../../src/lib/analytics";

const choice = {
  mode: "halftone" as const,
  effectLabel: "Round dots · 45°",
  exportFor: "laser" as const,
  material: "slate",
  sourceName: "my-kids-birthday.jpg",
};

describe("analytics (cookieless)", () => {
  it("is on only on the production host", () => {
    expect(analyticsEnabledOn("dither-halftone-generator.vercel.app")).toBe(true);
    for (const host of ["localhost", "127.0.0.1", "dither-halftone-generator-abc123-katy-beckharrisdes-projects.vercel.app", "example.com"]) {
      expect(analyticsEnabledOn(host)).toBe(false);
    }
  });

  // Vercel Pro records 2 properties per custom event (Web Analytics limits page, 2026-08):
  // keep the two that answer the experiment's question: designers vs laser makers, dither vs halftone.
  it("the download event carries exactly 2 properties: exportFor and mode", () => {
    const e = downloadEvent(choice);
    expect(e.name).toBe("png_downloaded");
    expect(e.data).toEqual({ exportFor: "laser", mode: "halftone" });
  });

  it("never includes the file name or the effect/material free text", () => {
    const s = JSON.stringify([downloadEvent(choice), downloadPageview(choice)]);
    expect(s).not.toContain("birthday");
    expect(s).not.toContain("slate");
    expect(s).not.toContain("Round dots");
  });

  // Hobby-plan fallback: custom events stop when the Pro trial ends; pageviews don't.
  it("the fallback is a page view of /downloaded/<exportFor>-<mode>", () => {
    expect(downloadPageview(choice)).toEqual({ route: "/downloaded/[kind]", path: "/downloaded/laser-halftone" });
    expect(downloadPageview({ ...choice, exportFor: "screen", mode: "dither" }).path).toBe("/downloaded/screen-dither");
  });
});
