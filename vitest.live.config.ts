import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.live.test.{ts,tsx}"],
    // Live tests make several sequential round-trips to real services
    // (Supabase, Notion). Vitest's 5s default is tuned for unit tests and
    // times out on ordinary network latency in CI.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
