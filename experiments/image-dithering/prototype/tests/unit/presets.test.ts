import Ajv from "ajv";
import { describe, expect, it } from "vitest";
import presets from "../../src/data/presets.json";
import schema from "../../src/data/presets.schema.json";

describe("presets.json", () => {
  // Test 14
  it("validates against presets.schema.json", () => {
    const validate = new Ajv({ allErrors: true }).compile(schema);
    const ok = validate(presets);
    expect(validate.errors ?? []).toEqual([]);
    expect(ok).toBe(true);
  });

  it("has the five materials from the brief, each marked as a starting point", () => {
    const ids = presets.materials.map((m: { id: string }) => m.id).sort();
    expect(ids).toEqual(["acrylic", "glass", "leather", "slate", "wood"]);
    for (const m of presets.materials) expect(m.status).toBe("starting-point");
  });

  it("encodes the brief's starting points", () => {
    const byId = Object.fromEntries(presets.materials.map((m: { id: string }) => [m.id, m])) as Record<string, any>;
    expect(byId.wood.settings.algorithm).toBe("jarvis");
    expect(byId.wood.settings.gamma).toBeGreaterThan(1);
    expect(byId.slate.settings.invert).toBe(true);
    expect(byId.slate.settings.contrast).toBeGreaterThan(0);
    expect(byId.acrylic.settings.mirror).toBe(true);
    expect(byId.acrylic.settings.invert).toBe(true);
    expect(byId.glass.settings.dpi).toBeLessThan(300);
    expect(byId.leather.settings.gamma).toBeGreaterThan(1);
  });

  it("is shaped for one landing page per material (slug, title, description)", () => {
    for (const m of presets.materials) {
      expect(m.page.slug).toMatch(/^[a-z0-9-]+$/);
      expect(m.page.title.length).toBeGreaterThan(0);
      expect(m.page.description.length).toBeGreaterThan(0);
    }
  });
});
