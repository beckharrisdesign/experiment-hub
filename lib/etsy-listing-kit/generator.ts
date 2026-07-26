/**
 * Etsy Listing Kit — asset-pack generator.
 *
 * One design → 6 curated 2000px-square Etsy listing images (clean + watermarked).
 * v1 uses procedural / SVG mockups (no external photo assets — self-contained,
 * no licensing). Photo-real mockup templates are a future upgrade (REVIEW_QUEUE #11).
 *
 * All output is 2000px square JPG, tuned to stay under Etsy's ~1MB guidance.
 */
import sharp from 'sharp';
import { PACK_IMAGE_PX } from './config';

const S = PACK_IMAGE_PX; // 2000

export type PackItemId = 'flat' | 'framed' | 'in-hoop' | 'detail' | 'scale' | 'info-card';
export interface GeneratedImage { id: PackItemId; label: string; clean: Buffer; watermarked: Buffer; }

// ── palette (matches product theme) ──────────────────────────────────────────
const CREAM = '#fdf3ee', NEUTRAL = '#f2efe9', WALL = '#e9e3da', FABRIC = '#efe7d9';
const INK = '#252525', MUTED = '#6b6b6b', PRIMARY = '#b24a2e', FRAME = '#3a2f28';

function bg(color: string) {
  return sharp({ create: { width: S, height: S, channels: 4, background: color } });
}
async function fit(input: Buffer, box: number, opts: { cover?: boolean } = {}) {
  const buf = await sharp(input, { density: 300 })
    .rotate()
    .resize(box, box, { fit: opts.cover ? 'cover' : 'inside', withoutEnlargement: false })
    .png()
    .toBuffer();
  const m = await sharp(buf).metadata();
  return { buf, w: m.width ?? box, h: m.height ?? box };
}
const center = (w: number) => Math.round((S - w) / 2);
const svg = (s: string) => Buffer.from(s);

// ── watermark overlay (diagonal tiled PREVIEW text, low opacity) ─────────────
function watermarkSvg() {
  const rows: string[] = [];
  for (let y = 0; y < S + 400; y += 260) {
    for (let x = -200; x < S; x += 620) {
      rows.push(`<text x="${x}" y="${y}" font-family="Inter, sans-serif" font-size="34" font-weight="600" fill="#000" fill-opacity="0.07" transform="rotate(-30 ${x} ${y})">PREVIEW · ETSY LISTING KIT</text>`);
    }
  }
  return svg(`<svg width="${S}" height="${S}" xmlns="http://www.w3.org/2000/svg">${rows.join('')}</svg>`);
}
async function watermark(clean: Buffer) {
  return sharp(clean).composite([{ input: watermarkSvg(), top: 0, left: 0 }]).jpeg({ quality: 86 }).toBuffer();
}

// ── compositions ─────────────────────────────────────────────────────────────
async function flat(design: Buffer) {
  const d = await fit(design, 1280);
  const shadow = svg(`<svg width="${S}" height="${S}" xmlns="http://www.w3.org/2000/svg"><defs><filter id="s" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="24" stdDeviation="34" flood-color="#000" flood-opacity="0.14"/></filter></defs><rect x="${center(d.w)}" y="${center(d.h)}" width="${d.w}" height="${d.h}" rx="10" fill="#ffffff" filter="url(#s)"/></svg>`);
  return bg(CREAM).composite([{ input: shadow, top: 0, left: 0 }, { input: d.buf, top: center(d.h), left: center(d.w) }]).jpeg({ quality: 86 }).toBuffer();
}

async function framed(design: Buffer) {
  const mat = 1440, matPos = center(mat);
  const d = await fit(design, mat - 320);
  // mat (white fill, below design)
  const matLayer = svg(`<svg width="${S}" height="${S}" xmlns="http://www.w3.org/2000/svg"><rect x="${matPos}" y="${matPos}" width="${mat}" height="${mat}" fill="#ffffff"/></svg>`);
  // frame border stroke (above design; no fill so it never hides the art)
  const border = svg(`<svg width="${S}" height="${S}" xmlns="http://www.w3.org/2000/svg">
    <rect x="${matPos}" y="${matPos}" width="${mat}" height="${mat}" fill="none" stroke="${FRAME}" stroke-width="56"/>
    <rect x="${matPos + 28}" y="${matPos + 28}" width="${mat - 56}" height="${mat - 56}" fill="none" stroke="#00000022" stroke-width="2"/>
  </svg>`);
  return bg(WALL)
    .composite([
      { input: matLayer, top: 0, left: 0 },
      { input: d.buf, top: center(d.h), left: center(d.w) },
      { input: border, top: 0, left: 0 },
    ])
    .jpeg({ quality: 86 }).toBuffer();
}

async function inHoop(design: Buffer) {
  const D = 1360;
  const mask = svg(`<svg width="${D}" height="${D}" xmlns="http://www.w3.org/2000/svg"><circle cx="${D / 2}" cy="${D / 2}" r="${D / 2}" fill="#fff"/></svg>`);
  const disc = await sharp((await fit(design, D, { cover: true })).buf)
    .resize(D, D, { fit: 'cover' })
    .composite([{ input: mask, blend: 'dest-in' }])
    .png().toBuffer();
  const pos = center(D);
  const ring = svg(`<svg width="${S}" height="${S}" xmlns="http://www.w3.org/2000/svg">
    <circle cx="${S / 2}" cy="${S / 2}" r="${D / 2 + 34}" fill="none" stroke="#c9a06a" stroke-width="46"/>
    <circle cx="${S / 2}" cy="${S / 2}" r="${D / 2 + 10}" fill="none" stroke="#00000018" stroke-width="3"/>
    <rect x="${S / 2 - 46}" y="${center(D) - 92}" width="92" height="70" rx="10" fill="#b98a52"/>
    <rect x="${S / 2 - 8}" y="${center(D) - 120}" width="16" height="40" rx="6" fill="#8a6a3e"/>
  </svg>`);
  return bg(FABRIC).composite([{ input: disc, top: pos, left: pos }, { input: ring, top: 0, left: 0 }]).jpeg({ quality: 86 }).toBuffer();
}

async function detail(design: Buffer) {
  // zoom into the center ~46% of the design
  const big = await sharp(design, { density: 300 }).rotate().resize(S * 2, S * 2, { fit: 'inside', withoutEnlargement: false }).png().toBuffer();
  const m = await sharp(big).metadata();
  const bw = m.width ?? S, bh = m.height ?? S;
  const cropW = Math.round(bw * 0.46), cropH = Math.round(bh * 0.46);
  const cropped = await sharp(big)
    .extract({ left: Math.round((bw - cropW) / 2), top: Math.round((bh - cropH) / 2), width: cropW, height: cropH })
    .resize(S - 120, S - 120, { fit: 'cover' }).png().toBuffer();
  return bg(NEUTRAL).composite([{ input: cropped, top: 60, left: 60 }]).jpeg({ quality: 86 }).toBuffer();
}

async function scale(design: Buffer) {
  const d = await fit(design, 1120);
  const top = 300;
  const ruler = svg(`<svg width="${S}" height="${S}" xmlns="http://www.w3.org/2000/svg">
    <line x1="${center(d.w)}" y1="${top + d.h + 120}" x2="${center(d.w) + d.w}" y2="${top + d.h + 120}" stroke="${INK}" stroke-width="5"/>
    <line x1="${center(d.w)}" y1="${top + d.h + 96}" x2="${center(d.w)}" y2="${top + d.h + 144}" stroke="${INK}" stroke-width="5"/>
    <line x1="${center(d.w) + d.w}" y1="${top + d.h + 96}" x2="${center(d.w) + d.w}" y2="${top + d.h + 144}" stroke="${INK}" stroke-width="5"/>
    <text x="${S / 2}" y="${top + d.h + 210}" text-anchor="middle" font-family="Inter, sans-serif" font-size="46" fill="${MUTED}">approx. 8 in wide</text>
  </svg>`);
  return bg(NEUTRAL).composite([{ input: d.buf, top, left: center(d.w) }, { input: ruler, top: 0, left: 0 }]).jpeg({ quality: 86 }).toBuffer();
}

async function infoCard(design: Buffer) {
  const thumb = await fit(design, 520);
  const card = svg(`<svg width="${S}" height="${S}" xmlns="http://www.w3.org/2000/svg">
    <text x="140" y="300" font-family="Georgia, serif" font-size="96" font-weight="700" fill="${INK}">What you get</text>
    <text x="146" y="380" font-family="Inter, sans-serif" font-size="40" fill="${PRIMARY}">6 Etsy-ready listing images · one design</text>
    ${['6 × 2000px square JPGs', 'No watermark, sized for Etsy', 'Flat · framed · in-hoop · detail · scale', 'Instant download + emailed link', 'Re-download for 7 days'].map((t, i) => `<text x="150" y="${560 + i * 92}" font-family="Inter, sans-serif" font-size="48" fill="${INK}">•  ${t}</text>`).join('')}
  </svg>`);
  return bg(CREAM).composite([{ input: card, top: 0, left: 0 }, { input: thumb.buf, top: S - thumb.h - 150, left: S - thumb.w - 150 }]).jpeg({ quality: 86 }).toBuffer();
}

const COMPOSERS: { id: PackItemId; label: string; fn: (d: Buffer) => Promise<Buffer> }[] = [
  { id: 'flat', label: 'Flat render', fn: flat },
  { id: 'framed', label: 'Framed mockup', fn: framed },
  { id: 'in-hoop', label: 'In-hoop mockup', fn: inHoop },
  { id: 'detail', label: 'Detail crop', fn: detail },
  { id: 'scale', label: 'Scale shot', fn: scale },
  { id: 'info-card', label: '“What you get” card', fn: infoCard },
];

/** Generate the full 6-image pack (clean + watermarked) from one design buffer. */
export async function generatePack(design: Buffer): Promise<GeneratedImage[]> {
  const out: GeneratedImage[] = [];
  for (const c of COMPOSERS) {
    const clean = await c.fn(design);
    out.push({ id: c.id, label: c.label, clean, watermarked: await watermark(clean) });
  }
  return out;
}
