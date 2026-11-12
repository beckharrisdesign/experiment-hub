// Ship gate: Lighthouse mobile on the built site. Fails if any category < 95, LCP ≥ 1.5 s or CLS ≥ 0.05.
// Usage: node scripts/lighthouse.mjs [url]   (default: http://localhost:4329/, i.e. `astro preview --port 4329`)
// Takes the MEDIAN of LH_RUNS runs (default 3), as Lighthouse recommends for CI: single runs on shared
// runners swing by 20+ points. LH_CPU overrides the CPU slowdown (default 4) for local stress tests.
// CHROME_PATH must point at a Chrome/Chromium binary (CI uses Playwright's).
import { writeFileSync } from "node:fs";
import * as chromeLauncher from "chrome-launcher";
import lighthouse from "lighthouse";

const url = process.argv[2] ?? "http://localhost:4329/";
const RUNS = Number(process.env.LH_RUNS ?? 3);

/**
 * Lighthouse's default 4× CPU slowdown emulates a mid-tier phone *from a fast desktop*. On a slower
 * machine (a 2-core CI runner) the same 4× emulates a much slower phone. Lighthouse's throttling docs
 * calibrate by the machine's measured benchmarkIndex: ≥ 1300 → 4×, 800–1300 → 2×, < 800 → 1×.
 * We measure first, then apply that table. LH_CPU overrides it for stress tests.
 */
function cpuFor(benchmarkIndex) {
  if (process.env.LH_CPU) return Number(process.env.LH_CPU);
  return benchmarkIndex >= 1300 ? 4 : benchmarkIndex >= 800 ? 2 : 1;
}

const chrome = await chromeLauncher.launch({ chromeFlags: ["--headless=new", "--no-sandbox"] });
try {
  const probe = (await lighthouse(url, { port: chrome.port, output: "json", logLevel: "error", onlyCategories: ["performance"] })).lhr;
  const benchmarkIndex = Math.round(probe.environment.benchmarkIndex);
  const cpu = cpuFor(benchmarkIndex);
  console.log(`machine benchmarkIndex ${benchmarkIndex} → CPU slowdown ${cpu}× (Lighthouse calibration table)`);
  const config = { extends: "lighthouse:default", settings: { throttling: { ...probe.configSettings.throttling, cpuSlowdownMultiplier: cpu } } };
  const runs = [];
  for (let i = 0; i < RUNS; i++) runs.push((await lighthouse(url, { port: chrome.port, output: "json", logLevel: "error" }, config)).lhr); // mobile, simulated throttling
  runs.sort((a, b) => a.categories.performance.score - b.categories.performance.score);
  const lhr = runs[Math.floor(runs.length / 2)];
  console.log("performance by run:", runs.map((r) => Math.round(r.categories.performance.score * 100)).join(", "), "→ median run used");
  // The brief's four categories (Lighthouse 13 also reports others, e.g. agentic-browsing).
  const cats = Object.fromEntries(["performance", "accessibility", "best-practices", "seo"].map((k) => [k, Math.round(lhr.categories[k].score * 100)]));
  const lcp = lhr.audits["largest-contentful-paint"].numericValue;
  const cls = lhr.audits["cumulative-layout-shift"].numericValue;
  const report = { url, lighthouse: lhr.lighthouseVersion, formFactor: lhr.configSettings.formFactor, benchmarkIndex, cpuSlowdown: cpu, runs: RUNS, ...cats, lcpMs: Math.round(lcp), cls: Number(cls.toFixed(3)) };
  writeFileSync("lighthouse-summary.json", JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  const fails = [
    ...Object.entries(cats).filter(([, s]) => s < 95).map(([k, s]) => `${k} ${s} < 95`),
    ...(lcp >= 1500 ? [`LCP ${Math.round(lcp)} ms ≥ 1500`] : []),
    ...(cls >= 0.05 ? [`CLS ${cls.toFixed(3)} ≥ 0.05`] : []),
  ];
  if (fails.length) {
    for (const [id, a] of Object.entries(lhr.audits)) if (a.score !== null && a.score < 0.9 && a.scoreDisplayMode !== "informative") console.log(`  audit ${id}: ${a.score} ${a.displayValue ?? ""}`);
    console.error("Ship gate FAILED: " + fails.join("; "));
    process.exitCode = 1;
  } else console.log("Ship gate passed.");
} finally {
  await chrome.kill();
}
