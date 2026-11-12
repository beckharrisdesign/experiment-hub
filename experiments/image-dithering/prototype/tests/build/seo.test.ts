import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const root = new URL("../..", import.meta.url).pathname;
const read = (dir: string, file: string) => readFileSync(join(root, dir, file), "utf8");
const attr = (html: string, re: RegExp) => html.match(re)?.[1] ?? null;
const SITE = "https://dither-halftone-generator.vercel.app";
const decode = (s: string) => s.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

let html = "";
beforeAll(() => {
  html = read("dist", "index.html");
  // A second build with a base path, to prove the base is configurable.
  // Vitest sets BASE_URL and NODE_ENV=test in its own process; the child build must not inherit them.
  const { BASE_URL: _b, NODE_ENV: _n, VITEST: _v, ...env } = process.env;
  execSync("npx astro build --outDir dist-base", { cwd: root, env: { ...env, BASE_PATH: "/dither" }, stdio: "pipe" });
});

describe("built page (test 19)", () => {
  it("has a <title> of at most 60 characters", () => {
    const title = attr(html, /<title>([^<]*)<\/title>/);
    expect(title).toBeTruthy();
    expect(title!.length).toBeLessThanOrEqual(60);
  });

  it("has a meta description of 120–160 characters", () => {
    const d = attr(html, /<meta name="description" content="([^"]*)"/);
    expect(d).toBeTruthy();
    expect(d!.length).toBeGreaterThanOrEqual(120);
    expect(d!.length).toBeLessThanOrEqual(160);
  });

  it("has a canonical URL", () => {
    expect(attr(html, /<link rel="canonical" href="([^"]*)"/)).toBe(`${SITE}/`);
  });

  it("carries the Google Search Console verification tag", () => {
    expect(attr(html, /<meta name="google-site-verification" content="([^"]*)"/)).toBe("y0u7rG7N01At5V2n3n1Irv9RH1kfNjQSewYY_MtzX2Q");
  });

  it("has exactly one H1", () => {
    expect(html.match(/<h1[\s>]/g)?.length).toBe(1);
  });

  it("has JSON-LD that parses: a free WebApplication and an FAQPage matching the visible questions", () => {
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
    const app = blocks.find((b) => b["@type"] === "WebApplication");
    expect(app).toBeTruthy();
    expect(app.name).toBe("Dither & Halftone Generator");
    expect(app.offers.price).toBe("0");
    expect(app.url).toBe(`${SITE}/`);
    const faq = blocks.find((b) => b["@type"] === "FAQPage");
    expect(faq.mainEntity.length).toBeGreaterThanOrEqual(4);
    const visible = decode(html.replace(/<[^>]+>/g, " "));
    for (const q of faq.mainEntity) {
      expect(visible).toContain(q.name);
      expect(visible).toContain(q.acceptedAnswer.text);
    }
  });

  it("names the three target phrases in people-first copy", () => {
    const text = decode(html.replace(/<[^>]+>/g, " ")).toLowerCase();
    for (const phrase of ["image dithering", "dither effect", "halftone generator"]) expect(text).toContain(phrase);
  });

  it("has Open Graph tags and a 1200×630 share image", () => {
    expect(attr(html, /<meta property="og:title" content="([^"]*)"/)).toBeTruthy();
    expect(attr(html, /<meta property="og:description" content="([^"]*)"/)).toBeTruthy();
    expect(attr(html, /<meta name="twitter:card" content="([^"]*)"/)).toBe("summary_large_image");
    const img = attr(html, /<meta property="og:image" content="([^"]*)"/);
    expect(img).toBe(`${SITE}/og.png`);
    const png = readFileSync(join(root, "dist", "og.png"));
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630]);
  });
});

describe("sitemap and robots (test 20)", () => {
  it("sitemap.xml includes the page URL", () => {
    expect(read("dist", "sitemap.xml")).toContain(`<loc>${SITE}/</loc>`);
  });
  it("robots.txt references the sitemap", () => {
    expect(read("dist", "robots.txt")).toMatch(new RegExp(`^Sitemap: ${SITE}/sitemap.xml$`, "m"));
  });
});

describe("configurable base path", () => {
  it("canonical, sitemap and robots follow BASE_PATH", () => {
    const b = read("dist-base", "index.html");
    expect(attr(b, /<link rel="canonical" href="([^"]*)"/)).toBe(`${SITE}/dither/`);
    expect(read("dist-base", "sitemap.xml")).toContain(`<loc>${SITE}/dither/</loc>`);
    expect(read("dist-base", "robots.txt")).toContain(`Sitemap: ${SITE}/dither/sitemap.xml`);
    expect(existsSync(join(root, "dist-base", "og.png"))).toBe(true);
  });
});
