import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    // Component tests (e.g. auth-context) use jsdom via per-file docblock:
    //   // @vitest-environment jsdom
    include: ["**/*.test.{ts,tsx}"],
    environmentMatchGlobs: [
      ["**/*.test.tsx", "jsdom"],
      ["**/auth-context.test.ts", "jsdom"],
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // Stubs for packages installed only in the app's own node_modules.
      // The app is not a pnpm workspace member so root `pnpm install` skips
      // them. Real code guards with `if (!supabase)` / `if (!stripe)` so
      // null returns are safe in the test environment.
      "@supabase/ssr": path.resolve(__dirname, "./__mocks__/@supabase/ssr.ts"),
      stripe: path.resolve(__dirname, "./__mocks__/stripe.ts"),
    },
  },
});
