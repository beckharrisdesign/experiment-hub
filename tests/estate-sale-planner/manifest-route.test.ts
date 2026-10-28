import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { GET } from "@/app/estate-sale-planner/manifest.webmanifest/route";
import { metadata, viewport } from "@/app/estate-sale-planner/layout";

// ---------------------------------------------------------------------------
// Web app manifest (founder, 2026-10-28: "lets just do the web manifest")
// ---------------------------------------------------------------------------

describe("GET /estate-sale-planner/manifest.webmanifest", () => {
  it("serves a manifest content type", async () => {
    const res = GET();
    expect(res.headers.get("content-type")).toContain("application/manifest+json");
  });

  it("opens standalone and stays scoped to the planner, not the whole hub", async () => {
    const m = await GET().json();
    expect(m.display).toBe("standalone");
    expect(m.start_url).toBe("/estate-sale-planner");
    expect(m.scope).toBe("/estate-sale-planner");
    expect(m.id).toBe("/estate-sale-planner");
  });

  it("launches on the planner's warm dark, not the hub green", async () => {
    const m = await GET().json();
    expect(m.background_color).toBe("#14100d");
    expect(m.theme_color).toBe("#14100d");
  });

  it("lists installable icons that exist in public/", async () => {
    const m = await GET().json();
    const sizes = m.icons.map((i: { sizes: string }) => i.sizes);
    expect(sizes).toEqual(expect.arrayContaining(["192x192", "512x512"]));
    expect(m.icons.some((i: { purpose?: string }) => i.purpose === "maskable")).toBe(true);
    for (const icon of m.icons) expect(existsSync(join(process.cwd(), "public", icon.src))).toBe(true);
  });
});

describe("planner layout · home screen and browser chrome", () => {
  it("gives iOS its own home-screen icon, and the file exists", () => {
    const apple = (metadata.icons as { apple: string }).apple;
    expect(apple).toBe("/estate-sale-planner/apple-touch-icon.png");
    expect(existsSync(join(process.cwd(), "public", apple))).toBe(true);
  });

  it("colors the browser bars with the planner's warm dark, not the hub green", () => {
    expect(viewport.themeColor).toBe("#14100d");
  });
});
