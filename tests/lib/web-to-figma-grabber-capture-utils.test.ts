import { describe, expect, it } from "vitest";
import {
  buildCaptureEnvelope,
  buildDomPath,
  clampRectToBounds,
  extractStyleSubset,
} from "@/lib/web-to-figma-grabber/capture-utils";

describe("clampRectToBounds", () => {
  it("clamps x/y to 0 and reduces width/height to fit bounds", () => {
    const rect = clampRectToBounds(
      { x: -20, y: -12, width: 420, height: 280 },
      { width: 300, height: 200 },
    );

    expect(rect).toEqual({ x: 0, y: 0, width: 300, height: 200 });
  });

  it("rounds values to integers", () => {
    const rect = clampRectToBounds(
      { x: 10.2, y: 5.6, width: 99.7, height: 21.2 },
      { width: 300, height: 200 },
    );

    expect(rect).toEqual({ x: 10, y: 6, width: 100, height: 21 });
  });
});

describe("buildDomPath", () => {
  it("builds css-like path with id and classes", () => {
    const path = buildDomPath([
      { tag: "body", index: 0 },
      { tag: "div", id: "app", index: 0 },
      { tag: "button", classes: ["cta", "primary"], index: 2 },
    ]);

    expect(path).toBe("body:nth-of-type(1) > div#app:nth-of-type(1) > button.cta.primary:nth-of-type(3)");
  });

  it("falls back to unknown segment tags", () => {
    const path = buildDomPath([{ tag: "", index: 0 }]);
    expect(path).toBe("unknown:nth-of-type(1)");
  });
});

describe("extractStyleSubset", () => {
  it("extracts only requested style keys", () => {
    const style = extractStyleSubset(
      {
        color: "rgb(0, 0, 0)",
        backgroundColor: "rgb(255, 255, 255)",
        borderRadius: "8px",
      },
      ["color", "borderRadius"],
    );

    expect(style).toEqual({ color: "rgb(0, 0, 0)", borderRadius: "8px" });
  });
});

describe("buildCaptureEnvelope", () => {
  it("builds stable payload for screenshot mode", () => {
    const envelope = buildCaptureEnvelope({
      mode: "screenshot",
      source: {
        pageUrl: "https://example.com/pricing",
        pageTitle: "Pricing",
        viewport: { width: 1440, height: 900 },
      },
      target: {
        fileKey: "abc123",
        pageName: "Captured Views",
      },
      payload: {
        selectedRect: { x: 10, y: 12, width: 320, height: 160 },
        imageDataUrl: "data:image/png;base64,AAA",
      },
      capturedAt: "2026-01-02T00:00:00.000Z",
    });

    expect(envelope).toEqual({
      schemaVersion: "1.0.0",
      mode: "screenshot",
      capturedAt: "2026-01-02T00:00:00.000Z",
      source: {
        pageUrl: "https://example.com/pricing",
        pageTitle: "Pricing",
        viewport: { width: 1440, height: 900 },
      },
      target: {
        fileKey: "abc123",
        pageName: "Captured Views",
      },
      payload: {
        selectedRect: { x: 10, y: 12, width: 320, height: 160 },
        imageDataUrl: "data:image/png;base64,AAA",
      },
    });
  });
});
