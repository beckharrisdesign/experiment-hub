import { defineConfig, devices } from "@playwright/test";

// One worker, Chromium only: this runs on an 8 GB laptop as well as in CI.
export default defineConfig({
  testDir: "tests/e2e",
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 60_000,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:4329", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Test the built output, not the dev server: it's what ships.
    command: "npx astro build && npx astro preview --port 4329 --ignore-lock",
    url: "http://localhost:4329",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
