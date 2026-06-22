// @vitest-environment node
/**
 * Best Day Ever landing — build output tests.
 *
 * Runs the build script directly and asserts that:
 *   1. SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are injected into dist/config.js
 *   2. dist/config.js falls back to '' when env vars are absent
 *   3. script.js uses Supabase Auth (not a hub API fetch)
 *   4. The build fails if index.html contains a localhost: URL
 */
import { describe, it, expect, afterAll } from "vitest";
import { spawnSync } from "child_process";
import path from "path";
import fs from "fs";

const LANDING_DIR = path.join(
  process.cwd(),
  "experiments/best-day-ever/landing",
);
const DIST_DIR = path.join(LANDING_DIR, "dist");
const DIST_CONFIG = path.join(DIST_DIR, "config.js");

function runBuild(env: Record<string, string> = {}) {
  return spawnSync("node", ["scripts/build.js"], {
    cwd: LANDING_DIR,
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
}

afterAll(() => {
  if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
  }
});

describe("best-day-ever build output", () => {
  describe("config.js injection", () => {
    it("injects SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY into config.js when env vars are set", () => {
      const result = runBuild({
        SUPABASE_URL: "https://ulqdjuiffpazzixnwwso.supabase.co",
        SUPABASE_PUBLISHABLE_KEY: "sb_publishable__test",
      });
      expect(result.status).toBe(0);

      const config = fs.readFileSync(DIST_CONFIG, "utf8");
      expect(config).toContain(
        'window.SUPABASE_URL = "https://ulqdjuiffpazzixnwwso.supabase.co"',
      );
      expect(config).toContain(
        'window.SUPABASE_PUBLISHABLE_KEY = "sb_publishable__test"',
      );
    });

    it("falls back to empty strings when env vars are not set", () => {
      const result = runBuild({});
      expect(result.status).toBe(0);

      const config = fs.readFileSync(DIST_CONFIG, "utf8");
      expect(config).toContain('window.SUPABASE_URL = ""');
      expect(config).toContain('window.SUPABASE_PUBLISHABLE_KEY = ""');
    });

    it("trims whitespace from env vars", () => {
      const result = runBuild({
        SUPABASE_URL: "  https://ulqdjuiffpazzixnwwso.supabase.co  ",
        SUPABASE_PUBLISHABLE_KEY: "  sb_publishable__test  ",
      });
      expect(result.status).toBe(0);

      const config = fs.readFileSync(DIST_CONFIG, "utf8");
      expect(config).toContain(
        'window.SUPABASE_URL = "https://ulqdjuiffpazzixnwwso.supabase.co"',
      );
      expect(config).toContain(
        'window.SUPABASE_PUBLISHABLE_KEY = "sb_publishable__test"',
      );
    });
  });

  describe("form submission wiring", () => {
    it("script.js uses Supabase Auth signUp (not a hub API fetch)", () => {
      const scriptSrc = fs.readFileSync(
        path.join(LANDING_DIR, "script.js"),
        "utf8",
      );
      expect(scriptSrc).toContain("SUPABASE_URL");
      expect(scriptSrc).toContain("SUPABASE_PUBLISHABLE_KEY");
      expect(scriptSrc).toContain("auth.signUp");
      expect(scriptSrc).not.toContain("/api/landing-submission");
    });

    it("dist/script.js is copied verbatim from source", () => {
      runBuild({ SUPABASE_URL: "https://ulqdjuiffpazzixnwwso.supabase.co" });
      const src = fs.readFileSync(path.join(LANDING_DIR, "script.js"), "utf8");
      const built = fs.readFileSync(path.join(DIST_DIR, "script.js"), "utf8");
      expect(built).toBe(src);
    });
  });

  describe("localhost guard", () => {
    it("build succeeds when index.html has no localhost URLs", () => {
      const result = runBuild({
        SUPABASE_URL: "https://ulqdjuiffpazzixnwwso.supabase.co",
      });
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("Build complete");
    });

    it("build fails when index.html contains a localhost: URL", () => {
      const htmlPath = path.join(LANDING_DIR, "index.html");
      const originalHtml = fs.readFileSync(htmlPath, "utf8");
      const poisonedHtml = originalHtml.replace(
        "</body>",
        '<img src="http://localhost:3845/asset.png"></body>',
      );
      fs.writeFileSync(htmlPath, poisonedHtml, "utf8");

      try {
        const result = runBuild({
          SUPABASE_URL: "https://ulqdjuiffpazzixnwwso.supabase.co",
        });
        expect(result.status).not.toBe(0);
        expect(result.stderr).toContain("localhost:");
      } finally {
        fs.writeFileSync(htmlPath, originalHtml, "utf8");
      }
    });
  });
});
