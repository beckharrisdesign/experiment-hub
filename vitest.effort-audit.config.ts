import { defineConfig } from "vitest/config";

// Browser acceptance tests for scripts/task-effort-audit. Separate from
// `pnpm test` because they launch Chromium, which CI does not install.
// Run: pnpm test:effort-audit  (set TEA_CHROMIUM_PATH if Playwright's own
// browser download is missing, e.g. TEA_CHROMIUM_PATH=/opt/pw-browsers/chromium)
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/task-effort-audit-e2e/**/*.e2e.test.ts"],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
});
