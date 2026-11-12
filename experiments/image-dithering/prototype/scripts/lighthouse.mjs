// Ship gate: Lighthouse mobile on the built site. Fails if any category < 95, LCP ≥ 1.5 s or CLS ≥ 0.05.
// Usage: node scripts/lighthouse.mjs [url]   (default: http://localhost:4329/, i.e. `astro preview --port 4329`)
// CHROME_PATH must point at a Chrome/Chromium binary (CI uses Playwright's).
import { writeFileSync } from "node:fs";
import * as chromeLauncher from "chrome-launcher";
import lighthouse from "lighthouse";

const url = process.argv[2] ?? "http://localhost:4329/";
const chrome = await chromeLauncher.launch({ chromeFlags: ["--headless=new", "--no-sandbox"] });
try {
  const { lhr } = await lighthouse(url, { port: chrome.port, output: "json", logLevel: "error" }); // default: mobile, simulated throttling
  // The brief's four categories (Lighthouse 13 also reports others, e.g. agentic-browsing).
  const cats = Object.fromEntries(["performance", "accessibility", "best-practices", "seo"].map((k) => [k, Math.round(lhr.categories[k].score * 100)]));
  const lcp = lhr.audits["largest-contentful-paint"].numericValue;
  const cls = lhr.audits["cumulative-layout-shift"].numericValue;
  const report = { url, lighthouse: lhr.lighthouseVersion, formFactor: lhr.configSettings.formFactor, ...cats, lcpMs: Math.round(lcp), cls: Number(cls.toFixed(3)) };
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
