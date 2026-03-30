// @vitest-environment node
/**
 * Best Day Ever landing — build output tests.
 *
 * Runs the build script directly and asserts that:
 *   1. HUB_API_URL is injected into dist/config.js when the env var is set
 *   2. dist/config.js falls back to '' (same-origin) when HUB_API_URL is absent
 *   3. The form submission URL in script.js is constructed from HUB_API_URL
 *   4. The build fails if index.html contains a localhost: URL
 *
 * These tests catch the class of bug where the form silently posts to the
 * wrong origin because HUB_API_URL was not set in the deployment environment.
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
    env: { ...process.env, ...env, HUB_API_URL: env.HUB_API_URL ?? "" },
    encoding: "utf8",
  });
}

afterAll(() => {
  // Clean up dist/ so test artifacts don't linger in the working tree
  if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
  }
});

describe("best-day-ever build output", () => {
  describe("config.js injection", () => {
    it("injects HUB_API_URL into config.js when env var is set", () => {
      const result = runBuild({
        HUB_API_URL: "https://labs.beckharrisdesign.com",
      });
      expect(result.status).toBe(0);

      const config = fs.readFileSync(DIST_CONFIG, "utf8");
      expect(config).toContain(
        'window.HUB_API_URL = "https://labs.beckharrisdesign.com"',
      );
    });

    it("falls back to empty string when HUB_API_URL is not set", () => {
      const result = runBuild({});
      expect(result.status).toBe(0);

      const config = fs.readFileSync(DIST_CONFIG, "utf8");
      expect(config).toContain('window.HUB_API_URL = ""');
    });

    it("trims whitespace from HUB_API_URL", () => {
      const result = runBuild({
        HUB_API_URL: "  https://labs.beckharrisdesign.com  ",
      });
      expect(result.status).toBe(0);

      const config = fs.readFileSync(DIST_CONFIG, "utf8");
      expect(config).toContain(
        'window.HUB_API_URL = "https://labs.beckharrisdesign.com"',
      );
    });
  });

  describe("form submission URL wiring", () => {
    it("script.js constructs SUBMIT_URL from HUB_API_URL + /api/landing-submission", () => {
      const scriptSrc = fs.readFileSync(
        path.join(LANDING_DIR, "script.js"),
        "utf8",
      );
      // The submission URL must be built from the injected HUB_API_URL,
      // not hardcoded — otherwise cross-domain deployments silently fail.
      expect(scriptSrc).toContain("HUB_API_URL");
      expect(scriptSrc).toContain("/api/landing-submission");
    });

    it("dist/script.js is copied verbatim from source", () => {
      runBuild({ HUB_API_URL: "https://labs.beckharrisdesign.com" });
      const src = fs.readFileSync(path.join(LANDING_DIR, "script.js"), "utf8");
      const built = fs.readFileSync(path.join(DIST_DIR, "script.js"), "utf8");
      expect(built).toBe(src);
    });
  });

  describe("localhost guard", () => {
    it("build succeeds when index.html has no localhost URLs", () => {
      const result = runBuild({
        HUB_API_URL: "https://labs.beckharrisdesign.com",
      });
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("Build complete");
    });

    it("build fails when index.html contains a localhost: URL", () => {
      // Temporarily inject a localhost URL into a copy of index.html
      const htmlPath = path.join(LANDING_DIR, "index.html");
      const originalHtml = fs.readFileSync(htmlPath, "utf8");
      const poisonedHtml = originalHtml.replace(
        "</body>",
        '<img src="http://localhost:3845/asset.png"></body>',
      );
      fs.writeFileSync(htmlPath, poisonedHtml, "utf8");

      try {
        const result = runBuild({
          HUB_API_URL: "https://labs.beckharrisdesign.com",
        });
        expect(result.status).not.toBe(0);
        expect(result.stderr).toContain("localhost:");
      } finally {
        // Always restore the original file
        fs.writeFileSync(htmlPath, originalHtml, "utf8");
      }
    });
  });
});
