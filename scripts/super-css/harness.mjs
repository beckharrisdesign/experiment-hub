/*
 * Shared Playwright harness for the Super site (beckharrisdesign.com).
 *
 * The site is Super rendering Notion, so there is no local copy of its pages.
 * This opens the LIVE pages and, with `local: true`, answers every request for
 * labs.beckharrisdesign.com/super/* from this repo's public/super/ instead —
 * site.css, components.js, the loader and its modules — so a change can be
 * seen and measured before it is merged. Without `local`, it measures exactly
 * what visitors get.
 *
 * Used by preview.mjs (screenshots) and measure-hero.mjs (spec checks).
 */
import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const SITE = 'https://beckharrisdesign.com';
const LABS = /^https:\/\/labs\.beckharrisdesign\.com\/super\/(.+?)(\?.*)?$/;
const PUBLIC_SUPER = fileURLToPath(new URL('../../public/super/', import.meta.url));

const TYPES = { '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.woff2': 'font/woff2' };

export const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  laptop: { width: 1024, height: 768 },
  phone: { width: 390, height: 844 },
};

export const PAGES = {
  home: '/',
  consulting: '/bhd-consultation',
  labs: '/bhd-labs',
  about: '/katy-harris',
  caseStudy: '/rebuilding-a-design-function',
};

/** Parse `--local`, `--out <file>`, `--only <a,b>` from argv. */
export function args(argv = process.argv.slice(2)) {
  const out = { local: argv.includes('--local'), out: null, only: null };
  const o = argv.indexOf('--out');
  if (o >= 0) out.out = argv[o + 1];
  const n = argv.indexOf('--only');
  if (n >= 0) out.only = argv[n + 1].split(',');
  return out;
}

export async function launch() {
  return chromium.launch();
}

/**
 * A page at one viewport, optionally serving public/super/ locally.
 * @param {import('@playwright/test').Browser} browser
 * @param {{ width: number, height: number }} viewport
 * @param {{ local?: boolean, reducedMotion?: 'reduce' | 'no-preference' }} [opts]
 */
export async function openContext(browser, viewport, { local = false, reducedMotion = 'no-preference' } = {}) {
  const context = await browser.newContext({ viewport, reducedMotion, deviceScaleFactor: 1 });
  if (local) {
    await context.route(LABS, async (route) => {
      const [, file] = route.request().url().match(LABS);
      const full = path.join(PUBLIC_SUPER, file);
      if (!full.startsWith(PUBLIC_SUPER)) return route.abort();
      try {
        const body = await readFile(full);
        await route.fulfill({
          status: 200,
          body,
          headers: {
            'content-type': TYPES[path.extname(full)] ?? 'application/octet-stream',
            'access-control-allow-origin': '*',
            'cache-control': 'no-store',
          },
        });
      } catch {
        await route.continue(); // not in the repo (e.g. lightbox fonts) — use live
      }
    });
  }
  return context;
}

/** Navigate and wait for Super, the stylesheet and the loader to settle. */
export async function visit(page, pathname) {
  await page.goto(SITE + pathname, { waitUntil: 'load', timeout: 60_000 });
  // Super sometimes holds a connection open; idle is a nicety, not a gate.
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600); // loader's first pass + rAF
}
