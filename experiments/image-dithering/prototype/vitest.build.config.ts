import { defineConfig } from "vitest/config";

// Runs against the built site in dist/ (and a second build with a base path).
// `pnpm test:build` builds first.
export default defineConfig({
  test: { environment: "node", include: ["tests/build/**/*.test.ts"], testTimeout: 120_000, hookTimeout: 120_000 },
});
