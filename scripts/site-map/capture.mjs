#!/usr/bin/env node

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, "..", "..");
const ROUTES_PATH = path.join(ROOT_DIR, "scripts", "site-map", "routes.js");
const DEFAULT_BASE_URL = "https://labs.beckharrisdesign.com";
const DEFAULT_OUTPUT_DIR = path.join(ROOT_DIR, ".site-map", "experiment-hub");
const DEFAULT_WIDTH = 1440;
const DEFAULT_HEIGHT = 9000;
const DEFAULT_DELAY_MS = 2500;
const DEFAULT_TIMEOUT_MS = 45000;
const DEFAULT_BUDGET_MS = 8000;

async function importRoutesModule() {
  return import(`file://${ROUTES_PATH}`);
}

function parseArgs(argv) {
  const options = {
    baseUrl: DEFAULT_BASE_URL,
    outputDir: DEFAULT_OUTPUT_DIR,
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    delayMs: DEFAULT_DELAY_MS,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    budgetMs: DEFAULT_BUDGET_MS,
    limit: null,
    dryRun: false,
    includeInactive: true,
    clean: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const nextToken = argv[index + 1];
    const [flag, inlineValue] = token.split(/=(.*)/s, 2);
    const takeValue = () => {
      if (inlineValue !== undefined) {
        return { value: inlineValue, consumedNext: false };
      }
      return { value: nextToken, consumedNext: true };
    };

    if (flag === "--base-url") {
      const { value, consumedNext } = takeValue();
      if (value) {
        options.baseUrl = value;
        if (consumedNext) index += 1;
      }
      continue;
    }
    if (flag === "--output-dir") {
      const { value, consumedNext } = takeValue();
      if (value) {
        options.outputDir = path.resolve(value);
        if (consumedNext) index += 1;
      }
      continue;
    }
    if (flag === "--width") {
      const { value, consumedNext } = takeValue();
      if (value) {
        options.width = Number.parseInt(value, 10);
        if (consumedNext) index += 1;
      }
      continue;
    }
    if (flag === "--height") {
      const { value, consumedNext } = takeValue();
      if (value) {
        options.height = Number.parseInt(value, 10);
        if (consumedNext) index += 1;
      }
      continue;
    }
    if (flag === "--delay-ms") {
      const { value, consumedNext } = takeValue();
      if (value) {
        options.delayMs = Number.parseInt(value, 10);
        if (consumedNext) index += 1;
      }
      continue;
    }
    if (flag === "--timeout-ms") {
      const { value, consumedNext } = takeValue();
      if (value) {
        options.timeoutMs = Number.parseInt(value, 10);
        if (consumedNext) index += 1;
      }
      continue;
    }
    if (flag === "--budget-ms") {
      const { value, consumedNext } = takeValue();
      if (value) {
        options.budgetMs = Number.parseInt(value, 10);
        if (consumedNext) index += 1;
      }
      continue;
    }
    if (flag === "--limit") {
      const { value, consumedNext } = takeValue();
      if (value) {
        options.limit = Number.parseInt(value, 10);
        if (consumedNext) index += 1;
      }
      continue;
    }
    if (token === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (token === "--active-only") {
      options.includeInactive = false;
      continue;
    }
    if (token === "--clean") {
      options.clean = true;
    }
  }

  return options;
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function withTrailingSlash(url) {
  return url.endsWith("/") ? url : `${url}/`;
}

function toPublicUrl(baseUrl, routePath) {
  const normalizedBase = withTrailingSlash(baseUrl.replace(/\/+$/, ""));
  const normalizedPath = routePath.startsWith("/") ? routePath.slice(1) : routePath;
  return new URL(normalizedPath, normalizedBase).toString();
}

async function ensurePngExists(filePath) {
  const buffer = await readFile(filePath);
  const pngSignature = "89504e470d0a1a0a";
  const signature = buffer.subarray(0, 8).toString("hex");

  if (signature !== pngSignature) {
    throw new Error(`Invalid PNG signature for ${filePath}`);
  }
}

async function captureScreenshot({
  targetUrl,
  screenshotPath,
  width,
  height,
  timeoutMs,
  budgetMs,
  userDataDir,
}) {
  await rm(screenshotPath, { force: true });

  const args = [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--hide-scrollbars",
    `--user-data-dir=${userDataDir}`,
    `--virtual-time-budget=${budgetMs}`,
    "--run-all-compositor-stages-before-draw",
    `--window-size=${width},${height}`,
    `--screenshot=${screenshotPath}`,
    targetUrl,
  ];

  return new Promise((resolve) => {
    const chrome = spawn("google-chrome", args, {
      cwd: ROOT_DIR,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let finished = false;

    const finalize = async (result) => {
      if (finished) {
        return;
      }
      finished = true;
      clearTimeout(timeoutHandle);
      resolve({
        ...result,
        stdout,
        stderr,
      });
    };

    chrome.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    chrome.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    chrome.on("error", async (error) => {
      await finalize({ ok: false, reason: error.message });
    });

    chrome.on("close", async (code, signal) => {
      try {
        await ensurePngExists(screenshotPath);
        await finalize({
          ok: true,
          reason:
            code === 0 || code === null
              ? "captured"
              : `captured_with_exit_${code ?? signal ?? "unknown"}`,
        });
      } catch (error) {
        await finalize({
          ok: false,
          reason:
            code === null
              ? `chrome_closed_without_png_${signal ?? "unknown"}`
              : `chrome_exit_${code}`,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    const timeoutHandle = setTimeout(async () => {
      chrome.kill("SIGKILL");

      try {
        await ensurePngExists(screenshotPath);
        await finalize({ ok: true, reason: "captured_before_timeout_kill" });
      } catch (error) {
        await finalize({
          ok: false,
          reason: "timeout",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }, timeoutMs);
  });
}

function buildIndexHtml({ baseUrl, generatedAt, entries }) {
  const cards = entries
    .map((entry) => {
      const imageMarkup = entry.thumbnailPath
        ? `<img src="./${entry.thumbnailPath}" alt="${escapeHtml(entry.title)} thumbnail" loading="lazy" />`
        : `<div class="placeholder">Capture failed</div>`;

      return `
        <article class="card ${entry.captureStatus !== "captured" ? "card--error" : ""}">
          <div class="card__thumb">${imageMarkup}</div>
          <div class="card__body">
            <div class="card__meta">
              <span class="chip">${escapeHtml(entry.group)}</span>
              <span class="chip">${escapeHtml(entry.pageType)}</span>
              ${entry.status ? `<span class="chip">${escapeHtml(entry.status)}</span>` : ""}
            </div>
            <h2>${escapeHtml(entry.title)}</h2>
            <p class="path">${escapeHtml(entry.path)}</p>
            <p><a href="${escapeHtml(entry.url)}" target="_blank" rel="noreferrer">${escapeHtml(entry.url)}</a></p>
            ${
              entry.captureStatus !== "captured"
                ? `<p class="error">Capture status: ${escapeHtml(entry.captureStatus)}</p>`
                : ""
            }
          </div>
        </article>
      `;
    })
    .join("\n");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Experiment Hub site map</title>
    <style>
      :root {
        color-scheme: dark;
        --bg: #0d1117;
        --panel: #161b22;
        --panel-2: #21262d;
        --text: #c9d1d9;
        --muted: #8b949e;
        --border: #30363d;
        --accent: #79c0ff;
        --error: #f85149;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: Inter, system-ui, sans-serif;
        background: var(--bg);
        color: var(--text);
      }
      main {
        width: min(1600px, calc(100% - 32px));
        margin: 0 auto;
        padding: 32px 0 64px;
      }
      header {
        margin-bottom: 24px;
      }
      h1 {
        margin: 0 0 8px;
        font-size: 32px;
      }
      p {
        margin: 0;
        color: var(--muted);
        line-height: 1.5;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        gap: 16px;
        margin-top: 24px;
      }
      .card {
        background: var(--panel);
        border: 1px solid var(--border);
        border-radius: 14px;
        overflow: hidden;
      }
      .card--error {
        border-color: rgba(248, 81, 73, 0.5);
      }
      .card__thumb {
        background: var(--panel-2);
        border-bottom: 1px solid var(--border);
        aspect-ratio: 16 / 10;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .card__thumb img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: top;
        display: block;
      }
      .placeholder {
        color: var(--muted);
      }
      .card__body {
        padding: 14px;
        display: grid;
        gap: 10px;
      }
      .card__meta {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .chip {
        display: inline-flex;
        align-items: center;
        padding: 4px 8px;
        border-radius: 999px;
        background: rgba(121, 192, 255, 0.12);
        color: var(--accent);
        font-size: 12px;
      }
      .path {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        color: var(--text);
        font-size: 13px;
      }
      a {
        color: var(--accent);
        text-decoration: none;
      }
      a:hover {
        text-decoration: underline;
      }
      .error {
        color: var(--error);
      }
    </style>
  </head>
  <body>
    <main>
      <header>
        <h1>Experiment Hub screenshot site map</h1>
        <p>Base URL: ${escapeHtml(baseUrl)}</p>
        <p>Generated: ${escapeHtml(generatedAt)}</p>
        <p>${entries.length} pages captured for sitemap and later Figma component work.</p>
      </header>
      <section class="grid">
        ${cards}
      </section>
    </main>
  </body>
</html>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const routesModule = await importRoutesModule();

  const experiments = routesModule.loadExperiments(ROOT_DIR);
  let routes = routesModule.buildSiteMapRoutes({
    experiments,
    rootDir: ROOT_DIR,
  });
  if (!options.includeInactive) {
    routes = routes.filter((route) => route.status !== "Abandoned");
  }
  if (options.limit !== null) {
    routes = routes.slice(0, options.limit);
  }

  if (routes.length === 0) {
    console.error("No routes selected for capture.");
    process.exitCode = 1;
    return;
  }

  const screenshotsDir = path.join(options.outputDir, "screenshots");
  const chromeProfileDir = path.join(options.outputDir, ".chrome-profile");

  if (options.clean) {
    await rm(options.outputDir, { recursive: true, force: true });
  }

  await mkdir(screenshotsDir, { recursive: true });
  await mkdir(chromeProfileDir, { recursive: true });

  const runStartedAt = new Date().toISOString();
  const results = [];

  for (const [index, route] of routes.entries()) {
    const url = toPublicUrl(options.baseUrl, route.path);
    const screenshotFileName = route.thumbnailName;
    const screenshotPath = path.join(screenshotsDir, screenshotFileName);

    process.stdout.write(
      `[${index + 1}/${routes.length}] ${route.path} -> ${route.thumbnailPath}\n`,
    );

    if (options.dryRun) {
      results.push({
        ...route,
        url,
        captureStatus: "dry-run",
        thumbnailPath: route.thumbnailPath,
      });
      continue;
    }

    const captureResult = await captureScreenshot({
      targetUrl: url,
      screenshotPath,
      width: options.width,
      height: options.height,
      timeoutMs: options.timeoutMs,
      budgetMs: options.budgetMs,
      userDataDir: chromeProfileDir,
    });

    results.push({
      ...route,
      url,
      captureStatus: captureResult.ok ? "captured" : captureResult.reason,
      thumbnailPath: captureResult.ok ? route.thumbnailPath : null,
      captureError: captureResult.error ?? null,
    });

    if (index < routes.length - 1) {
      await delay(options.delayMs);
    }
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    startedAt: runStartedAt,
    site: {
      name: "Experiment Hub",
      baseUrl: options.baseUrl,
    },
    baseUrl: options.baseUrl,
    width: options.width,
    height: options.height,
    delayMs: options.delayMs,
    timeoutMs: options.timeoutMs,
    budgetMs: options.budgetMs,
    pageCount: results.length,
    routes: results,
  };

  await writeFile(
    path.join(options.outputDir, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );

  await writeFile(
    path.join(options.outputDir, "index.html"),
    buildIndexHtml({
      baseUrl: options.baseUrl,
      generatedAt: manifest.generatedAt,
      entries: results,
    }),
    "utf8",
  );

  const failures = results.filter((route) => route.captureStatus !== "captured");
  process.stdout.write(
    `Finished ${results.length} routes with ${failures.length} non-captured entries.\n`,
  );
  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

await main();
