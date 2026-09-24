#!/usr/bin/env node
/**
 * Super CSS compatibility check
 * -----------------------------
 * Answers four questions about beckharrisdesign.com without opening a browser:
 *
 *   1. DELIVERY  — is the external <link> installed, or is Super still
 *                  inlining the CSS itself?
 *   2. DRIFT     — if Super still holds an inline copy, does it match the
 *                  repo file? (the two-copies problem)
 *   3. VARIABLES — every Super theme variable the library reads: still defined?
 *   4. SELECTORS — every class the library targets: still present in the DOM?
 *
 * Exit code 0 = clean, 1 = something needs attention.
 *
 *   node scripts/super-css/check.mjs
 *   node scripts/super-css/check.mjs --json
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');
const CSS_PATH = resolve(REPO, 'public/super/site.css');

const SITE = 'https://beckharrisdesign.com';
const ASSET_URL = 'https://labs.beckharrisdesign.com/super/site.css';

/** Representative routes — one of each page shape the library styles. */
const ROUTES = [
  '/', // homepage: tokens, navbar, full-bleed callouts
  '/all-projects', // gallery collection
  '/bhd-labs', // labs cards + borderless tables
  '/bhd-labs/mvds', // project page: header, page properties
  '/for-babylist', // section 9: the curated card row
];

/** Variables the library defines itself — not Super's to provide. */
const SELF_DEFINED = new Set([
  '--site-max-width',
  '--content-max-width',
  '--accent',
  '--pill-bg',
  '--callout-bg',
  '--collection-gap',
]);

const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

async function get(url) {
  const res = await fetch(url, { cache: 'no-store' });
  return { ok: res.ok, status: res.status, text: res.ok ? await res.text() : '' };
}

/** Every `var(--x)` the library reads. */
function referencedVars(css) {
  const out = new Set();
  for (const m of strip(css).matchAll(/var\(\s*(--[\w-]+)/g)) out.add(m[1]);
  return [...out].filter((v) => !SELF_DEFINED.has(v)).sort();
}

/** Every `.class` the library targets, plus `[class*="page__for-"]` prefixes. */
function targetedClasses(css) {
  const body = strip(css);
  const out = new Set();
  for (const m of body.matchAll(/\.((?:notion|super|gallery|page__|parent-page__)[\w-]*)/g)) {
    out.add(m[1]);
  }
  for (const m of body.matchAll(/\[class\*=["']([\w-]+)["']\]/g)) out.add(m[1]);
  return [...out].sort();
}

/** Variables Super defines anywhere in the served CSS. */
function definedVars(haystack) {
  const out = new Set();
  for (const m of haystack.matchAll(/(--[\w-]+)\s*:/g)) out.add(m[1]);
  return out;
}

/** Pull every <style> block plus every same-origin stylesheet. */
async function collectCss(html, origin) {
  let all = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n');
  const hrefs = [...html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*>/g)]
    .map((tag) => (tag[0].match(/href=["']([^"']+)["']/) || [])[1])
    .filter(Boolean)
    .map((h) => (h.startsWith('http') ? h : origin + h));
  for (const h of hrefs) {
    const r = await get(h).catch(() => ({ ok: false, text: '' }));
    if (r.ok) all += '\n' + r.text;
  }
  return all;
}

/** Fingerprints unique to the library — used to spot Super's inline copy. */
const FINGERPRINT = /--collection-gap|page__for-|calc\(\s*50%\s*-\s*50vw\s*\)/;

/**
 * Compare two CSS bodies for MEANING, not formatting.
 *
 * Super recompiles custom code when it inlines it and rewrites cosmetics on the
 * way: comments re-indented, `.5rem` -> `0.5rem`, `rgb(var(--x) / 0.5)` ->
 * `rgb(var(--x)/0.5)`.
 *
 * Whitespace BETWEEN values is load-bearing and must survive — `padding: 0 .5rem`
 * is two values, and collapsing it to `0.5rem` would silently change the meaning.
 * So: collapse runs of whitespace to one space, expand leading decimals, then
 * drop whitespace only where it is punctuation-adjacent and therefore decorative.
 */
const normalize = (css) =>
  strip(css)
    .replace(/\s+/g, ' ')
    .replace(/(?<!\d)\.(\d)/g, '0.$1') // .5rem -> 0.5rem, never 1.5 -> 10.5
    .replace(/\s*([{};:,()\/])\s*/g, '$1') // decorative space only
    .replace(/["']/g, '') // Super drops quotes in [class*="page__for-"]
    .trim();

async function main() {
  const asJson = process.argv.includes('--json');
  const local = readFileSync(CSS_PATH, 'utf8');
  const report = { delivery: null, drift: null, variables: [], selectors: [], problems: [] };

  const home = await get(SITE + '/');
  if (!home.ok) {
    console.error(`Could not reach ${SITE} (status ${home.status})`);
    process.exit(1);
  }

  // 1. DELIVERY -------------------------------------------------------------
  const linked = home.text.includes(ASSET_URL);
  const inlined = FINGERPRINT.test(home.text);
  report.delivery = linked ? 'external-link' : inlined ? 'super-inline' : 'absent';
  if (report.delivery === 'absent') {
    report.problems.push('The library is neither linked nor inlined — the site is running stock Super.');
  }

  // 2. DRIFT ----------------------------------------------------------------
  if (inlined) {
    const blocks = [...home.text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
    const carrier = blocks.find((b) => FINGERPRINT.test(b)) || '';
    // Super appends the library to its theme block, so check containment,
    // not equality — the block legitimately holds theme vars too.
    const localBody = normalize(local);
    const contains = normalize(carrier).includes(localBody);
    report.drift = contains ? 'in-sync' : 'DIFFERS';
    if (!contains) {
      report.problems.push(
        "Super's inline copy does not match public/super/site.css — the two have drifted.",
      );
    }
  } else {
    report.drift = 'n/a (not inlined)';
  }

  // 3 + 4. VARIABLES AND SELECTORS -----------------------------------------
  const wantVars = referencedVars(local);
  const wantSels = targetedClasses(local);
  const seenVars = new Set();
  const seenSels = new Set();

  for (const route of ROUTES) {
    const page = await get(SITE + route);
    if (!page.ok) {
      report.problems.push(`Route ${route} returned ${page.status}`);
      continue;
    }
    const css = await collectCss(page.text, SITE);
    for (const v of definedVars(css)) seenVars.add(v);
    for (const s of wantSels) if (page.text.includes(s)) seenSels.add(s);
  }

  report.variables = wantVars.map((v) => ({ name: v, present: seenVars.has(v) }));
  report.selectors = wantSels.map((s) => ({ name: s, present: seenSels.has(s) }));

  const missingVars = report.variables.filter((v) => !v.present);
  const missingSels = report.selectors.filter((s) => !s.present);
  for (const v of missingVars) {
    report.problems.push(`Theme variable ${v.name} is no longer defined by Super.`);
  }
  for (const s of missingSels) {
    report.problems.push(`Selector .${s.name} no longer appears on any sampled route.`);
  }

  // OUTPUT ------------------------------------------------------------------
  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    const mark = (ok) => (ok ? 'ok  ' : 'MISS');
    console.log(`\nSuper CSS check — ${SITE}\n`);
    console.log(`  delivery : ${report.delivery}`);
    console.log(`  drift    : ${report.drift}`);
    console.log(
      `  variables: ${report.variables.length - missingVars.length}/${report.variables.length} present`,
    );
    console.log(
      `  selectors: ${report.selectors.length - missingSels.length}/${report.selectors.length} present\n`,
    );
    for (const v of missingVars) console.log(`  ${mark(false)} var ${v.name}`);
    for (const s of missingSels) console.log(`  ${mark(false)} sel .${s.name}`);
    if (report.problems.length) {
      console.log('\nProblems:');
      for (const p of report.problems) console.log(`  - ${p}`);
      console.log('');
    } else {
      console.log('  No drift. The library and Super still agree.\n');
    }
  }

  process.exit(report.problems.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
