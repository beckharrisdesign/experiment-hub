#!/usr/bin/env node
/*
 * Screenshot beckharrisdesign.com at 1440×900, 1024×768 and 390×844 — the live
 * site, or with --local the live pages carrying this repo's public/super/
 * (see harness.mjs). First screen only; --scrolled adds a second shot 1200px
 * down, for the compact navbar.
 *
 *   node scripts/super-css/preview.mjs --local
 *   node scripts/super-css/preview.mjs --local --out /path/to/screens --only home,caseStudy
 *
 * Without --out, screenshots go to <os tmpdir>/super-preview/{live,local}.
 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { args, launch, openContext, visit, VIEWPORTS, PAGES } from './harness.mjs';

const opts = args();
const scrolled = process.argv.includes('--scrolled');
const outDir = opts.out ?? path.join(os.tmpdir(), 'super-preview', opts.local ? 'local' : 'live');
const pages = Object.entries(PAGES).filter(([k]) => !opts.only || opts.only.includes(k));

const browser = await launch();
try {
  await mkdir(outDir, { recursive: true });
  for (const [vpName, viewport] of Object.entries(VIEWPORTS)) {
    const ctx = await openContext(browser, viewport, { local: opts.local });
    const page = await ctx.newPage();
    for (const [name, pathname] of pages) {
      await visit(page, pathname);
      const file = path.join(outDir, `${name}-${vpName}.png`);
      await page.screenshot({ path: file });
      console.log(file);
      if (scrolled) {
        await page.mouse.wheel(0, 1200);
        await page.waitForTimeout(500);
        const f2 = path.join(outDir, `${name}-${vpName}-scrolled.png`);
        await page.screenshot({ path: f2 });
        console.log(f2);
      }
    }
    await ctx.close();
  }
} finally {
  await browser.close();
}
