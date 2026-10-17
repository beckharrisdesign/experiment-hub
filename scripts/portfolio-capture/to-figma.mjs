#!/usr/bin/env node
/**
 * Compact a geometry record into the minimum a Figma generator needs.
 *
 * The raw records carry more than a frame does (page-absolute y, class strings,
 * every run). This strips to measured boxes plus the copy that goes in them, so
 * a view's spec fits in one plugin call and the frames stay *generated* rather
 * than hand-placed.
 *
 *   node scripts/portfolio-capture/to-figma.mjs home
 *   node scripts/portfolio-capture/to-figma.mjs --all --sizes
 */

import { readFile, readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIR = resolve(HERE, '../../experiments/super-css-control/geometry');

const kind = (cls) => {
  if (cls.includes('notion-divider')) return 'div';
  if (cls.includes('column-list')) return 'cols';
  if (cls.includes('properties-layout')) return 'props';
  if (cls.includes('collection-board')) return 'board';
  if (cls.includes('collection-table')) return 'table';
  if (cls.includes('notion-callout')) return 'callout';
  if (cls.includes('notion-heading')) return 'h';
  return 'text';
};

const trim = (runs, n) =>
  (runs || [])
    .filter((r) => r.t && r.t.length > 1)
    .slice(0, n)
    .map((r) => ({ g: r.tag, t: r.t.slice(0, 190) }));

export async function compact(id) {
  const raw = JSON.parse(await readFile(resolve(DIR, `${id}.json`), 'utf8'));
  const top = raw.blocks.length ? Math.min(...raw.blocks.map((b) => b.y)) : 0;

  const blocks = raw.blocks
    .filter((b) => b.h > 2 || kind(b.cls) === 'div') // drop pure spacers, keep rules
    .map((b) => {
      const o = { k: kind(b.cls), x: b.x, y: b.y - top, w: b.w, h: b.h };
      if (b.columns) {
        o.cols = b.columns.map((c) => ({
          x: c.x,
          w: c.w,
          e: c.empty || undefined,
          r: c.empty ? undefined : trim(c.runs, 8),
        }));
      } else {
        const r = trim(b.runs, 6);
        if (r.length) o.r = r;
        else if (b.text) o.r = [{ g: 'p', t: b.text }];
      }
      const g = b.grid;
      if (g) {
        o.grid = {
          x: g.x,
          w: g.w,
          n: g.cardCount,
          tpl: g.templateColumns,
          gap: g.gap,
          cw: g.card ? g.card.w : null,
          ch: g.card ? g.card.h : null,
          cov: g.cover,
        };
      }
      return o;
    });

  return {
    id: raw.id,
    label: raw.label,
    route: raw.route,
    tier: raw.tier,
    w: raw.notionRoot.w,
    h: raw.notionRoot.h + 120,
    pad: parseInt(raw.notionRoot.paddingInline, 10),
    blocks,
  };
}

async function main() {
  const arg = process.argv[2];
  if (arg === '--all') {
    const files = (await readdir(DIR)).filter((f) => f.endsWith('.json'));
    const sizes = [];
    for (const f of files) {
      const c = await compact(f.replace('.json', ''));
      sizes.push({ id: c.id, blocks: c.blocks.length, chars: JSON.stringify(c).length });
    }
    sizes.sort((a, b) => b.chars - a.chars);
    for (const s of sizes) {
      console.log(`  ${s.id.padEnd(16)} blocks=${String(s.blocks).padStart(3)}  spec=${String(s.chars).padStart(6)} chars`);
    }
    console.log(`\n  total ${sizes.reduce((n, s) => n + s.chars, 0)} chars`);
    return;
  }
  console.log(JSON.stringify(await compact(arg), null, 0));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
