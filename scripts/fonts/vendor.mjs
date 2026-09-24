#!/usr/bin/env node
/**
 * Vendor the hub's webfonts into the repo
 * ---------------------------------------
 * `next/font/google` downloads font files from Google at BUILD time, so a
 * transient Google Fonts outage fails `next build` outright. That is not a
 * theoretical risk: it took down the production deploy of d263f99 (#518) with
 *
 *     Module not found: [next]/internal/font/google/syne_f2778331.module.css
 *
 * while the PR preview of identical code had succeeded minutes earlier.
 *
 * Since beckharrisdesign.com now loads its CSS from public/super/site.css on
 * this same Vercel project, a failed hub build silently stops portfolio CSS
 * updates from shipping (see experiments/super-css-control/README.md). A build
 * that depends on a third party staying up is the thing to remove.
 *
 * So the files are fetched ONCE, here, and committed. `next/font/local` then
 * reads them off disk and the build touches the network for fonts never again.
 *
 *   node scripts/fonts/vendor.mjs          # refresh; rewrites files + manifest
 *   node scripts/fonts/vendor.mjs --check  # verify on-disk files match manifest
 *
 * Re-run only to pick up a new upstream font version. The manifest records the
 * exact gstatic URL and a sha256 of every file, so a refresh is reviewable as a
 * diff instead of an opaque binary swap.
 */

import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');
const OUT_DIR = resolve(REPO, 'app/fonts');
const MANIFEST = resolve(OUT_DIR, 'manifest.json');

/**
 * Google serves a different file per unicode-range subset. The hub only ever
 * asked for `latin` (see app/layout.tsx), so take exactly that block — pulling
 * the whole family would quietly multiply the committed bytes for glyphs no
 * page renders.
 */
const SUBSET = 'latin';

/**
 * `query` is the css2 API's family spec. Both families are variable, so one
 * file covers the full 100..900 weight range — including the 500/600/700 the
 * layout asks for — and there is no per-weight file to keep in sync.
 */
const FAMILIES = [
  { file: 'inter-latin-variable.woff2', query: 'Inter:wght@100..900' },
  { file: 'fraunces-latin-variable.woff2', query: 'Fraunces:opsz,wght@9..144,100..900' },
];

// css2 hands a woff2 url only to a browser that advertises support; the default
// Node UA gets ttf, which is ~4x the bytes for the same glyphs.
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

/** Pull the woff2 URL out of the `@font-face` block commented `/* latin *\/`. */
function woff2UrlForSubset(css, subset) {
  // Blocks are emitted as: /* subset */ @font-face { ... }
  const blocks = css.split('/*').slice(1);
  for (const block of blocks) {
    const name = block.slice(0, block.indexOf('*/')).trim();
    if (name !== subset) continue;
    const url = block.match(/src:\s*url\(([^)]+)\)\s*format\(['"]woff2['"]\)/);
    if (url) return url[1];
  }
  return null;
}

async function resolveFamily({ file, query }) {
  const cssUrl = `https://fonts.googleapis.com/css2?family=${query}&display=swap`;
  const res = await fetch(cssUrl, { headers: { 'User-Agent': UA }, cache: 'no-store' });
  if (!res.ok) throw new Error(`${cssUrl} returned ${res.status}`);
  const css = await res.text();

  const url = woff2UrlForSubset(css, SUBSET);
  if (!url) throw new Error(`No ${SUBSET} woff2 in the css for ${query}`);

  const font = await fetch(url, { cache: 'no-store' });
  if (!font.ok) throw new Error(`${url} returned ${font.status}`);
  const bytes = Buffer.from(await font.arrayBuffer());

  return { file, query, subset: SUBSET, url, bytes, sha256: sha256(bytes) };
}

async function main() {
  const checkOnly = process.argv.includes('--check');

  if (checkOnly) {
    if (!existsSync(MANIFEST)) {
      console.error('No app/fonts/manifest.json — run `node scripts/fonts/vendor.mjs` first.');
      process.exit(1);
    }
    // Deliberately offline: this is the guard that runs in CI, and reaching out
    // to Google to check that we no longer depend on Google would be silly.
    const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
    let bad = 0;
    for (const entry of manifest.fonts) {
      const path = resolve(OUT_DIR, entry.file);
      if (!existsSync(path)) {
        console.error(`MISSING  ${entry.file}`);
        bad++;
        continue;
      }
      const actual = sha256(readFileSync(path));
      if (actual !== entry.sha256) {
        console.error(`CHANGED  ${entry.file}\n  manifest ${entry.sha256}\n  on disk  ${actual}`);
        bad++;
      } else {
        console.log(`ok       ${entry.file}`);
      }
    }
    if (bad) {
      console.error(`\n${bad} font file(s) do not match the manifest.`);
      process.exit(1);
    }
    console.log('\nAll vendored fonts match the manifest.');
    return;
  }

  const resolved = [];
  for (const family of FAMILIES) {
    process.stdout.write(`fetching ${family.file} … `);
    const entry = await resolveFamily(family);
    writeFileSync(resolve(OUT_DIR, entry.file), entry.bytes);
    console.log(`${(entry.bytes.length / 1024).toFixed(1)} KB`);
    resolved.push(entry);
  }

  const manifest = {
    // Provenance, not decoration: without the source URL a future reader cannot
    // tell a vendored Google file from a hand-edited one.
    note: 'Generated by scripts/fonts/vendor.mjs — do not hand-edit. See that file for why these are committed.',
    generated: new Date().toISOString().slice(0, 10),
    subset: SUBSET,
    fonts: resolved.map(({ file, query, subset, url, sha256: hash, bytes }) => ({
      file,
      query,
      subset,
      url,
      bytes: bytes.length,
      sha256: hash,
    })),
  };
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`\nWrote ${resolved.length} files + manifest.json to app/fonts/`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
