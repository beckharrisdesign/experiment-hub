import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";
import { metadata as rootMetadata } from "@/app/layout";
import { metadata as homeMetadata } from "@/app/page";
import { metadata as pricingMetadata } from "@/app/pricing/layout";
import { metadata as termsMetadata } from "@/app/terms/page";
import { metadata as privacyMetadata } from "@/app/privacy/page";

// The same pages are served on simple-seed-organizer.vercel.app and
// simpleseedorganizer.app. Every indexable URL must name the custom domain
// over https, so Google keeps one copy.
const ORIGIN = "https://simpleseedorganizer.app";

describe("sitemap and robots", () => {
  it("lists only https URLs on the custom domain", () => {
    const urls = sitemap().map((entry) => entry.url);
    expect(urls).toEqual([
      ORIGIN,
      `${ORIGIN}/pricing`,
      `${ORIGIN}/terms`,
      `${ORIGIN}/privacy`,
    ]);
  });

  it("points robots.txt at the https sitemap", () => {
    expect(robots().sitemap).toBe(`${ORIGIN}/sitemap.xml`);
  });
});

describe("canonical tags", () => {
  it("resolves relative canonicals against the custom domain", () => {
    expect(String(rootMetadata.metadataBase)).toBe(`${ORIGIN}/`);
  });

  it.each([
    ["home", homeMetadata, "/"],
    ["pricing", pricingMetadata, "/pricing"],
    ["terms", termsMetadata, "/terms"],
    ["privacy", privacyMetadata, "/privacy"],
  ])("%s page declares its own canonical", (_name, metadata, path) => {
    expect(metadata.alternates?.canonical).toBe(path);
  });

  it("does not set a canonical in the root layout (it would cascade to every page)", () => {
    expect(rootMetadata.alternates?.canonical).toBeUndefined();
  });
});
