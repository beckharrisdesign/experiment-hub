#!/usr/bin/env node
/**
 * Portfolio geometry extractor
 * ----------------------------
 * Renders every canonical view of beckharrisdesign.com and records its MEASURED
 * layout, because markup cannot describe layout.
 *
 * The homepage's left gutter is an empty `.notion-column`: no text, no
 * distinguishing class, invisible to any HTML parser. It exists only once a
 * browser computes the box model. Building the Figma capture from class names
 * instead of measurement is what put a missing column into rounds 01–02.5.
 *
 * Output: one JSON record per route under
 * experiments/super-css-control/geometry/, which is both the input to frame
 * generation and the baseline the drift check diffs against.
 *
 *   node scripts/portfolio-capture/geometry.mjs
 *   node scripts/portfolio-capture/geometry.mjs --view home
 *   node scripts/portfolio-capture/geometry.mjs --viewport 1000
 *
 * Needs Chromium. The repo already depends on it for scripts/capture-site-map.js;
 * if it is missing, run `npx playwright install chromium`.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { SITE, BASELINE_VIEWPORT, VIEWS } from './routes.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(HERE, '../../experiments/super-css-control/geometry');

function parseArgs(argv) {
  const args = { view: null, viewport: BASELINE_VIEWPORT.width };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--view') args.view = argv[i + 1];
    if (argv[i] === '--viewport') args.viewport = Number(argv[i + 1]);
  }
  return args;
}

/**
 * Runs in page context. Everything here is measured, never inferred.
 * Returns null for a required selector rather than guessing, so the caller can
 * fail loudly and name the route (task 3.4).
 */
function measure() {
  const root = document.querySelector('.notion-root');
  if (!root) return { error: 'no .notion-root' };

  const rootBox = root.getBoundingClientRect();
  const F = rootBox.left; // frame origin: everything is recorded relative to this
  const rel = (el) => {
    const r = el.getBoundingClientRect();
    return {
      x: Math.round(r.left - F),
      y: Math.round(r.top + window.scrollY),
      w: Math.round(r.width),
      h: Math.round(r.height),
    };
  };

  const blocks = [];
  for (const node of root.children) {
    const box = rel(node);
    if (box.h === 0) continue;

    // Columns INCLUDING empty ones — the whole reason this script exists.
    const columns = [...node.querySelectorAll(':scope > .notion-column')].map((c) => ({
      ...rel(c),
      empty: c.textContent.trim().length === 0,
      // Per-column runs, so a generator can place real copy into the measured box
      runs: [...c.querySelectorAll('h1,h2,h3,p,li,.notion-text__content')]
        .map((n) => ({
          tag: n.tagName.toLowerCase(),
          t: n.textContent.trim().replace(/\s+/g, ' ').slice(0, 320),
        }))
        .filter((r) => r.t)
        .slice(0, 14),
    }));

    const gallery = node.querySelector('.notion-collection-gallery');
    let grid;
    if (gallery) {
      const gs = getComputedStyle(gallery);
      const card = gallery.querySelector('.notion-collection-card');
      const cover = gallery.querySelector('.notion-collection-card__cover');
      grid = {
        ...rel(gallery),
        templateColumns: gs.gridTemplateColumns,
        gap: gs.gap,
        cardCount: gallery.querySelectorAll('.notion-collection-card').length,
        card: card ? rel(card) : null,
        cover: cover
          ? { w: Math.round(cover.getBoundingClientRect().width), h: Math.round(cover.getBoundingClientRect().height) }
          : null,
      };
    }

    blocks.push({
      cls: (node.className || '').split(' ').slice(0, 3).join(' '),
      ...box,
      text: node.textContent.trim().replace(/\s+/g, ' ').slice(0, 60),
      runs: node.querySelector(':scope > .notion-column')
        ? undefined
        : [...node.querySelectorAll('h1,h2,h3,p,li,.notion-text__content')]
            .map((n) => ({ tag: n.tagName.toLowerCase(), t: n.textContent.trim().replace(/\s+/g, ' ').slice(0, 320) }))
            .filter((r) => r.t)
            .slice(0, 14),
      columns: columns.length ? columns : undefined,
      grid,
    });
  }

  const dividers = [...root.querySelectorAll('.notion-divider')].map(rel);
  const tables = [...document.querySelectorAll('.notion-collection-table')].map(rel);
  const props = [...document.querySelectorAll('.notion-page__property')].map(rel);

  const cs = getComputedStyle(document.documentElement);
  return {
    viewport: window.innerWidth,
    rootFontSize: cs.fontSize,
    notionRoot: {
      x: Math.round(rootBox.left),
      w: Math.round(rootBox.width),
      h: Math.round(rootBox.height),
      paddingInline: getComputedStyle(root).paddingLeft,
    },
    pageClasses: [
      ...new Set(
        (document.body.innerHTML.match(/(?:^|["\s])(page__[a-z0-9-]+|parent-page__[a-z0-9-]+)/g) || [])
          .map((s) => s.trim().replace(/^["']/, ''))
          .slice(0, 4),
      ),
    ],
    blocks,
    dividers,
    tables,
    properties: props,
    emptyColumnCount: blocks.reduce(
      (n, b) => n + (b.columns ? b.columns.filter((c) => c.empty).length : 0),
      0,
    ),
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const views = args.view ? VIEWS.filter((v) => v.id === args.view) : VIEWS;
  if (views.length === 0) {
    console.error(`No view matching "${args.view}".`);
    process.exit(1);
  }

  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: args.viewport, height: BASELINE_VIEWPORT.height },
  });

  const failures = [];
  const summary = [];

  for (const view of views) {
    const url = SITE + view.route;
    let record;
    try {
      // Pages with embeds (video, tweets) never reach networkidle, so settle on
      // DOM + fonts and treat idle as best-effort. Layout is stable well before
      // a third-party iframe finishes chattering.
      const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
      await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
      if (!res || !res.ok()) {
        failures.push(`${view.id} (${view.route}) returned ${res ? res.status() : 'no response'}`);
        continue;
      }
      record = await page.evaluate(measure);
    } catch (err) {
      failures.push(`${view.id} (${view.route}) threw: ${String(err).slice(0, 120)}`);
      continue;
    }

    if (record.error) {
      // Fail loudly and name the route. A partial record is worse than none —
      // it would silently become the baseline the drift check trusts.
      failures.push(`${view.id} (${view.route}): ${record.error}`);
      continue;
    }

    const out = {
      id: view.id,
      label: view.label,
      route: view.route,
      tier: view.tier,
      capturedAt: new Date().toISOString(),
      ...record,
    };
    await writeFile(resolve(OUT_DIR, `${view.id}.json`), JSON.stringify(out, null, 2) + '\n');
    summary.push({
      view: view.id,
      blocks: record.blocks.length,
      emptyCols: record.emptyColumnCount,
      dividers: record.dividers.length,
      grids: record.blocks.filter((b) => b.grid).length,
    });
  }

  await browser.close();

  console.log(`\nGeometry — ${SITE} @ ${args.viewport}px\n`);
  for (const s of summary) {
    console.log(
      `  ${s.view.padEnd(16)} blocks=${String(s.blocks).padStart(3)}  emptyCols=${String(s.emptyCols).padStart(2)}  dividers=${String(s.dividers).padStart(2)}  grids=${s.grids}`,
    );
  }
  console.log(`\n  ${summary.length}/${views.length} captured → ${OUT_DIR}`);
  if (failures.length) {
    console.log('\nFailures:');
    for (const f of failures) console.log(`  - ${f}`);
    console.log('');
    process.exit(1);
  }
  console.log('');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
