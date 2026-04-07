import { describe, expect, it } from "vitest";
import {
  buildLauncherBookmarklet,
  createFigmaCaptureBootstrapSnippet,
  getHostedCaptureUrls,
} from "@/lib/web-to-figma-grabber/script-launch";

describe("getHostedCaptureUrls", () => {
  it("returns launcher and capture urls rooted at origin", () => {
    const urls = getHostedCaptureUrls("https://labs.beckharrisdesign.com");
    expect(urls).toEqual({
      launcherUrl: "https://labs.beckharrisdesign.com/lib/figma-capture-launcher.js",
      captureScriptUrl: "https://labs.beckharrisdesign.com/lib/capture.js",
    });
  });

  it("trims trailing slash from origin", () => {
    const urls = getHostedCaptureUrls("https://labs.beckharrisdesign.com/");
    expect(urls.launcherUrl).toBe(
      "https://labs.beckharrisdesign.com/lib/figma-capture-launcher.js",
    );
  });
});

describe("buildLauncherBookmarklet", () => {
  it("builds a bookmarklet that injects launcher and config", () => {
    const bookmarklet = buildLauncherBookmarklet(
      "https://labs.beckharrisdesign.com/lib/figma-capture-launcher.js",
      {
        mode: "clipboard",
        selector: "body",
      },
    );

    expect(bookmarklet.startsWith("javascript:")).toBe(true);
    expect(bookmarklet).toContain("__FIGMA_CAPTURE_CONFIG");
    expect(bookmarklet).toContain(
      "https://labs.beckharrisdesign.com/lib/figma-capture-launcher.js",
    );
    expect(bookmarklet).toContain("\"mode\":\"clipboard\"");
  });
});

describe("createFigmaCaptureBootstrapSnippet", () => {
  it("builds snippet that injects source script and hash", () => {
    const snippet = createFigmaCaptureBootstrapSnippet({
      captureId: "abc123",
      endpoint: "https://mcp.figma.com/mcp",
      sourceUrl: "https://labs.beckharrisdesign.com/lib/capture.js",
    });
    expect(snippet).toContain('figmacapture&figmacapture=abc123');
    expect(snippet).toContain(
      's.src="https://labs.beckharrisdesign.com/lib/capture.js"',
    );
  });
});
import { describe, expect, it } from "vitest";
import {
  buildLauncherBookmarklet,
  getHostedCaptureUrls,
} from "@/lib/web-to-figma-grabber/script-launch";

describe("getHostedCaptureUrls", () => {
  it("returns launcher and capture urls rooted at origin", () => {
    const urls = getHostedCaptureUrls("https://labs.beckharrisdesign.com");
    expect(urls).toEqual({
      launcherUrl: "https://labs.beckharrisdesign.com/lib/figma-capture-launcher.js",
      captureScriptUrl: "https://labs.beckharrisdesign.com/lib/capture.js",
    });
  });

  it("trims trailing slash from origin", () => {
    const urls = getHostedCaptureUrls("https://labs.beckharrisdesign.com/");
    expect(urls.launcherUrl).toBe(
      "https://labs.beckharrisdesign.com/lib/figma-capture-launcher.js",
    );
  });
});

describe("buildLauncherBookmarklet", () => {
  it("builds a bookmarklet that injects launcher and config", () => {
    const bookmarklet = buildLauncherBookmarklet(
      "https://labs.beckharrisdesign.com/lib/figma-capture-launcher.js",
      {
        mode: "clipboard",
        selector: "body",
      },
    );

    expect(bookmarklet.startsWith("javascript:")).toBe(true);
    expect(bookmarklet).toContain("__FIGMA_CAPTURE_CONFIG");
    expect(bookmarklet).toContain(
      "https://labs.beckharrisdesign.com/lib/figma-capture-launcher.js",
    );
    expect(bookmarklet).toContain("\"mode\":\"clipboard\"");
  });
});
