import { describe, expect, it } from "vitest";
import { analyticsEnabledOn, downloadEvent } from "../../src/lib/analytics";

describe("analytics (cookieless, one event)", () => {
  it("is on only on the production host", () => {
    expect(analyticsEnabledOn("dither-halftone-generator.vercel.app")).toBe(true);
    for (const host of ["localhost", "127.0.0.1", "dither-halftone-generator-abc123-katy-beckharrisdes-projects.vercel.app", "example.com"]) {
      expect(analyticsEnabledOn(host)).toBe(false);
    }
  });

  it("the download event carries only what was chosen, never the file name or image data", () => {
    const e = downloadEvent({
      mode: "halftone",
      effectLabel: "Round dots · 45°",
      exportFor: "laser",
      material: "slate",
      sourceName: "my-kids-birthday.jpg",
    });
    expect(e.name).toBe("png_downloaded");
    expect(Object.keys(e.data).sort()).toEqual(["effect", "exportFor", "material", "mode"]);
    expect(e.data).toEqual({ mode: "halftone", effect: "Round dots · 45°", exportFor: "laser", material: "slate" });
    expect(JSON.stringify(e)).not.toContain("birthday");
  });

  it("records 'none' for material when exporting for screen", () => {
    expect(downloadEvent({ mode: "dither", effectLabel: "Atkinson", exportFor: "screen", material: null, sourceName: "x.png" }).data.material).toBe("none");
  });
});
