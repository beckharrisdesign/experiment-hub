import { describe, expect, it } from "vitest";
import { CANONICAL_SITE_URL, getSiteUrl } from "./site-url";

describe("getSiteUrl", () => {
  it("falls back to the custom domain, not the vercel.app host", () => {
    expect(getSiteUrl(undefined)).toBe("https://simpleseedorganizer.app");
    expect(getSiteUrl("")).toBe(CANONICAL_SITE_URL);
  });

  it("upgrades http to https (production env is set to http://)", () => {
    expect(getSiteUrl("http://simpleseedorganizer.app")).toBe(
      "https://simpleseedorganizer.app"
    );
  });

  it("strips trailing slashes so paths join cleanly", () => {
    expect(getSiteUrl("https://simpleseedorganizer.app/")).toBe(
      "https://simpleseedorganizer.app"
    );
  });

  it("leaves localhost on http for local dev", () => {
    expect(getSiteUrl("http://localhost:3009")).toBe("http://localhost:3009");
    expect(getSiteUrl("http://127.0.0.1:3009")).toBe("http://127.0.0.1:3009");
  });

  it("falls back when the value is not a URL", () => {
    expect(getSiteUrl("simpleseedorganizer")).toBe(CANONICAL_SITE_URL);
  });

  it.each(["mailto:katy@example.com", "data:text/plain,hi", "file:///tmp/x", "ftp://simpleseedorganizer.app"])(
    "falls back for non-http(s) schemes (%s), whose origin would be \"null\"",
    (value) => {
      expect(getSiteUrl(value)).toBe(CANONICAL_SITE_URL);
    }
  );
});
