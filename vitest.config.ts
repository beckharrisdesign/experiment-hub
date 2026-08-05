import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    exclude: ["tests/**/*.live.test.{ts,tsx}", "node_modules"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // Mirrors the tsconfig path mapping. lib/notion.ts imports this, and
      // lib/notion-experiments.ts and lib/notion-history.ts import that, so
      // several suites resolve through it.
      "@experiment-hub/notion-auth": path.resolve(
        __dirname,
        "packages/notion-auth/src/index.js",
      ),
      "next/link": path.resolve(__dirname, "tests/__mocks__/next/link.tsx"),
    },
  },
});
