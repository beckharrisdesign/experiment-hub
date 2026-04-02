import { describe, expect, it } from "vitest";
import {
  canonicalizeUrl,
  isCrawlableUrl,
  toScreenshotFileName,
} from "@/scripts/site-map-utils";

describe("canonicalizeUrl", () => {
  it("normalizes relative links to the same origin", () => {
    expect(canonicalizeUrl("https://example.com", "/about")).toBe(
      "https://example.com/about"
    );
  });

  it("removes query strings and hash fragments by default", () => {
    expect(
      canonicalizeUrl("https://example.com", "/about?foo=1#heading")
    ).toBe("https://example.com/about");
  });

  it("keeps the root path canonicalized", () => {
    expect(canonicalizeUrl("https://example.com", "/")).toBe(
      "https://example.com/"
    );
  });

  it("drops trailing slash for non-root paths", () => {
    expect(canonicalizeUrl("https://example.com", "/docs/")).toBe(
      "https://example.com/docs"
    );
  });
});

describe("isCrawlableUrl", () => {
  const origin = "https://example.com";

  it("accepts same-origin app pages", () => {
    expect(isCrawlableUrl("https://example.com/workflow", origin)).toBe(true);
  });

  it("rejects external origins", () => {
    expect(isCrawlableUrl("https://other.com/workflow", origin)).toBe(false);
  });

  it("rejects api routes", () => {
    expect(isCrawlableUrl("https://example.com/api/health", origin)).toBe(
      false
    );
  });

  it("rejects static assets", () => {
    expect(
      isCrawlableUrl("https://example.com/images/logo.png", origin)
    ).toBe(false);
  });

  it("rejects non-http protocols", () => {
    expect(isCrawlableUrl("mailto:me@example.com", origin)).toBe(false);
    expect(isCrawlableUrl("javascript:void(0)", origin)).toBe(false);
    expect(isCrawlableUrl("tel:+18005551212", origin)).toBe(false);
  });
});

describe("toScreenshotFileName", () => {
  it("maps root path to index", () => {
    expect(toScreenshotFileName("https://example.com/")).toBe("index.png");
  });

  it("creates a stable filename for nested pages", () => {
    expect(toScreenshotFileName("https://example.com/experiments/test")).toBe(
      "experiments__test.png"
    );
  });
});
