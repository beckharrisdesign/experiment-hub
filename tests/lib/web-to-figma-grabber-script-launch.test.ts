import { describe, expect, it } from "vitest";
import {
  buildLauncherBookmarklet,
  createOneClickClipboardSnippet,
  getHostedCaptureUrls,
} from "@/lib/web-to-figma-grabber/script-launch";

describe("getHostedCaptureUrls", () => {
  it("returns launcher and capture urls rooted at origin", () => {
    const urls = getHostedCaptureUrls("https://labs.beckharrisdesign.com");
    expect(urls).toEqual({
      launcherUrl: "https://labs.beckharrisdesign.com/scripts/web-to-figma-grabber-loader.js",
      captureScriptUrl: "https://labs.beckharrisdesign.com/lib/capture.js",
      bookmarkletLoaderUrl:
        "https://labs.beckharrisdesign.com/scripts/web-to-figma-grabber-bookmarklet.js",
    });
  });

  it("trims trailing slash from origin", () => {
    const urls = getHostedCaptureUrls("https://labs.beckharrisdesign.com/");
    expect(urls.launcherUrl).toBe(
      "https://labs.beckharrisdesign.com/scripts/web-to-figma-grabber-loader.js",
    );
  });
});

describe("buildLauncherBookmarklet", () => {
  it("builds a bookmarklet that injects launcher", () => {
    const bookmarklet = buildLauncherBookmarklet(
      "https://labs.beckharrisdesign.com/scripts/web-to-figma-grabber-loader.js",
    );

    expect(bookmarklet.startsWith("javascript:")).toBe(true);
    expect(bookmarklet).toContain(
      "https://labs.beckharrisdesign.com/scripts/web-to-figma-grabber-loader.js",
    );
  });
});

describe("createOneClickClipboardSnippet", () => {
  it("creates one-line snippet for quick clipboard capture", () => {
    const snippet = createOneClickClipboardSnippet(
      "https://labs.beckharrisdesign.com/scripts/web-to-figma-grabber-loader.js",
    );
    expect(snippet).toContain("window.__FIGMA_CAPTURE_CONFIG");
    expect(snippet).toContain('{mode:"clipboard",selector:"*"}');
    expect(snippet).toContain(
      's.src="https://labs.beckharrisdesign.com/scripts/web-to-figma-grabber-loader.js"',
    );
  });
});
