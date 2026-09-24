#!/usr/bin/env node
/**
 * Super CSS compatibility check
 * -----------------------------
 * Answers four questions about beckharrisdesign.com without opening a browser:
 *
 *   1. DELIVERY  — is the external <link> installed, or is Super still
 *                  inlining the CSS itself?
 *   2. FRESHNESS — does the served file match the repo file, and if not, WHY?
 *   3. VARIABLES — every Super theme variable the library reads: still defined?
 *   4. SELECTORS — every class the library targets: still present in the DOM?
 *
 * Exit code 0 = clean, 1 = something needs attention.
 *
 *   node scripts/super-css/check.mjs
 *   node scripts/super-css/check.mjs --json
 *   node scripts/super-css/check.mjs --no-fetch   # skip `git fetch origin main`
 *
 * On FRESHNESS: "the served file differs from mine" has several very different
 * causes, and guessing the wrong one costs an investigation. A failed
 * production deploy used to read as plain `STALE` under a message that led with
 * "uncommitted edit", which sends you to `git status` — where everything is
 * clean and nothing explains it. So the check now asks git which cause it
 * actually is, comparing the served file against origin/main rather than only
 * against the working tree:
 *
 *   deployed == origin/main  →  main shipped; any difference is local to you
 *                               (uncommitted edit, unmerged commit, or a stale
 *                               checkout) and the live site is fine
 *   deployed != origin/main  →  main has NOT shipped. The deploy failed or is
 *                               still running. Nothing you do locally fixes it.
 *
 * That second case is the one worth being loud about: the portfolio keeps
 * serving the last good CSS, so there is no outage to notice — the update just
 * silently does not land, which looks exactly like a stale edge cache.
 */

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');
const CSS_PATH = resolve(REPO, 'public/super/site.css');
/** Same file, spelled the way git wants it. */
const CSS_REPO_PATH = 'public/super/site.css';
/** What production deploys from — the only ref that can explain the live file. */
const BASE_REF = 'origin/main';

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

/**
 * Run git and never throw. A missing repo, a missing ref or no git at all are
 * all ordinary here — the check still has a useful answer without them, it just
 * cannot name the cause, and degrading to "unknown" beats crashing.
 */
function git(args) {
  try {
    const out = execFileSync('git', args, {
      cwd: REPO,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { ok: true, out };
  } catch {
    return { ok: false, out: '' };
  }
}

/**
 * Why does the served file differ from the local one?
 *
 * Order matters. origin/main is asked FIRST, because it is the only question
 * whose answer decides whether the live site is actually behind: everything
 * else is about your checkout, and a dirty checkout is not an incident.
 */
export function diagnoseFreshness(deployedBody, run = git) {
  const head = run(['rev-parse', '--is-inside-work-tree']);
  if (!head.ok) {
    return {
      cause: 'unknown',
      message:
        'Deployed CSS differs from public/super/site.css. (Not a git checkout, so the cause could not be narrowed.)',
    };
  }

  const onMain = run(['show', `${BASE_REF}:${CSS_REPO_PATH}`]);
  if (!onMain.ok) {
    return {
      cause: 'unknown',
      message: `Deployed CSS differs from public/super/site.css, and ${BASE_REF} could not be read to say why. Try \`git fetch origin main\`.`,
    };
  }

  const mainBody = normalize(onMain.out);
  const mainIsLive = mainBody === deployedBody;

  if (!mainIsLive) {
    // The important case. main holds CSS the live site is not serving, so the
    // deploy did not land — and since Vercel only promotes successful builds,
    // the last good CSS stays up and nothing looks broken.
    return {
      cause: 'deploy-not-landed',
      message:
        `The live file does not match ${BASE_REF} — main's CSS has NOT shipped. ` +
        'The production deploy failed or is still running; this is not something to fix locally. ' +
        'Check the Deploy Hub run for main, and re-run it if it failed (a build can fail on an unrelated flake).',
    };
  }

  // From here on main IS live, so the difference is local to this checkout.
  const dirty = run(['diff', '--quiet', 'HEAD', '--', CSS_REPO_PATH]).ok === false;
  if (dirty) {
    return {
      cause: 'uncommitted-edit',
      message: `${BASE_REF} is live and correct. Your copy of ${CSS_REPO_PATH} has uncommitted edits — that is the whole difference.`,
    };
  }

  const ahead = run(['rev-list', '--count', `${BASE_REF}..HEAD`, '--', CSS_REPO_PATH]);
  if (ahead.ok && Number(ahead.out.trim()) > 0) {
    return {
      cause: 'unmerged-commit',
      message: `${BASE_REF} is live and correct. Your branch has commit(s) to ${CSS_REPO_PATH} that are not on main yet — open a PR and merge to ship them.`,
    };
  }

  return {
    cause: 'stale-checkout',
    message: `${BASE_REF} is live and correct, and your checkout differs from it. You are probably behind — try \`git pull\`.`,
  };
}

async function main() {
  const asJson = process.argv.includes('--json');
  const local = readFileSync(CSS_PATH, 'utf8');

  // The diagnosis is only as current as origin/main, and a local ref that is a
  // day old would confidently blame the wrong thing — the exact failure this
  // check exists to stop. Refs only; the working tree is untouched.
  if (!process.argv.includes('--no-fetch')) git(['fetch', '--quiet', 'origin', 'main']);

  const report = {
    delivery: null,
    sources: [],
    markers: {},
    remote: null,
    cause: null,
    inline: null,
    variables: [],
    selectors: [],
    problems: [],
    notes: [],
  };

  const home = await get(SITE + '/');
  if (!home.ok) {
    console.error(`Could not reach ${SITE} (status ${home.status})`);
    process.exit(1);
  }

  // 1. SOURCES --------------------------------------------------------------
  // The two copies are NOT mutually exclusive. During the cutover both apply at
  // once, and because they are identical nothing on screen says so — which is
  // the whole reason each copy carries its own marker.
  const inlineBlocks = [...home.text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)]
    .map((m) => m[1])
    .filter((b) => FINGERPRINT.test(b));
  const inlined = inlineBlocks.length > 0;
  const linked = home.text.includes(ASSET_URL);

  report.sources = [linked && 'remote', inlined && 'inline'].filter(Boolean);
  report.delivery =
    report.sources.length === 2
      ? 'both'
      : report.sources[0] === 'remote'
        ? 'external-link'
        : report.sources[0] === 'inline'
          ? 'super-inline'
          : 'absent';

  if (report.delivery === 'absent') {
    report.problems.push('The library is neither linked nor inlined — the site is running stock Super.');
  }
  if (report.delivery === 'both') {
    report.problems.push(
      'Both copies are applying. Expected mid-cutover; clear Super\'s custom-CSS field to finish.',
    );
  }

  // Marker presence, read straight out of the served CSS.
  report.markers = {
    remote: /--bhd-css-remote\s*:/.test(home.text) || null,
    inline: inlineBlocks.some((b) => /--bhd-css-inline\s*:/.test(b)) || null,
  };
  if (inlined && !report.markers.inline) {
    report.notes.push(
      "Super's inline copy is untagged — add `--bhd-css-inline: 1;` to :root in its custom-CSS field.",
    );
  }

  // 2. FRESHNESS -------------------------------------------------------------
  const localBody = normalize(local);

  if (linked) {
    const asset = await get(ASSET_URL);
    if (!asset.ok) {
      report.remote = `unreachable (${asset.status})`;
      report.problems.push(`${ASSET_URL} returned ${asset.status} — the <link> resolves to nothing.`);
    } else {
      // Exact file, so compare equality rather than containment.
      const same = normalize(asset.text) === localBody;
      if (same) {
        report.remote = 'in-sync';
      } else {
        const { cause, message } = diagnoseFreshness(normalize(asset.text));
        report.cause = cause;
        report.remote = `STALE (${cause})`;
        // Only a deploy that did not land means the LIVE SITE is behind. The
        // local causes are notes: the site is fine, your checkout is not, and
        // calling that a problem trains you to ignore the ones that matter.
        if (cause === 'deploy-not-landed' || cause === 'unknown') report.problems.push(message);
        else report.notes.push(message);
      }
    }
  } else {
    report.remote = 'n/a (not linked)';
  }

  if (inlined) {
    // Super appends the library to its theme block, so check containment.
    const same = normalize(inlineBlocks[0]).includes(localBody);
    report.inline = same ? 'in-sync' : 'DIFFERS';
    if (!same) {
      report.problems.push(
        "Super's inline copy does not match public/super/site.css — the two have drifted.",
      );
    }
  } else {
    report.inline = 'n/a (not inlined)';
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
    console.log(`  delivery : ${report.delivery}` + (report.sources.length === 2 ? '  (both copies applying)' : ''));
    console.log(`  remote   : ${report.remote}`);
    console.log(`  inline   : ${report.inline}`);
    console.log(`  markers  : remote=${report.markers.remote ? 'yes' : 'no'} inline=${report.markers.inline ? 'yes' : 'no'}`);
    console.log(
      `  variables: ${report.variables.length - missingVars.length}/${report.variables.length} present`,
    );
    console.log(
      `  selectors: ${report.selectors.length - missingSels.length}/${report.selectors.length} present\n`,
    );
    for (const v of missingVars) console.log(`  ${mark(false)} var ${v.name}`);
    for (const s of missingSels) console.log(`  ${mark(false)} sel .${s.name}`);
    if (report.notes.length) {
      console.log('Notes:');
      for (const n of report.notes) console.log(`  - ${n}`);
      console.log('');
    }
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

const INVOKED_DIRECTLY =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (INVOKED_DIRECTLY) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
