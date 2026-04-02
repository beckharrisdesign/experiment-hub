#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { chromium } = require("@playwright/test");
const {
  canonicalizeUrl,
  isCrawlableUrl,
  toScreenshotFileName,
  toNodeLabel,
} = require("./site-map-utils");

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];

    if (!token.startsWith("--")) {
      continue;
    }

    const [key, maybeInlineValue] = token.slice(2).split("=");
    if (typeof maybeInlineValue !== "undefined") {
      args[key] = maybeInlineValue;
      continue;
    }

    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }

    args[key] = next;
    i += 1;
  }

  return args;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseMaybeInt(value, fallback) {
  if (value === undefined) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function boolArg(value, fallback = false) {
  if (value === undefined) {
    return fallback;
  }
  if (typeof value === "boolean") {
    return value;
  }
  const normalized = String(value).toLowerCase().trim();
  return ["1", "true", "yes", "on"].includes(normalized);
}

function runGhJson(args) {
  const result = spawnSync("gh", args, { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(result.stderr || `gh ${args.join(" ")} failed`);
  }
  return JSON.parse(result.stdout);
}

function runGitText(args) {
  const result = spawnSync("git", args, { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(result.stderr || `git ${args.join(" ")} failed`);
  }
  return result.stdout.trim();
}

function detectRepoSlugFromGitRemote() {
  const remote = runGitText(["remote", "get-url", "origin"]);
  const match = remote.match(/github\.com[:/](.+?)(?:\.git)?$/);
  if (!match) {
    throw new Error("Could not parse owner/repo from git origin URL.");
  }
  return match[1];
}

function detectMainDeploymentUrl({
  deploymentEnvironment = "Production – experiment-hub",
  fallbackEnvironment = "Production",
} = {}) {
  const repoSlug = detectRepoSlugFromGitRemote();
  const deployments = runGhJson([
    "api",
    `repos/${repoSlug}/deployments?per_page=30`,
  ]);

  const deployment =
    deployments.find((item) => item.environment === deploymentEnvironment) ||
    deployments.find((item) => item.environment === fallbackEnvironment);

  if (!deployment) {
    throw new Error(
      "No matching production deployment found. Provide --base-url explicitly."
    );
  }

  const statuses = runGhJson([
    "api",
    `repos/${repoSlug}/deployments/${deployment.id}/statuses`,
  ]);

  const successStatus = statuses.find(
    (status) => status.state === "success" && status.environment_url
  );

  if (!successStatus) {
    throw new Error(
      "No successful deployment status with environment URL was found."
    );
  }

  return successStatus.environment_url;
}

function csvEscape(value) {
  const text = value === undefined || value === null ? "" : String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function writeCsv(filePath, headers, rows) {
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => csvEscape(row[header])).join(","));
  }
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
}

function writeMermaid(filePath, nodes, edges) {
  const nodeIdByUrl = new Map(nodes.map((node) => [node.url, node.id]));
  const lines = ["graph TD"];

  for (const node of nodes) {
    const label = node.label.replace(/"/g, '\\"');
    lines.push(`  ${node.id}["${label}"]`);
  }

  for (const edge of edges) {
    const fromId = nodeIdByUrl.get(edge.from);
    const toId = nodeIdByUrl.get(edge.to);
    if (fromId && toId) {
      lines.push(`  ${fromId} --> ${toId}`);
    }
  }

  fs.writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
}

function writeHtmlIndex(filePath, nodes, title) {
  const rows = nodes
    .map(
      (node) => `
      <tr>
        <td>${node.depth}</td>
        <td><a href="${node.url}" target="_blank" rel="noreferrer">${node.label}</a></td>
        <td><code>${node.path}</code></td>
        <td>${node.status}</td>
        <td>
          ${
            node.screenshotRelativePath
              ? `<img src="${node.screenshotRelativePath}" alt="${node.label}" loading="lazy" />`
              : "<em>n/a</em>"
          }
        </td>
      </tr>`
    )
    .join("\n");

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      body { font-family: Inter, Arial, sans-serif; padding: 20px; background: #0d1117; color: #e6edf3; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #30363d; padding: 8px; text-align: left; vertical-align: top; }
      th { background: #161b22; }
      code { color: #7ee787; }
      a { color: #79c0ff; text-decoration: none; }
      img { width: 260px; border-radius: 6px; border: 1px solid #30363d; background: #000; }
      .meta { margin-bottom: 16px; color: #8b949e; }
    </style>
  </head>
  <body>
    <h1>${title}</h1>
    <p class="meta">Generated ${new Date().toISOString()}.</p>
    <table>
      <thead>
        <tr>
          <th>Depth</th>
          <th>Page</th>
          <th>Path</th>
          <th>Status</th>
          <th>Thumbnail</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  </body>
</html>`;

  fs.writeFileSync(filePath, html, "utf8");
}

async function fetchText(url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "experiment-hub-site-map-crawler/1.0",
      },
    });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function extractSitemapUrlsFromRobots(robotsTxt) {
  const lines = robotsTxt.split(/\r?\n/);
  const urls = [];
  for (const line of lines) {
    const match = line.match(/^\s*Sitemap:\s*(\S+)\s*$/i);
    if (match) {
      urls.push(match[1]);
    }
  }
  return urls;
}

function extractLocsFromXml(xmlText) {
  const results = [];
  const locRegex = /<loc>(.*?)<\/loc>/gims;
  let match = locRegex.exec(xmlText);
  while (match) {
    const value = match[1]
      .replace(/<!\[CDATA\[|\]\]>/g, "")
      .replace(/&amp;/g, "&")
      .trim();
    if (value) {
      results.push(value);
    }
    match = locRegex.exec(xmlText);
  }
  return results;
}

async function discoverSitemapPages(baseUrl, timeoutMs) {
  const discoveredPages = new Set();
  const sitemapQueue = [];
  const seenSitemapFiles = new Set();

  const robotsUrl = new URL("/robots.txt", baseUrl).toString();
  try {
    const robotsText = await fetchText(robotsUrl, timeoutMs);
    for (const sitemapUrl of extractSitemapUrlsFromRobots(robotsText)) {
      sitemapQueue.push(sitemapUrl);
    }
  } catch {
    // robots.txt is optional; fallback below still probes /sitemap.xml.
  }

  sitemapQueue.push(new URL("/sitemap.xml", baseUrl).toString());

  while (sitemapQueue.length > 0) {
    const currentSitemap = sitemapQueue.shift();
    if (seenSitemapFiles.has(currentSitemap)) {
      continue;
    }
    seenSitemapFiles.add(currentSitemap);

    try {
      const xml = await fetchText(currentSitemap, timeoutMs);
      const locs = extractLocsFromXml(xml);
      for (const loc of locs) {
        if (loc.endsWith(".xml")) {
          sitemapQueue.push(loc);
          continue;
        }
        discoveredPages.add(loc);
      }
    } catch {
      // Skip unavailable sitemap files and continue crawling via links.
    }
  }

  return [...discoveredPages];
}

async function captureSiteMap(options) {
  const {
    baseUrl,
    outputDir,
    maxPages,
    crawlDelayMs,
    timeoutMs,
    viewportWidth,
    viewportHeight,
    retries,
    keepQueryParams,
    includePathRegex,
    excludePathRegex,
    includeSitemapSeeds,
    browserChannel,
    executablePath,
    userAgent,
    seedUrls,
  } = options;

  ensureDir(outputDir);
  const screenshotsDir = path.join(outputDir, "screenshots");
  ensureDir(screenshotsDir);

  const includeRegex = includePathRegex ? new RegExp(includePathRegex) : null;
  const excludeRegex = excludePathRegex ? new RegExp(excludePathRegex) : null;
  const canonicalSeed = canonicalizeUrl(baseUrl, "/", {
    keepQuery: keepQueryParams,
  });
  if (!canonicalSeed) {
    throw new Error(`Could not canonicalize base URL "${baseUrl}".`);
  }

  const queue = [{ url: canonicalSeed, depth: 0, parent: null }];
  const queuedSet = new Set([canonicalSeed]);
  const visited = new Set();
  const nodes = new Map();
  const edges = new Set();
  const errors = [];

  const launchOptions = { headless: true };
  if (browserChannel && browserChannel !== "none") {
    launchOptions.channel = browserChannel;
  }
  if (executablePath) {
    launchOptions.executablePath = executablePath;
  }

  const browser = await chromium.launch(launchOptions);
  const context = await browser.newContext({
    viewport: { width: viewportWidth, height: viewportHeight },
    userAgent: userAgent || undefined,
  });

  try {
    if (Array.isArray(seedUrls) && seedUrls.length > 0) {
      for (const seed of seedUrls) {
        const normalized = canonicalizeUrl(baseUrl, seed, {
          keepQuery: keepQueryParams,
        });
        if (!normalized || !isCrawlableUrl(normalized, baseUrl)) {
          continue;
        }
        const parsedPath = new URL(normalized).pathname;
        if (includeRegex && !includeRegex.test(parsedPath)) {
          continue;
        }
        if (excludeRegex && excludeRegex.test(parsedPath)) {
          continue;
        }
        if (!queuedSet.has(normalized)) {
          queue.push({ url: normalized, depth: 0, parent: canonicalSeed });
          queuedSet.add(normalized);
        }
      }
      console.log(`Loaded ${seedUrls.length} seed URL(s) from file.`);
    }

    if (includeSitemapSeeds) {
      const sitemapCandidates = await discoverSitemapPages(baseUrl, timeoutMs);
      console.log(`Discovered ${sitemapCandidates.length} sitemap URL candidates.`);
      for (const candidate of sitemapCandidates) {
        const normalized = canonicalizeUrl(baseUrl, candidate, {
          keepQuery: keepQueryParams,
        });
        if (!normalized || !isCrawlableUrl(normalized, baseUrl)) {
          continue;
        }
        const parsedPath = new URL(normalized).pathname;
        if (includeRegex && !includeRegex.test(parsedPath)) {
          continue;
        }
        if (excludeRegex && excludeRegex.test(parsedPath)) {
          continue;
        }
        if (!queuedSet.has(normalized)) {
          queue.push({ url: normalized, depth: 0, parent: canonicalSeed });
          queuedSet.add(normalized);
        }
      }
    }

    while (queue.length > 0 && visited.size < maxPages) {
      const current = queue.shift();
      const currentUrl = current.url;

      if (visited.has(currentUrl)) {
        continue;
      }
      visited.add(currentUrl);

      if (current.parent) {
        edges.add(`${current.parent}|||${currentUrl}`);
      }

      console.log(
        `[${visited.size}/${maxPages}] crawling ${currentUrl} (depth ${current.depth})`
      );

      const page = await context.newPage();
      let finalUrl = currentUrl;
      let status = 0;
      let title = "";
      let links = [];
      let failed = false;
      let failureMessage = "";

      for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
        try {
          const response = await page.goto(currentUrl, {
            waitUntil: "networkidle",
            timeout: timeoutMs,
          });
          status = response ? response.status() : 0;
          finalUrl =
            canonicalizeUrl(baseUrl, page.url(), {
              keepQuery: keepQueryParams,
            }) || currentUrl;

          title = await page.title();
          links = await page.$$eval("a[href]", (anchors) =>
            anchors
              .map((a) => a.getAttribute("href"))
              .filter((href) => typeof href === "string")
          );
          failed = false;
          failureMessage = "";
          break;
        } catch (error) {
          failed = true;
          failureMessage = error instanceof Error ? error.message : String(error);
          if (attempt <= retries) {
            const backoff = 500 * attempt;
            console.warn(
              `retry ${attempt}/${retries} for ${currentUrl} after ${backoff}ms: ${failureMessage}`
            );
            await sleep(backoff);
            continue;
          }
        }
      }

      const screenshotFileName = toScreenshotFileName(finalUrl);
      const screenshotPath = path.join(screenshotsDir, screenshotFileName);

      try {
        await page.screenshot({
          path: screenshotPath,
          fullPage: false,
          timeout: timeoutMs,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push({ url: finalUrl, phase: "screenshot", message });
      }

      const node = {
        id: `n${nodes.size + 1}`,
        url: finalUrl,
        path: new URL(finalUrl).pathname || "/",
        label: toNodeLabel(finalUrl, title),
        title,
        depth: current.depth,
        parentUrl: current.parent,
        status: status || (failed ? 0 : 200),
        screenshotPath,
        screenshotRelativePath: path.relative(outputDir, screenshotPath),
        error: failed ? failureMessage : "",
      };
      nodes.set(finalUrl, node);

      if (failed) {
        errors.push({ url: finalUrl, phase: "goto", message: failureMessage });
        await page.close();
        if (crawlDelayMs > 0) {
          await sleep(crawlDelayMs);
        }
        continue;
      }

      for (const href of links) {
        const normalized = canonicalizeUrl(baseUrl, href, {
          keepQuery: keepQueryParams,
        });

        if (!normalized || !isCrawlableUrl(normalized, baseUrl)) {
          continue;
        }

        const parsedPath = new URL(normalized).pathname;
        if (includeRegex && !includeRegex.test(parsedPath)) {
          continue;
        }
        if (excludeRegex && excludeRegex.test(parsedPath)) {
          continue;
        }

        if (!visited.has(normalized) && !queuedSet.has(normalized)) {
          queue.push({ url: normalized, depth: current.depth + 1, parent: finalUrl });
          queuedSet.add(normalized);
        }
      }

      await page.close();
      if (crawlDelayMs > 0) {
        await sleep(crawlDelayMs);
      }
    }
  } finally {
    await context.close();
    await browser.close();
  }

  const nodeList = [...nodes.values()].sort((a, b) => {
    if (a.depth !== b.depth) {
      return a.depth - b.depth;
    }
    return a.path.localeCompare(b.path);
  });
  const edgeList = [...edges].map((entry) => {
    const [from, to] = entry.split("|||");
    return { from, to };
  });

  const outputJson = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    options: {
      maxPages,
      crawlDelayMs,
      timeoutMs,
      viewportWidth,
      viewportHeight,
      retries,
      keepQueryParams,
      includePathRegex: includePathRegex || "",
      excludePathRegex: excludePathRegex || "",
      includeSitemapSeeds,
    },
    totals: {
      pages: nodeList.length,
      edges: edgeList.length,
      errors: errors.length,
    },
    nodes: nodeList,
    edges: edgeList,
    errors,
  };

  const jsonPath = path.join(outputDir, "site-map.json");
  const csvPath = path.join(outputDir, "site-map-figma.csv");
  const mermaidPath = path.join(outputDir, "site-map.mmd");
  const htmlPath = path.join(outputDir, "index.html");

  fs.writeFileSync(jsonPath, `${JSON.stringify(outputJson, null, 2)}\n`, "utf8");
  writeCsv(
    csvPath,
    ["id", "label", "url", "path", "parentUrl", "depth", "status", "screenshotPath"],
    nodeList
  );
  writeMermaid(mermaidPath, nodeList, edgeList);
  writeHtmlIndex(
    htmlPath,
    nodeList,
    `Site map screenshots (${new URL(baseUrl).host})`
  );

  return {
    jsonPath,
    csvPath,
    mermaidPath,
    htmlPath,
    screenshotsDir,
    totals: outputJson.totals,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outputDir = path.resolve(
    process.cwd(),
    args["output-dir"] || "artifacts/site-map/latest"
  );

  let baseUrl = args["base-url"];
  if (!baseUrl && !boolArg(args["no-auto-detect"], false)) {
    console.log("No --base-url provided, attempting deployment auto-detection...");
    baseUrl = detectMainDeploymentUrl({
      deploymentEnvironment:
        args["deployment-environment"] || "Production – experiment-hub",
      fallbackEnvironment: args["fallback-environment"] || "Production",
    });
    console.log(`Auto-detected base URL: ${baseUrl}`);
  }

  if (!baseUrl) {
    throw new Error(
      "Missing base URL. Provide --base-url https://your-production-url"
    );
  }

  const options = {
    baseUrl,
    outputDir,
    maxPages: parsePositiveInt(args["max-pages"], 300),
    crawlDelayMs: parseMaybeInt(args["crawl-delay-ms"], 1200),
    timeoutMs: parsePositiveInt(args["timeout-ms"], 30_000),
    viewportWidth: parsePositiveInt(args["viewport-width"], 1440),
    viewportHeight: parsePositiveInt(args["viewport-height"], 900),
    retries: parseMaybeInt(args.retries, 2),
    keepQueryParams: boolArg(args["keep-query-params"], false),
    includePathRegex: args["include-path-regex"],
    excludePathRegex: args["exclude-path-regex"],
    includeSitemapSeeds: boolArg(args["include-sitemap-seeds"], true),
    browserChannel: args["browser-channel"] || "chrome",
    executablePath: args["executable-path"] || "",
    userAgent: args["user-agent"] || "",
    seedUrls: [],
  };

  if (args["seed-file"]) {
    const seedFilePath = path.resolve(process.cwd(), args["seed-file"]);
    const text = fs.readFileSync(seedFilePath, "utf8");
    options.seedUrls = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"));
  }

  console.log("Starting crawl with options:");
  console.log(JSON.stringify(options, null, 2));

  const result = await captureSiteMap(options);

  console.log("\nDone.");
  console.log(`Pages: ${result.totals.pages}`);
  console.log(`Edges: ${result.totals.edges}`);
  console.log(`Errors: ${result.totals.errors}`);
  console.log(`JSON: ${result.jsonPath}`);
  console.log(`CSV: ${result.csvPath}`);
  console.log(`Mermaid: ${result.mermaidPath}`);
  console.log(`HTML preview: ${result.htmlPath}`);
  console.log(`Screenshots: ${result.screenshotsDir}`);
}

main().catch((error) => {
  console.error(`site-map capture failed: ${error.message}`);
  process.exit(1);
});
