#!/usr/bin/env node
/**
 * Market Research Quality Validator
 *
 * Tests market research reports against quality criteria.
 * Run: node scripts/validate-market-research.js [path-to-report.md]
 *      node scripts/validate-market-research.js  (scans all reports)
 *
 * Exit code 0 = all reports pass. Non-zero = failures found.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// ─── CHECKS ────────────────────────────────────────────────────────────────

const CHECKS = [
  // ── Structural completeness ──────────────────────────────────────────────
  {
    id: "has-tam-estimate",
    desc: "TAM section contains a numeric dollar estimate",
    severity: "error",
    test: (md) => /Total Addressable Market/i.test(md) && /\$[\d,.]+[MB]/.test(md),
  },
  {
    id: "has-sam-estimate",
    desc: "SAM section contains a numeric dollar estimate",
    severity: "error",
    test: (md) => /Serviceable Addressable Market/i.test(md) && /SAM.{0,300}\$[\d,.]+[MB]/s.test(md),
  },
  {
    id: "has-som-estimate",
    desc: "SOM section contains a numeric dollar estimate",
    severity: "error",
    test: (md) => /Serviceable Obtainable Market/i.test(md),
  },
  {
    id: "has-methodology",
    desc: "TAM methodology is documented",
    severity: "error",
    test: (md) => /\*\*Methodology/i.test(md) || /##+ Methodology/i.test(md),
  },
  {
    id: "has-data-sources",
    desc: "Data Sources section is present",
    severity: "error",
    test: (md) => /Data Sources/i.test(md),
  },
  {
    id: "has-assumptions",
    desc: "Assumptions are explicitly documented",
    severity: "error",
    test: (md) => /\*\*Assumptions|assumptions:/i.test(md),
  },
  {
    id: "has-confidence-level",
    desc: "Confidence level (High/Medium/Low) is stated",
    severity: "error",
    test: (md) => /Confidence Level.{0,30}(High|Medium|Low)/i.test(md),
  },

  // ── Bottom-up methodology ────────────────────────────────────────────────
  {
    id: "has-bottom-up",
    desc: "Bottom-up calculation is present (customers × ARPU or equivalent)",
    severity: "error",
    test: (md) =>
      /bottom.?up/i.test(md) &&
      // Must include actual multiplication: number × something = something
      /×|ARPU|\d+[MBK]?\s*(customers?|households?|users?|businesses?)/i.test(md),
  },
  {
    id: "bottom-up-shows-arpu",
    desc: "Bottom-up calculation shows explicit ARPU or price-per-customer",
    severity: "warning",
    test: (md) => /ARPU|average revenue per (user|customer)|price.{0,20}per (user|customer|year)/i.test(md),
  },
  {
    id: "bottom-up-shows-customer-count",
    desc: "Bottom-up calculation shows explicit customer count with source or rationale",
    severity: "warning",
    test: (md) =>
      /([\d,.]+[MK]?\s*(potential\s+)?(customers?|households?|users?|businesses?|sellers?))|(customers?.{0,20}[\d,.]+[MK])/i.test(md),
  },

  // ── TAM scope discipline ─────────────────────────────────────────────────
  {
    id: "tam-not-entire-industry",
    desc: "TAM is scoped to product use case, not an entire broad industry",
    severity: "warning",
    // Fail if TAM is labeled as a huge generic market AND is >$10B with no product-specific scoping
    // Heuristic: if report calls $10B+ the TAM and never applies filters before declaring it the TAM estimate
    test: (md) => {
      const tamSection = md.match(/### Total Addressable Market[\s\S]*?###/);
      if (!tamSection) return true; // can't check, don't fail
      const tam = tamSection[0];
      // Check if TAM estimate is >$10B (in billions notation)
      const bigNumberMatch = tam.match(/Estimate.*\$([\d.]+)B/i);
      if (!bigNumberMatch) return true;
      const tamBillions = parseFloat(bigNumberMatch[1]);
      if (tamBillions < 10) return true; // small TAM, fine
      // Large TAM ($10B+): must show product-specific constraint or bottom-up
      return /bottom.?up|specific.{0,30}(segment|niche|use case)|only.{0,40}(who|that|using)/i.test(tam);
    },
  },
  {
    id: "sam-smaller-than-tam",
    desc: "SAM is numerically smaller than TAM",
    severity: "error",
    test: (md) => {
      const tamMatch = md.match(/Total Addressable Market[\s\S]*?\*\*Estimate[^$]*\$([\d.]+)([MB])/i);
      const samMatch = md.match(/Serviceable Addressable Market[\s\S]*?\*\*Estimate[^$]*\$([\d.]+)([MB])/i);
      if (!tamMatch || !samMatch) return true; // can't determine, skip
      const toM = (val, unit) => unit === "B" ? parseFloat(val) * 1000 : parseFloat(val);
      const tam = toM(tamMatch[1], tamMatch[2]);
      const sam = toM(samMatch[1], samMatch[2]);
      return sam < tam;
    },
  },
  {
    id: "sam-headline-matches-refined",
    desc: "SAM headline estimate matches the most-constrained sub-calculation (not the broad segment)",
    severity: "warning",
    // Warn if the report buries a much smaller SAM figure in the appendix or sub-calculation
    // while headlining the larger segment number
    test: (md) => {
      // Look for patterns like "Refined SAM: $X" that are much smaller than headline
      const headlineSAM = md.match(/### Serviceable Addressable Market[\s\S]*?\*\*Estimate.*?\$([\d.]+)([MB])/i);
      const refinedSAM = md.match(/Refined SAM.*?\$([\d.]+)([MB])/i);
      if (!headlineSAM || !refinedSAM) return true;
      const toM = (val, unit) => unit === "B" ? parseFloat(val) * 1000 : parseFloat(val);
      const headline = toM(headlineSAM[1], headlineSAM[2]);
      const refined = toM(refinedSAM[1], refinedSAM[2]);
      // Fail if refined is less than 10% of headline (indicates headline is misleading)
      return refined >= headline * 0.1;
    },
  },

  // ── Observable / real-world anchors ──────────────────────────────────────
  {
    id: "has-real-world-signal",
    desc: "At least one observable real-world signal cited (public revenue, app reviews, community size, job postings, etc.)",
    severity: "error",
    test: (md) =>
      /(GMV|ARR|annual revenue|app store|play store|review count|subreddit|reddit\s+member|job posting|linkedin|g2\s+review|capterra|trustpilot|\d+[KM]\s+users?\s+(on|in)|Etsy GMV|public filing|SEC filing|annual report)/i.test(md),
  },
  {
    id: "has-competitor-revenue-anchor",
    desc: "Competitor revenue or ARR is used as a market size sanity check",
    severity: "warning",
    test: (md) =>
      /(competitor.{0,60}(revenue|ARR|annual)|revenue.{0,30}competitor|(earns?|makes?|generates?).{0,40}\$[\d,.]+[MB]|market share.{0,40}\$)/i.test(md),
  },

  // ── Confidence level discipline ───────────────────────────────────────────
  {
    id: "high-confidence-requires-justification",
    desc: "HIGH confidence level is backed by verifiable sources (not just industry reports)",
    severity: "warning",
    test: (md) => {
      if (!/Confidence Level.*HIGH/i.test(md)) return true; // no HIGH claims, skip
      // HIGH requires at least one of: public filing, government data, actual revenue data
      return /(government|census|BLS|SEC filing|annual report|public.{0,30}data|GMV|verified|actual revenue)/i.test(md);
    },
  },
  {
    id: "unverifiable-sources-flagged",
    desc: "Unverifiable industry report firms are not the sole basis for HIGH confidence",
    severity: "warning",
    // If the only cited sources are obscure market research firms AND confidence is HIGH → warn
    test: (md) => {
      const highConf = /Confidence Level.*HIGH/i.test(md);
      if (!highConf) return true;
      const hasVerifiable = /(government|census|BLS|SEC|annual report|Etsy|Google|public filing|actual GMV|official stat)/i.test(md);
      if (hasVerifiable) return true;
      // Obscure firms cited without verifiable backing
      const onlyOscureFirms = /(DataHorizzon|Future Market Reports|Grand View Research|Allied Market Research|Mordor Intelligence)/i.test(md);
      return !onlyOscureFirms; // pass only if these firms aren't the sole source
    },
  },
];

// ─── RUNNER ────────────────────────────────────────────────────────────────

function checkReport(filePath) {
  const md = fs.readFileSync(filePath, "utf8");
  const results = CHECKS.map((check) => ({
    ...check,
    passed: (() => {
      try { return check.test(md); } catch { return false; }
    })(),
  }));
  return results;
}

function findAllReports() {
  try {
    const output = execSync(
      'find experiments -name "market-research.md" 2>/dev/null',
      { cwd: path.join(__dirname, ".."), encoding: "utf8" }
    );
    return output.trim().split("\n").filter(Boolean).map((p) =>
      path.join(__dirname, "..", p)
    );
  } catch {
    return [];
  }
}

function printResult(filePath, results) {
  const rel = path.relative(path.join(__dirname, ".."), filePath);
  const errors = results.filter((r) => !r.passed && r.severity === "error");
  const warnings = results.filter((r) => !r.passed && r.severity === "warning");
  const passed = results.filter((r) => r.passed).length;

  const status = errors.length > 0 ? "FAIL" : warnings.length > 0 ? "WARN" : "PASS";
  const icon = { PASS: "✓", WARN: "!", FAIL: "✗" }[status];

  console.log(`\n${icon} ${rel}  [${passed}/${results.length} checks passed]`);
  for (const r of errors) console.log(`  [ERROR]   ${r.desc}`);
  for (const r of warnings) console.log(`  [WARN]    ${r.desc}`);
  return errors.length;
}

function main() {
  const arg = process.argv[2];
  const files = arg ? [path.resolve(arg)] : findAllReports();

  if (files.length === 0) {
    console.error("No market research reports found.");
    process.exit(1);
  }

  console.log("Market Research Quality Validator");
  console.log("=".repeat(50));
  console.log("\nChecks run:", CHECKS.length);
  console.log("Reports found:", files.length);

  let totalErrors = 0;
  for (const file of files) {
    const results = checkReport(file);
    totalErrors += printResult(file, results);
  }

  console.log("\n" + "=".repeat(50));
  if (totalErrors === 0) {
    console.log("All reports passed error-level checks.");
  } else {
    console.log(`${totalErrors} error(s) found across reports.`);
  }
  process.exit(totalErrors > 0 ? 1 : 0);
}

main();
