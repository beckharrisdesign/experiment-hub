#!/usr/bin/env node
/*
 * Measure beckharrisdesign.com against the portfolio-header-hero specs.
 *
 * One check per tasks.md §1 outcome (1.1–1.17), each tied to its spec
 * scenario. Runs against the live site, or with --local against the live
 * pages carrying this repo's public/super/ (see harness.mjs). Prints a
 * pass / fail table; --out <file> also writes it as JSON.
 *
 *   node scripts/super-css/measure-hero.mjs                # live site
 *   node scripts/super-css/measure-hero.mjs --local        # this branch
 *   node scripts/super-css/measure-hero.mjs --local --out to-be/after.json
 *
 * States: pass · fail · content (waits on a Notion edit, tasks 3.10–3.12)
 * · manual (checked by hand in the QA walkthrough, tasks.md §4).
 *
 * Rebuilds the as-is capture method in
 * experiments/super-css-control/docs/portfolio-feedback-2026-11/README.md §4,
 * which was never committed.
 */
import sharp from 'sharp';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { args, launch, openContext, visit, VIEWPORTS, PAGES } from './harness.mjs';

const opts = args();
const results = [];
const record = (id, scenario, state, value, note = '') => results.push({ id, scenario, state, value, note });
const near = (a, b, tol) => Math.abs(a - b) <= tol;

/* ---------- colour helpers (WCAG 2.x) ---------- */
const lin = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const rgb = (css) => (css.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);

/* The hero column list on the homepage (design.md decision 6). */
const HERO = '.page__index .notion-root > .notion-column-list:first-child';

async function navState(page) {
  return page.evaluate(() => {
    const nav = document.querySelector('.super-navbar');
    const items = [...document.querySelectorAll('.super-navbar__item')];
    const crumbs = document.querySelector('.super-navbar__breadcrumbs');
    const crumbsShown = !!crumbs && getComputedStyle(crumbs).display !== 'none' && crumbs.getBoundingClientRect().height > 0;
    return {
      h: Math.round(nav.getBoundingClientRect().height),
      transition: getComputedStyle(nav).transitionDuration,
      current: items.filter((a) => a.getAttribute('aria-current') === 'page').map((a) => a.textContent.trim()),
      underlined: items.filter((a) => getComputedStyle(a).textDecorationLine.includes('underline')).map((a) => a.textContent.trim()),
      crumbsShown,
    };
  });
}

/** Lightest pixel behind an element, with its text hidden — the worst case for light text. */
async function worstBackground(page, selector) {
  const box = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    // Read the colour BEFORE hiding: the colour the text actually renders in.
    // Super colours inner spans, not always the block, so take it from the
    // first text node's parent.
    document.getElementById('bhd-measure')?.removeAttribute('id');
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.textContent.trim() ? 1 : 3) });
    const holder = walker.nextNode()?.parentElement ?? el;
    const color = getComputedStyle(holder).color;
    const r = el.getBoundingClientRect();
    el.id = 'bhd-measure'; // an id outranks Super's class rules on the text spans
    return { x: r.left, y: r.top, width: r.width, height: r.height, color };
  }, selector);
  if (!box || box.width < 1) return null;
  await page.addStyleTag({ content: '#bhd-measure, #bhd-measure * { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; } #bhd-measure::before, #bhd-measure::after { visibility: hidden !important; }' });
  const png = await page.screenshot({ clip: { x: box.x, y: box.y, width: box.width, height: box.height } });
  const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
  let best = null;
  let bestL = -1;
  for (let i = 0; i < data.length; i += info.channels) {
    const px = [data[i], data[i + 1], data[i + 2]];
    const l = lum(px);
    if (l > bestL) [bestL, best] = [l, px];
  }
  return { text: rgb(box.color), bg: best };
}

async function main() {
  const browser = await launch();
  const local = opts.local;
  try {
    /* ---------- portfolio-header: 1.1–1.3 (desktop) ---------- */
    {
      const ctx = await openContext(browser, VIEWPORTS.desktop, { local });
      const page = await ctx.newPage();
      await visit(page, PAGES.consulting);
      const top = await navState(page);
      await page.mouse.wheel(0, 1200);
      await page.waitForTimeout(500);
      const scrolled = await navState(page);
      record('1.1', 'Navbar shrinks once the reader scrolls', near(scrolled.h, 56, 2) ? 'pass' : 'fail', `${scrolled.h}px after 1200px scroll`);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(500);
      const back = await navState(page);
      record('1.2', 'Navbar grows back at the top', near(back.h, 80, 2) && near(top.h, 80, 2) ? 'pass' : 'fail', `${top.h}px → ${back.h}px`);

      /* ---------- 1.4 / 1.6 Consulting ---------- */
      const ok14 = top.current.join() === 'Consulting' && top.underlined.join() === 'Consulting';
      record('1.4', 'Consulting page highlights Consulting', ok14 ? 'pass' : 'fail', `current: [${top.current}] underlined: [${top.underlined}]`);
      const crumbs = { consulting: top.crumbsShown };
      for (const key of ['labs', 'about', 'home']) {
        await visit(page, PAGES[key]);
        crumbs[key] = (await navState(page)).crumbsShown;
      }
      const shown = Object.entries(crumbs).filter(([, v]) => v).map(([k]) => k);
      record('1.6', 'Top-level pages show no breadcrumb', shown.length ? 'fail' : 'pass', shown.length ? `breadcrumb on: ${shown}` : 'none on Consulting, Labs, About, Projects');

      await visit(page, PAGES.caseStudy);
      const cs = await navState(page);
      record('1.5', 'A case study highlights Projects', cs.current.join() === 'Projects' ? 'pass' : 'fail', `current: [${cs.current}]`);
      await ctx.close();

      const rctx = await openContext(browser, VIEWPORTS.desktop, { local, reducedMotion: 'reduce' });
      const rpage = await rctx.newPage();
      await visit(rpage, PAGES.consulting);
      await rpage.evaluate(() => window.scrollTo(0, 1200));
      await rpage.waitForTimeout(120);
      const r = await navState(rpage);
      const instant = r.transition.split(',').every((d) => parseFloat(d) === 0);
      record('1.3', 'Reduced motion swaps height without animating', instant && near(r.h, 56, 2) ? 'pass' : 'fail', `${r.h}px, transition ${r.transition}`);
      await rctx.close();
    }

    /* ---------- portfolio-hero: homepage, desktop ---------- */
    {
      const ctx = await openContext(browser, VIEWPORTS.desktop, { local });
      const page = await ctx.newPage();
      await visit(page, PAGES.caseStudy);
      const subH1 = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.notion-header__title')).fontSize));
      await visit(page, PAGES.home);
      const hero = await page.evaluate((HERO) => {
        const list = document.querySelector(HERO);
        if (!list) return null;
        const [c1, c2] = list.querySelectorAll(':scope > .notion-column');
        const lr = list.getBoundingClientRect();
        const ar = c2?.getBoundingClientRect();
        const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
        const paras = [...c1.querySelectorAll('.notion-text__content')].map((p) => p.textContent.trim()).filter(Boolean);
        return {
          h1: parseFloat(getComputedStyle(c1.querySelector('h1')).fontSize),
          paras: paras.length,
          words: paras.join(' ').split(/\s+/).filter(Boolean).length,
          hasImage: !!c2?.querySelector('.notion-image img, img'),
          art: ar && { h: ar.height, cx: ar.left + ar.width / 2 },
          hero: { h: lr.height, left: lr.left, w: lr.width },
          gutterCx: lr.left + ((lr.width - 2 * rem) * 2) / 3 + 1.5 * rem,
          pattern: c2 ? getComputedStyle(c2).backgroundImage : '',
        };
      }, HERO);
      if (!hero) {
        record('1.7', 'Homepage title is larger than any subpage title', 'fail', 'hero column list not found');
      } else {
        record('1.7', 'Homepage title is larger than any subpage title', hero.h1 > subH1 ? 'pass' : 'fail', `home ${hero.h1}px vs case study ${subH1}px`);
        record('1.8', 'One supporting line under the title', hero.paras <= 1 && hero.words <= 25 ? 'pass' : 'content', `${hero.paras} paragraph(s), ${hero.words} words (task 3.10)`);
        const artOk = hero.art && near(hero.art.h / hero.hero.h, 1.5, 0.02) && near(hero.art.cx, hero.gutterCx, 4);
        record('1.10', 'Hero art is anchored to the content grid, behind the content', artOk ? 'pass' : 'fail',
          hero.art ? `art ${(hero.art.h / hero.hero.h).toFixed(3)}× hero height, centre x ${Math.round(hero.art.cx)} vs gutter ${Math.round(hero.gutterCx)}${hero.hasImage ? '' : ' (pattern; no image yet)'}` : 'no column 2');
        const checks = [];
        for (const [name, sel] of [['title', `${HERO} h1`], ['line', `${HERO} .notion-text__content`]]) {
          const w = await worstBackground(page, sel);
          if (process.env.BHD_DEBUG) console.log(name, w);
          if (w) checks.push([name, ratio(w.text, w.bg)]);
        }
        const btn = await page.evaluate((HERO) => {
          const b = document.querySelector(`${HERO} .notion-button__content`);
          return b && { fg: getComputedStyle(b).color, bg: getComputedStyle(b).backgroundColor };
        }, HERO);
        if (btn) checks.push(['button', ratio(rgb(btn.fg), rgb(btn.bg))]);
        const worst = Math.min(...checks.map(([, r]) => r));
        record('1.11', 'Hero text stays readable over the art', worst >= 4.5 ? 'pass' : 'fail', checks.map(([n, r]) => `${n} ${r.toFixed(2)}:1`).join(', '));
        if (hero.hasImage) {
          // 1.14: take the image out and check the pattern fills the same box.
          await page.evaluate((HERO) => document.querySelectorAll(`${HERO} > .notion-column:nth-child(2) .notion-image`).forEach((n) => n.remove()), HERO);
          await page.waitForTimeout(100);
        }
        const empty = await page.evaluate((HERO) => {
          const c2 = document.querySelector(`${HERO} > .notion-column:nth-child(2)`);
          const lr = document.querySelector(HERO).getBoundingClientRect();
          return c2 && { bg: getComputedStyle(c2).backgroundImage, h: c2.getBoundingClientRect().height / lr.height };
        }, HERO);
        const patOk = empty && empty.bg.includes('radial-gradient') && near(empty.h, 1.5, 0.02);
        record('1.14', 'No image yet shows a built-in pattern, not an empty half', patOk ? 'pass' : 'fail', empty ? `${empty.bg.slice(0, 30)}…, ${empty.h.toFixed(3)}× hero height` : 'no column 2');
      }
      record('1.13', 'Swapping the visual needs no pull request', 'manual', 'swap the image in Notion, see it live (QA 4.4)');
      await ctx.close();
    }

    /* ---------- homepage, phone: 1.9 / 1.12 ---------- */
    {
      const ctx = await openContext(browser, VIEWPORTS.phone, { local });
      const page = await ctx.newPage();
      await visit(page, PAGES.home);
      const ONE_LINE = 'Design leader and former founder — craft, code and operations in one seat.';
      const m = await page.evaluate(({ HERO, ONE_LINE }) => {
        const b = document.querySelector(`${HERO} .notion-button`) ?? document.querySelector('.notion-root .notion-button');
        const c2 = document.querySelector(`${HERO} > .notion-column:nth-child(2)`);
        const bottom = () => (b ? Math.round(b.getBoundingClientRect().bottom) : null);
        const paras = [...document.querySelectorAll(`${HERO} > .notion-column:first-child .notion-text__content`)].filter((p) => p.textContent.trim());
        const words = paras.map((p) => p.textContent).join(' ').split(/\s+/).filter(Boolean).length;
        const now = bottom();
        // Until task 3.10 lands in Notion, also measure with one supporting line.
        let oneLine = null;
        if (words > 25 && paras.length) {
          paras[0].textContent = ONE_LINE;
          paras.slice(1).forEach((p) => p.remove());
          oneLine = bottom();
        }
        return { bottom: now, oneLine, words, art: !!c2?.querySelector('img') };
      }, { HERO, ONE_LINE });
      const ctaOk = (px) => px !== null && px <= 600;
      record('1.9', 'Call to action is in the first phone screen',
        ctaOk(m.bottom) ? 'pass' : m.oneLine !== null && ctaOk(m.oneLine) ? 'content' : 'fail',
        m.oneLine !== null ? `button bottom ${m.bottom}px with today's ${m.words}-word copy; ${m.oneLine}px with one line (task 3.10)` : `button bottom ${m.bottom}px of 844`);
      record('1.12', 'Call to action stays in the first phone screen with art behind it',
        !m.art ? 'content' : ctaOk(m.oneLine ?? m.bottom) ? 'pass' : 'fail', m.art ? `button bottom ${m.oneLine ?? m.bottom}px with art` : 'no art in Notion yet (task 3.11)');
      await ctx.close();
    }

    /* ---------- subpage bands and the case study: 1.15–1.17 ---------- */
    {
      const ctx = await openContext(browser, VIEWPORTS.desktop, { local });
      const page = await ctx.newPage();
      const banded = {};
      for (const key of ['consulting', 'about', 'caseStudy']) {
        await visit(page, PAGES[key]);
        banded[key] = await page.evaluate(() => {
          const main = document.querySelector('main.super-content');
          const all = [...main.querySelectorAll('.notion-header__content, .notion-root > *')];
          const inBand = all.filter((el) => getComputedStyle(el).borderImageSource !== 'none' && getComputedStyle(el).display !== 'none');
          if (!inBand.length) return { ok: false, why: 'no band' };
          const last = inBand[inBand.length - 1];
          const next = all.slice(all.indexOf(last) + 1).find((el) => getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 0);
          const gap = next ? next.getBoundingClientRect().top - last.getBoundingClientRect().bottom : 0;
          return { ok: !next || gap >= 0, why: `${inBand.length} banded block(s), ${Math.round(gap)}px to the body` };
        });
      }
      const bad = Object.entries(banded).filter(([, v]) => !v.ok);
      record('1.15', 'Consulting hero sits on a band', bad.length ? 'fail' : 'pass', Object.entries(banded).map(([k, v]) => `${k}: ${v.why}`).join('; '));

      // 1.17 on the page as it is (no case study has a cover today).
      await visit(page, PAGES.caseStudy);
      const noCover = await page.evaluate(() => {
        const c = document.querySelector('.notion-header__cover');
        return { h: c ? Math.round(c.getBoundingClientRect().height) : 0, cls: c?.className ?? '' };
      });
      record('1.17', 'Case study without a cover shows no empty box', noCover.h <= 1 ? 'pass' : 'fail', `cover box ${noCover.h}px (${noCover.cls.trim()})`);

      // 1.16: give the case study a cover, the way Super marks one, and measure.
      await page.evaluate(() => {
        const c = document.querySelector('.notion-header__cover');
        c.classList.replace('no-cover', 'has-cover');
        c.innerHTML = '<img alt="" src="https://assets.super.so/971a5915-a135-4e2e-94d2-ed28004847ad/images/b13bea9f-90c6-4a25-a88a-56469681ff77/rebuilding_a_design_function__medium.png?width=1600">';
      });
      await page.waitForTimeout(800);
      const cover = await page.evaluate(() => {
        const main = document.querySelector('main.super-content');
        const c = document.querySelector('.notion-header__cover').getBoundingClientRect();
        const heroH = parseFloat(main.style.getPropertyValue('--hero-h'));
        const root = document.querySelector('.notion-root');
        const rs = getComputedStyle(root);
        const left = root.getBoundingClientRect().left + parseFloat(rs.paddingLeft);
        const C = root.getBoundingClientRect().width - parseFloat(rs.paddingLeft) - parseFloat(rs.paddingRight);
        const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
        const titleTop = document.querySelector('.notion-header__title').getBoundingClientRect().top + window.scrollY;
        return { h: c.height, cx: c.left + c.width / 2, heroH, gutter: left + ((C - 2 * rem) * 2) / 3 + 1.5 * rem, titleTop };
      });
      const coverOk = cover.heroH > 0 && near(cover.h / cover.heroH, 1.5, 0.02) && near(cover.cx, cover.gutter, 4) && cover.titleTop < 900;
      record('1.16', 'Case study cover is hero art on the content grid', coverOk ? 'pass' : 'fail',
        cover.heroH ? `cover ${(cover.h / cover.heroH).toFixed(3)}× hero, centre ${Math.round(cover.cx)} vs gutter ${Math.round(cover.gutter)}, title at ${Math.round(cover.titleTop)}px` : 'no --hero-h on <main> (loader not measuring)');
      await ctx.close();
    }
  } finally {
    await browser.close();
  }

  results.sort((a, b) => parseFloat(a.id.split('.')[1]) - parseFloat(b.id.split('.')[1]));
  const mark = { pass: '✓', fail: '✗', content: '…', manual: '·' };
  console.log(`\nportfolio-header-hero — ${local ? 'this branch (local public/super/)' : 'live site'}\n`);
  for (const r of results) console.log(`${mark[r.state]} ${r.id.padEnd(5)} ${r.scenario.padEnd(66)} ${r.value}`);
  const count = (s) => results.filter((r) => r.state === s).length;
  console.log(`\n${count('pass')} pass · ${count('fail')} fail · ${count('content')} waiting on Notion · ${count('manual')} manual\n`);
  if (opts.out) {
    await mkdir(path.dirname(opts.out), { recursive: true });
    await writeFile(opts.out, JSON.stringify({ when: new Date().toISOString(), source: local ? 'local' : 'live', results }, null, 2) + '\n');
  }
  process.exitCode = count('fail') ? 1 : 0;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 2;
});
