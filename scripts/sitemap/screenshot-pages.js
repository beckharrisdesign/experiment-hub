#!/usr/bin/env node
/**
 * Screenshot every live page of the BHD Labs hub at labs.beckharrisdesign.com.
 * Outputs to docs/sitemap/screenshots/ with a manifest.json describing the sitemap tree.
 *
 * Usage:  node scripts/sitemap/screenshot-pages.js
 *         BASE_URL=http://localhost:3000 node scripts/sitemap/screenshot-pages.js
 *
 * Requires: playwright (npm install -g playwright), Google Chrome installed.
 */

const { chromium } = require("/home/ubuntu/.nvm/versions/node/v22.22.1/lib/node_modules/playwright");
const path = require("path");
const fs = require("fs");

const BASE_URL = process.env.BASE_URL || "https://labs.beckharrisdesign.com";
const OUT_DIR = path.join(__dirname, "../../docs/sitemap/screenshots");

// Rate-limit delay between screenshots (ms) — be kind to the server
const DELAY_MS = 1200;

// Viewport for desktop-style thumbnails
const VIEWPORT = { width: 1280, height: 800 };

/**
 * Sitemap tree — each node represents one real page that should be screenshotted.
 * `parent` is the URL path of the logical parent page (for tree layout in Figma).
 * `group` is the Figma frame/section it belongs to.
 */
const PAGES = [
  // ── Hub shell ────────────────────────────────────────────────────────────────
  { id: "home",          path: "/",              label: "Home",           group: "Hub",         parent: null },
  { id: "scoring",       path: "/scoring",        label: "Scoring",        group: "Hub",         parent: "/" },
  { id: "heuristics",    path: "/heuristics",     label: "Heuristics",     group: "Hub",         parent: "/" },
  { id: "workflow",      path: "/workflow",       label: "Workflow",       group: "Hub",         parent: "/" },
  { id: "harness",       path: "/harness",        label: "Harness",        group: "Hub",         parent: "/" },
  { id: "documentation", path: "/documentation",  label: "Documentation",  group: "Hub",         parent: "/" },
  { id: "font-preview",  path: "/font-preview",   label: "Font Preview",   group: "Hub",         parent: "/" },

  // ── Experiment detail pages ───────────────────────────────────────────────
  { id: "exp-seed-finder",      path: "/experiments/seed-finder",                       label: "Seed Finder",             group: "Experiments",  parent: "/" },
  { id: "exp-simple-seed",      path: "/experiments/simple-seed-organizer",             label: "Simple Seed Organizer",   group: "Experiments",  parent: "/" },
  { id: "exp-best-day-ever",    path: "/experiments/best-day-ever",                     label: "Best Day Ever",           group: "Experiments",  parent: "/" },
  { id: "exp-xp-repo",          path: "/experiments/experience-principles-repository",  label: "XP Repository",           group: "Experiments",  parent: "/" },
  { id: "exp-garden-guide",     path: "/experiments/garden-guide-generator",            label: "Garden Guide Generator",  group: "Experiments",  parent: "/" },
  { id: "exp-photo-memories",   path: "/experiments/photo-memories",                    label: "Photo Memories",          group: "Experiments",  parent: "/" },
  { id: "exp-illuminator",      path: "/experiments/the-illuminator",                   label: "The Illuminator",         group: "Experiments",  parent: "/" },

  // ── Experiment doc pages ──────────────────────────────────────────────────
  { id: "doc-best-day-ever",  path: "/experiments/best-day-ever/doc/landing-page-content",          label: "Best Day Ever — Landing Page Content",         group: "Experiment Docs", parent: "/experiments/best-day-ever" },
  { id: "doc-simple-seed",    path: "/experiments/simple-seed-organizer/doc/landing-page-content",  label: "Simple Seed Organizer — Landing Page Content",  group: "Experiment Docs", parent: "/experiments/simple-seed-organizer" },

  // ── Static landing pages ──────────────────────────────────────────────────
  { id: "landing-simple-seed", path: "/landing/simple-seed-organizer/", label: "Simple Seed Organizer Landing", group: "Static Landings", parent: "/experiments/simple-seed-organizer" },
  { id: "landing-best-day",    path: "/landing/best-day-ever/",          label: "Best Day Ever Landing",          group: "Static Landings", parent: "/experiments/best-day-ever" },
];

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function screenshotPage(page, entry) {
  const url = `${BASE_URL}${entry.path}`;
  const filename = `${entry.id}.png`;
  const filepath = path.join(OUT_DIR, filename);

  console.log(`  → ${entry.label} (${url})`);
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    // Give JS-heavy pages a moment to settle
    await sleep(500);
    await page.screenshot({ path: filepath, fullPage: false });
    return { ...entry, filename, status: "ok", url };
  } catch (err) {
    console.error(`  ✗ Failed: ${err.message}`);
    return { ...entry, filename, status: "error", error: err.message, url };
  }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log(`\nBHD Labs sitemap screenshots`);
  console.log(`Base URL : ${BASE_URL}`);
  console.log(`Output   : ${OUT_DIR}`);
  console.log(`Pages    : ${PAGES.length}\n`);

  const browser = await chromium.launch({
    executablePath: "/usr/local/bin/google-chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2, // retina-quality thumbnails
  });

  const page = await context.newPage();
  const manifest = [];

  for (let i = 0; i < PAGES.length; i++) {
    const entry = PAGES[i];
    const result = await screenshotPage(page, entry);
    manifest.push(result);

    if (i < PAGES.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  await browser.close();

  // Write manifest
  const manifestPath = path.join(OUT_DIR, "../manifest.json");
  fs.writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        baseUrl: BASE_URL,
        viewport: VIEWPORT,
        pages: manifest,
      },
      null,
      2
    )
  );

  const ok = manifest.filter((m) => m.status === "ok").length;
  const fail = manifest.filter((m) => m.status === "error").length;
  console.log(`\nDone. ${ok} succeeded, ${fail} failed.`);
  console.log(`Manifest: ${manifestPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
