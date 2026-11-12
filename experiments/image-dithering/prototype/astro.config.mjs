// @ts-check
import { defineConfig } from "astro/config";

// The page may live at labs.beckharrisdesign.com/dither or on its own domain later,
// so both the origin and the base path come from the environment.
export default defineConfig({
  site: process.env.SITE_URL ?? "https://dither-halftone-generator.vercel.app",
  base: process.env.BASE_PATH ?? "/",
  output: "static",
});
