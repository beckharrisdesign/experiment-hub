#!/usr/bin/env node
/*
 * Measure beckharrisdesign.com against the portfolio-header-hero specs.
 *
 * One check per tasks.md §1 outcome (1.1–1.18), each tied to its spec
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
      // The art must be sharp: chrome.js rewrites its `sizes`, and the browser
      // then fetches a bigger file. Give that fetch time to land.
      await page.waitForFunction((HERO) => {
        const img = document.querySelector(`${HERO} > .notion-column:nth-child(2) img`);
        return !img || (img.complete && img.naturalWidth >= img.getBoundingClientRect().width * 0.95);
      }, HERO, { timeout: 8000 }).catch(() => {});
      const hero = await page.evaluate((HERO) => {
        const list = document.querySelector(HERO);
        if (!list) return null;
        const [c1, c2] = list.querySelectorAll(':scope > .notion-column');
        const lr = list.getBoundingClientRect();
        const ar = c2?.getBoundingClientRect();
        const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
        const paras = [...c1.querySelectorAll('.notion-text__content')].map((p) => p.textContent.trim()).filter(Boolean);
        const visible = (el) => getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 0;
        const inHero = [...c1.querySelectorAll('.notion-text__content, .notion-button')].filter(visible).length;
        // The intro: the first text block after the hero, before the first divider.
        let intro = null;
        for (let el = list.nextElementSibling; el && !el.matches('.notion-divider'); el = el.nextElementSibling) {
          if (el.matches('.notion-text__content') && el.textContent.trim()) { intro = el; break; }
        }
        return {
          inHero,
          introBelow: !!intro,
          h1: parseFloat(getComputedStyle(c1.querySelector('h1')).fontSize),
          paras: paras.length,
          words: paras.join(' ').split(/\s+/).filter(Boolean).length,
          hasImage: !!c2?.querySelector('.notion-image img, img'),
          sharp: (() => {
            const img = c2?.querySelector('img');
            const asked = Number(new URL(img?.currentSrc || 'about:blank', location.href).searchParams.get('width')) || 0;
            return img && { natural: img.naturalWidth, drawn: Math.round(img.getBoundingClientRect().width), asked };
          })(),
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
        // Pass only when the hero is title-only AND the intro follows it. Still
        // inside the hero: waiting on the Notion move. Neither: the intro is lost.
        record('1.8', 'The hero holds the title alone',
          hero.inHero > 0 ? 'content' : hero.introBelow ? 'pass' : 'fail',
          hero.inHero > 0 ? `${hero.inHero} paragraph/button block(s) still inside the hero (task 3.10)` : `title only; intro ${hero.introBelow ? 'directly below the hero' : 'NOT found between the hero and the first divider'}`);
        const sharpOk = !hero.sharp || hero.sharp.natural >= hero.sharp.drawn * 0.95;
        // The browser asked for a file at least as wide as the art is drawn, and
        // got a smaller one: the upload itself is too small. Content, not code.
        const sourceSmall = hero.sharp && !sharpOk && hero.sharp.asked > hero.sharp.natural + 1;
        const placed = hero.art && near(hero.art.h / hero.hero.h, 1.5, 0.02) && near(hero.art.cx, hero.gutterCx, 4);
        const artOk = placed && sharpOk;
        record('1.10', 'Hero art is anchored to the content grid, behind the content', artOk ? 'pass' : placed && sourceSmall ? 'content' : 'fail',
          hero.art ? `art ${(hero.art.h / hero.hero.h).toFixed(3)}× hero height, centre x ${Math.round(hero.art.cx)} vs gutter ${Math.round(hero.gutterCx)}${hero.sharp ? `, file ${hero.sharp.natural}px for ${hero.sharp.drawn}px drawn${sourceSmall ? ' (the upload is smaller than that; task 3.11a)' : ''}` : ' (no image yet: the empty art box)'}` : 'no column 2');
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
        // Only text inside the hero sits over the art. Once the intro and the
        // button move below the hero (1.8), the title is the one thing to check.
        const below = hero.inHero === 0 ? ' (intro and button sit below the hero, on the page colour)' : '';
        record('1.11', 'Hero text stays readable over the art', worst >= 4.5 ? 'pass' : 'fail', checks.map(([n, r]) => `${n} ${r.toFixed(2)}:1`).join(', ') + below);
        if (hero.hasImage) {
          // 1.14: take the image out and check nothing stands in for it.
          await page.evaluate((HERO) => document.querySelectorAll(`${HERO} > .notion-column:nth-child(2) .notion-image`).forEach((n) => n.remove()), HERO);
          await page.waitForTimeout(100);
        }
        const empty = await page.evaluate((HERO) => {
          const c2 = document.querySelector(`${HERO} > .notion-column:nth-child(2)`);
          const lr = document.querySelector(HERO).getBoundingClientRect();
          if (!c2) return null;
          const shown = [...c2.querySelectorAll('*')].filter((el) => getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().width > 1);
          return { bg: getComputedStyle(c2).backgroundImage, w: c2.getBoundingClientRect().width, shown: shown.length, heroW: lr.width };
        }, HERO);
        const plainOk = !empty || (empty.bg === 'none' && empty.w <= 1 && empty.shown === 0);
        record('1.14', 'No image yet shows the plain hero, not a placeholder', plainOk ? 'pass' : 'fail',
          empty ? `column 2: background ${empty.bg === 'none' ? 'none' : empty.bg.slice(0, 30)}, ${Math.round(empty.w)}px wide, ${empty.shown} visible block(s)` : 'no column 2');
      }
      record('1.13', 'Swapping the visual needs no pull request', 'manual', 'swap the image in Notion, see it live (QA 4.4)');
      await ctx.close();
    }

    /* ---------- homepage, phone: 1.9 / 1.12 ---------- */
    {
      const ctx = await openContext(browser, VIEWPORTS.phone, { local });
      const page = await ctx.newPage();
      await visit(page, PAGES.home);
      const m = await page.evaluate((HERO) => {
        const visible = (el) => getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 0;
        // Any "Book a 30m call" button the reader can see: the navbar's or the hero's.
        const ctas = [...document.querySelectorAll('a, button')].filter((el) => /book a 30m call/i.test(el.textContent) && visible(el));
        const first = Math.min(...ctas.map((el) => Math.round(el.getBoundingClientRect().bottom)));
        // What hero art could move: the intro and the button, wherever they sit.
        const list = document.querySelector(HERO);
        const c2 = list?.querySelector(':scope > .notion-column:nth-child(2)');
        const watched = [...document.querySelectorAll('.notion-root .notion-text__content, .notion-root .notion-button')].filter(visible).slice(0, 4);
        const tops = () => watched.map((el) => Math.round(el.getBoundingClientRect().top));
        const withArt = tops();
        let without = withArt;
        if (c2) {
          c2.style.display = 'none';
          without = tops();
          c2.style.display = '';
        }
        return { ctas: ctas.length, first, art: !!c2?.querySelector('img'), moved: withArt.some((t, i) => t !== without[i]) };
      }, HERO);
      record('1.9', 'A "Book a 30m call" button is in the first phone screen', m.ctas && m.first <= 600 ? 'pass' : 'fail',
        m.ctas ? `first one ends at ${m.first}px of 844 (${m.ctas} visible)` : 'none visible');
      record('1.12', 'Hero art never moves the intro or the button',
        !m.art ? 'content' : m.moved ? 'fail' : 'pass', m.art ? (m.moved ? 'blocks moved when the art was removed' : 'same positions with and without the art') : 'no art in Notion yet (task 3.11)');
      await ctx.close();
    }

    /* ---------- subpage bands and the case study: 1.15–1.18 ---------- */
    const COVER_IMG = 'https://assets.super.so/971a5915-a135-4e2e-94d2-ed28004847ad/images/b13bea9f-90c6-4a25-a88a-56469681ff77/rebuilding_a_design_function__medium.png?width=1600';
    // Use the page's own cover when it has one; otherwise add one the way
    // Super marks it, on both the cover and the header content.
    const giveCover = (page) => page.evaluate((src) => {
      const c = document.querySelector('.notion-header__cover');
      if (c.classList.contains('has-cover')) return;
      c.classList.replace('no-cover', 'has-cover');
      document.querySelector('.notion-header__content')?.classList.replace('no-cover', 'has-cover');
      c.innerHTML = `<img alt="" src="${src}">`;
    }, COVER_IMG);
    const bandOf = (page) => page.evaluate(() => {
      const main = document.querySelector('main.super-content');
      const all = [...main.querySelectorAll('.notion-header__content, .notion-root > *')];
      const inBand = all.filter((el) => getComputedStyle(el).borderImageSource !== 'none' && getComputedStyle(el).display !== 'none');
      if (!inBand.length) return { ok: false, why: 'no band' };
      const last = inBand[inBand.length - 1];
      const next = all.slice(all.indexOf(last) + 1).find((el) => getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 0);
      const gap = next ? next.getBoundingClientRect().top - last.getBoundingClientRect().bottom : 0;
      return { ok: !next || gap >= 0, why: `${inBand.length} banded block(s), ${Math.round(gap)}px to the body` };
    });
    {
      // 1.15: Consulting and About at desktop; a case study below 1024px.
      const banded = {};
      const desk = await openContext(browser, VIEWPORTS.desktop, { local });
      const dp = await desk.newPage();
      for (const key of ['consulting', 'about']) {
        await visit(dp, PAGES[key]);
        banded[key] = await bandOf(dp);
      }
      const phone = await openContext(browser, VIEWPORTS.phone, { local });
      const pp = await phone.newPage();
      await visit(pp, PAGES.caseStudy);
      banded['case study @390'] = await bandOf(pp);
      const bad = Object.entries(banded).filter(([, v]) => !v.ok);
      record('1.15', 'Consulting hero sits on a band', bad.length ? 'fail' : 'pass', Object.entries(banded).map(([k, v]) => `${k}: ${v.why}`).join('; '));

      // 1.17: take the cover away, the way Super marks a page without one
      // (the case study may have a real cover by now), and measure.
      await visit(dp, PAGES.caseStudy);
      await dp.evaluate(() => {
        const c = document.querySelector('.notion-header__cover');
        if (c?.classList.contains('has-cover')) {
          c.classList.replace('has-cover', 'no-cover');
          c.innerHTML = '';
        }
      });
      await dp.waitForTimeout(800);
      const plain = await dp.evaluate(() => {
        const main = document.querySelector('main.super-content');
        const c = document.querySelector('.notion-header__cover');
        const before = getComputedStyle(main, '::before');
        return { h: c ? Math.round(c.getBoundingClientRect().height) : 0, state: main.dataset.bhdHero ?? 'none', layerH: parseFloat(before.height) || 0, layerBg: before.backgroundColor };
      });
      const plainOk = plain.h <= 1 && plain.state === 'plain' && plain.layerH >= 479 && plain.layerBg === 'rgb(35, 71, 74)';
      record('1.17', 'Case study without a cover shows no empty box', plainOk ? 'pass' : 'fail',
        `cover box ${plain.h}px; ${plain.state}; placeholder ${Math.round(plain.layerH)}px in ${plain.layerBg}`);

      // 1.16: give the case study a cover, the way Super marks one, and measure.
      await visit(dp, PAGES.caseStudy);
      await giveCover(dp);
      await dp.waitForTimeout(1200);
      const cover = await dp.evaluate(() => {
        const main = document.querySelector('main.super-content');
        const box = (el) => el.getBoundingClientRect();
        const c = box(document.querySelector('.notion-header__cover'));
        const img = getComputedStyle(document.querySelector('.notion-header__cover img'));
        const head = document.querySelector('.notion-header__content');
        const root = [...document.querySelectorAll('.notion-root > *')];
        // The hero's run: details, paragraphs and buttons (heading anchors
        // pass), ending at the first block of any other kind (design.md 14).
        const kinds = '.notion-page__properties-layout, .notion-text__content, .notion-button';
        const end = root.findIndex((el) => !el.matches(kinds) && !el.matches('.notion-heading__anchor'));
        const cardBlocks = root.slice(0, end < 0 ? root.length : end).filter((el) => el.matches(kinds));
        const cardTop = box(head).top;
        const cardBottom = Math.max(...cardBlocks.map((b) => box(b).bottom));
        const title = box(document.querySelector('.notion-header__title'));
        return {
          state: main.dataset.bhdHero, vw: document.documentElement.clientWidth,
          c: { l: c.left, w: c.width, t: c.top, b: c.bottom, h: c.height }, fit: img.objectFit,
          cardTop, cardBottom, painted: getComputedStyle(head).backgroundImage !== 'none' && cardBlocks.every((b) => getComputedStyle(b).borderImageSource !== 'none'),
          textLeft: title.left, titleTop: title.top + window.scrollY,
        };
      });
      // Full width up to 1920px, centred (design.md decision 15).
      const coverW = Math.min(cover.vw, 1920);
      const coverOk = cover.state === 'cover' && near(cover.c.w, coverW, 1) && near(cover.c.l, (cover.vw - coverW) / 2, 1) && cover.c.h >= 479
        && cover.c.t <= cover.cardTop && cover.c.b >= cover.cardBottom && cover.fit === 'cover' && cover.painted && cover.titleTop < 900;
      // The 1920px cap only shows on a wider screen: measure it at 2560.
      const wide = await openContext(browser, { width: 2560, height: 900 }, { local });
      const wp = await wide.newPage();
      await visit(wp, PAGES.caseStudy);
      await giveCover(wp);
      await wp.waitForTimeout(1200);
      const w = await wp.evaluate(() => {
        const c = document.querySelector('.notion-header__cover').getBoundingClientRect();
        return { l: c.left, w: c.width, vw: document.documentElement.clientWidth };
      });
      await wide.close();
      const capOk = near(w.w, 1920, 1) && near(w.l, (w.vw - 1920) / 2, 1);
      record('1.16', 'Case study cover fills the hero behind a text card', coverOk && capOk ? 'pass' : 'fail',
        `${cover.state ?? 'not measured'}; cover ${Math.round(cover.c.w)}×${Math.round(cover.c.h)} at x ${Math.round(cover.c.l)} (${cover.fit}), card ${Math.round(cover.cardBottom - cover.cardTop)}px ${cover.painted ? 'painted' : 'NOT painted'}, title at ${Math.round(cover.titleTop)}px; at 2560: ${Math.round(w.w)}px at x ${Math.round(w.l)}`);

      // 1.18: the same cover on a phone sits above the title at 39:20.
      await giveCover(pp);
      await pp.waitForTimeout(1200);
      const small = await pp.evaluate(() => {
        const c = document.querySelector('.notion-header__cover').getBoundingClientRect();
        const t = document.querySelector('.notion-header__title').getBoundingClientRect();
        return { w: c.width, h: c.height, b: c.bottom, titleTop: t.top, vw: document.documentElement.clientWidth };
      });
      // design.md decision 15: 16px from the cover to the title (Super adds 48px on its own).
      const smallOk = near(small.w, small.vw, 1) && near(small.h, (small.w * 20) / 39, 1.5) && small.b <= small.titleTop && small.titleTop - small.b <= 24;
      record('1.18', 'Case study cover sits above the title on narrower screens', smallOk ? 'pass' : 'fail',
        `cover ${Math.round(small.w)}×${Math.round(small.h)} (39:20 → ${Math.round((small.w * 20) / 39)}), ${Math.round(small.titleTop - small.b)}px to the title`);
      await desk.close();
      await phone.close();
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
