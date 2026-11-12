import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../../src/engine/pipeline";
import { searchFor, stateFromSearch } from "../../src/lib/url";

describe("URL state", () => {
  // Test 15
  it("?material=slate loads with invert ON, exporting for laser", () => {
    const s = stateFromSearch("?material=slate");
    expect(s.exportFor).toBe("laser");
    expect(s.material).toBe("slate");
    expect(s.settings.invert).toBe(true);
  });

  it("?material=acrylic loads with mirror and invert ON", () => {
    const s = stateFromSearch("?material=acrylic");
    expect(s.settings.mirror).toBe(true);
    expect(s.settings.invert).toBe(true);
  });

  it("an unknown material falls back to the default without errors", () => {
    expect(() => stateFromSearch("?material=unobtainium")).not.toThrow();
    const s = stateFromSearch("?material=unobtainium");
    expect(s.material).toBeNull();
    expect(s.exportFor).toBe("screen");
    expect(s.settings).toEqual(DEFAULT_SETTINGS);
  });

  it("no query string is the default", () => {
    expect(stateFromSearch("").settings).toEqual(DEFAULT_SETTINGS);
    expect(stateFromSearch("").material).toBeNull();
  });

  it("writes the material back, and drops it when there is none", () => {
    expect(searchFor({ material: "slate" })).toBe("?material=slate");
    expect(searchFor({ material: null })).toBe("");
  });

  it("keeps unrelated query parameters", () => {
    expect(searchFor({ material: "wood" }, "?utm_source=x")).toBe("?utm_source=x&material=wood");
    expect(searchFor({ material: null }, "?utm_source=x&material=wood")).toBe("?utm_source=x");
  });
});
