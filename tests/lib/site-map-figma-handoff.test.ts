import { describe, expect, it } from "vitest";
import {
  buildFigmaLayout,
  buildFigmaMcpPrompt,
  normalizeForFigmaId,
} from "@/scripts/site-map-figma-handoff";

describe("normalizeForFigmaId", () => {
  it("creates stable figma-safe identifiers", () => {
    expect(normalizeForFigmaId("https://example.com/experiments/test-page")).toBe(
      "https-example-com-experiments-test-page"
    );
  });
});

describe("buildFigmaLayout", () => {
  it("positions nodes by depth and preserves parent linkage", () => {
    const nodes = [
      {
        id: "n1",
        label: "Home",
        url: "https://example.com/",
        path: "/",
        parentUrl: null,
        depth: 0,
        status: 200,
        screenshotPath: "/tmp/index.png",
      },
      {
        id: "n2",
        label: "Workflow",
        url: "https://example.com/workflow",
        path: "/workflow",
        parentUrl: "https://example.com/",
        depth: 1,
        status: 200,
        screenshotPath: "/tmp/workflow.png",
      },
    ];

    const layout = buildFigmaLayout({
      nodes,
      framePadding: 120,
      horizontalGap: 380,
      verticalGap: 260,
      cardWidth: 320,
      cardHeight: 200,
    });

    expect(layout.nodes).toHaveLength(2);
    expect(layout.edges).toHaveLength(1);
    expect(layout.nodes[0].x).toBe(120);
    expect(layout.nodes[0].y).toBe(120);
    expect(layout.nodes[1].x).toBe(500);
    expect(layout.nodes[1].y).toBe(120);
    expect(layout.edges[0].from).toBe("https://example.com/");
    expect(layout.edges[0].to).toBe("https://example.com/workflow");
  });
});

describe("buildFigmaMcpPrompt", () => {
  it("includes manifest and frame guidance", () => {
    const prompt = buildFigmaMcpPrompt({
      frameName: "Experiment Hub Sitemap",
      manifestPath: "artifacts/site-map/run-1/figma-mcp-manifest.json",
      screenshotDirectory: "artifacts/site-map/run-1/screenshots",
    });

    expect(prompt).toContain("Experiment Hub Sitemap");
    expect(prompt).toContain("figma-mcp-manifest.json");
    expect(prompt).toContain("screenshots");
  });
});
