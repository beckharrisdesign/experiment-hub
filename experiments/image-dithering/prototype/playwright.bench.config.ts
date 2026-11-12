import { defineConfig, devices } from "@playwright/test";
import base from "./playwright.config";

// Benchmarks: report-only numbers for the README. Not part of `npx playwright test`.
export default defineConfig({ ...base, testDir: "tests/bench", timeout: 300_000, projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }] });
