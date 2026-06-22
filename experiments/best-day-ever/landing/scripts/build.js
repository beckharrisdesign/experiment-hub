#!/usr/bin/env node
/**
 * Vercel build: copy static assets to dist and inject Supabase config into config.js.
 * Run from landing folder: node scripts/build.js
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");

if (!fs.existsSync(dist)) {
  fs.mkdirSync(dist, { recursive: true });
}

// Copy static files
["index.html", "script.js"].forEach((file) => {
  fs.copyFileSync(path.join(root, file), path.join(dist, file));
});

// Write config.js with Supabase credentials (publishable key — safe for browser)
const supabaseUrl = (process.env.SUPABASE_URL || "").trim();
const supabaseKey = (process.env.SUPABASE_PUBLISHABLE_KEY || "").trim();
const configContent = `// Injected at build time. Publishable key only — safe to expose in browser.
window.SUPABASE_URL = ${JSON.stringify(supabaseUrl)};
window.SUPABASE_PUBLISHABLE_KEY = ${JSON.stringify(supabaseKey)};
`;
fs.writeFileSync(path.join(dist, "config.js"), configContent, "utf8");

// Guard: fail the build if any localhost: URL slipped in (e.g. from Figma Desktop MCP server)
const htmlOut = fs.readFileSync(path.join(dist, "index.html"), "utf8");
if (htmlOut.includes("localhost:")) {
  console.error("\nBuild failed: index.html contains a localhost: URL.");
  console.error(
    "Figma Desktop MCP assets (localhost:3845) must not reach production.",
  );
  console.error(
    "Replace localhost: image <img> tags with inline SVGs or hosted assets before deploying.\n",
  );
  process.exit(1);
}

console.log(
  "Build complete: dist/ (SUPABASE_URL =",
  supabaseUrl || "(not set)",
  ")",
);
