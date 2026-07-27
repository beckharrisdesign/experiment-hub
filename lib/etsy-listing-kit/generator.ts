/**
 * Etsy Listing Kit — asset-pack generator.
 *
 * One design → 6 curated 2000px-square Etsy listing images (clean + watermarked).
 * Composition language follows Katy's W&H listing reference (Figma
 * ZZusgWsPM4Fz8YuhKxnD4R node 134-22200): plain light studio background, an
 * arch logo badge top-left, and a peach FAQ-style info card with a centered
 * badge. Since buyers upload no logo, the badge is derived from their design
 * (dominant color arch + circular design thumbnail).
 *
 * All output is 2000px square JPG, tuned to stay under Etsy's ~1MB guidance.
 */
import path from 'path';
import sharp from 'sharp';
import { PACK_IMAGE_PX } from './config';

// Serverless runtimes ship no fonts — point fontconfig at our bundled OFL
// fonts (assets/fonts) BEFORE the first sharp text render, or SVG text comes
// out as tofu boxes. Must run at module load; respect an explicit override.
if (!process.env.FONTCONFIG_FILE) {
  process.env.FONTCONFIG_FILE = path.join(process.cwd(), 'assets', 'fonts', 'fonts.conf');
}

const S = PACK_IMAGE_PX; // 2000

export type PackItemId = 'flat' | 'framed' | 'in-hoop' | 'detail' | 'scale' | 'info-card';
export interface GeneratedImage { id: PackItemId; label: string; clean: Buffer; watermarked: Buffer; }

// ── palette ──────────────────────────────────────────────────────────────────
const STUDIO = '#ececea';   // plain light studio gray (W&H reference bg)
const PEACH = '#fbe3d3';    // FAQ/info card background (W&H reference)
const INK = '#252525', MUTED = '#6b6b6b', PRIMARY = '#b24a2e';

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

// ── design-derived arch badge (stand-in for a shop logo) ─────────────────────
const BADGE_W = 240, BADGE_H = 300, BADGE_INSET = 70;

/**
 * Accent color from the design: average of the actually-inked pixels
 * (skips transparent + near-white background). Falls back to the product
 * terracotta for near-black line art or empty samples so the badge always
 * reads warm, never harsh.
 */
export async function dominantColor(design: Buffer): Promise<string> {
  const { data, info } = await sharp(design, { density: 300 })
    .rotate() // honor EXIF orientation, consistent with fit()/detail()
    .resize(64, 64, { fit: 'inside' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < info.width * info.height; i++) {
    const [pr, pg, pb, pa] = [data[i * 4], data[i * 4 + 1], data[i * 4 + 2], data[i * 4 + 3]];
    if (pa < 200) continue;                       // transparent → background
    if (pr > 230 && pg > 230 && pb > 230) continue; // near-white → background
    r += pr; g += pg; b += pb; n++;
  }
  if (n === 0) return PRIMARY;
  r /= n; g /= n; b /= n;
  const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  if (luma < 0.15) return PRIMARY;                 // pure black line art → warm accent
  if (luma > 0.72) { r *= 0.55; g *= 0.55; b *= 0.55; }
  const hex = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

/** Arch badge PNG (240×300): dominant-color arch + white circle holding a design thumbnail. */
async function designBadge(design: Buffer): Promise<Buffer> {
  const color = await dominantColor(design);
  const arch = svg(`<svg width="${BADGE_W}" height="${BADGE_H}" xmlns="http://www.w3.org/2000/svg">
    <path d="M0 ${BADGE_H} L0 ${BADGE_W / 2} A${BADGE_W / 2} ${BADGE_W / 2} 0 0 1 ${BADGE_W} ${BADGE_W / 2} L${BADGE_W} ${BADGE_H} Z" fill="${color}"/>
    <circle cx="${BADGE_W / 2}" cy="150" r="80" fill="#ffffff"/>
  </svg>`);
  const D = 140;
  const mask = svg(`<svg width="${D}" height="${D}" xmlns="http://www.w3.org/2000/svg"><circle cx="${D / 2}" cy="${D / 2}" r="${D / 2}" fill="#fff"/></svg>`);
  const thumb = await sharp((await fit(design, D, { cover: true })).buf)
    .resize(D, D, { fit: 'cover' })
    .composite([{ input: mask, blend: 'dest-in' }])
    .png().toBuffer();
  return sharp({ create: { width: BADGE_W, height: BADGE_H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([
      { input: arch, top: 0, left: 0 },
      { input: thumb, top: 150 - D / 2, left: (BADGE_W - D) / 2 },
    ])
    .png().toBuffer();
}

type Overlay = { input: Buffer; top: number; left: number };
const badgeTopLeft = (badge: Buffer): Overlay => ({ input: badge, top: BADGE_INSET, left: BADGE_INSET });

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
async function flat(design: Buffer, badge: Buffer) {
  const d = await fit(design, 1280);
  const shadow = svg(`<svg width="${S}" height="${S}" xmlns="http://www.w3.org/2000/svg"><defs><filter id="s" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="24" stdDeviation="34" flood-color="#000" flood-opacity="0.12"/></filter></defs><rect x="${center(d.w)}" y="${center(d.h)}" width="${d.w}" height="${d.h}" rx="10" fill="#ffffff" filter="url(#s)"/></svg>`);
  return bg(STUDIO)
    .composite([{ input: shadow, top: 0, left: 0 }, { input: d.buf, top: center(d.h), left: center(d.w) }, badgeTopLeft(badge)])
    .jpeg({ quality: 86 }).toBuffer();
}

/** Styled flat-lay hoop with floss/props (W&H "Photo BG" layout template). */
async function framed(design: Buffer, badge: Buffer) {
  return hoopPhoto(design, badge, 'hoop-alt.jpg', { cx: 1020, cy: 1010, r: 540, size: 1000 });
}

/**
 * Composite the design onto a real hoop photo template (assets/mockups —
 * exported from Katy's W&H Listing Generator Figma file, her own assets).
 * The design is flattened to white and multiply-blended so the fabric weave
 * shows through, and clipped to the fabric circle so nothing darkens the
 * wooden ring or the styled surroundings.
 */
async function hoopPhoto(
  design: Buffer,
  badge: Buffer,
  template: string,
  spot: { cx: number; cy: number; r: number; size: number },
) {
  const prepped = await sharp(design, { density: 300 })
    .rotate()
    .resize(spot.size, spot.size, { fit: 'inside', withoutEnlargement: false })
    .png().toBuffer();
  const pm = await sharp(prepped).metadata();
  const pw = pm.width ?? spot.size, ph = pm.height ?? spot.size;
  const circleMask = svg(`<svg width="${S}" height="${S}" xmlns="http://www.w3.org/2000/svg"><circle cx="${spot.cx}" cy="${spot.cy}" r="${spot.r}" fill="#fff"/></svg>`);
  const layer = await sharp({ create: { width: S, height: S, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([
      { input: prepped, top: Math.round(spot.cy - ph / 2), left: Math.round(spot.cx - pw / 2) },
      { input: circleMask, blend: 'dest-in' },
    ])
    .png().toBuffer();
  return sharp(path.join(process.cwd(), 'assets', 'mockups', template))
    .composite([{ input: layer, blend: 'multiply' }, badgeTopLeft(badge)])
    .jpeg({ quality: 86 }).toBuffer();
}

/** Clean studio hoop (W&H "Basic" layout template). */
async function inHoop(design: Buffer, badge: Buffer) {
  return hoopPhoto(design, badge, 'hoop-basic.jpg', { cx: 985, cy: 1030, r: 665, size: 1280 });
}

async function detail(design: Buffer, badge: Buffer) {
  // zoom into the center ~46% of the design
  const big = await sharp(design, { density: 300 }).rotate().resize(S * 2, S * 2, { fit: 'inside', withoutEnlargement: false }).png().toBuffer();
  const m = await sharp(big).metadata();
  const bw = m.width ?? S, bh = m.height ?? S;
  const cropW = Math.round(bw * 0.46), cropH = Math.round(bh * 0.46);
  const cropped = await sharp(big)
    .extract({ left: Math.round((bw - cropW) / 2), top: Math.round((bh - cropH) / 2), width: cropW, height: cropH })
    .resize(S - 120, S - 120, { fit: 'cover' }).png().toBuffer();
  return bg(STUDIO).composite([{ input: cropped, top: 60, left: 60 }, badgeTopLeft(badge)]).jpeg({ quality: 86 }).toBuffer();
}

async function scale(design: Buffer, badge: Buffer) {
  const d = await fit(design, 1120);
  const top = 300;
  const ruler = svg(`<svg width="${S}" height="${S}" xmlns="http://www.w3.org/2000/svg">
    <line x1="${center(d.w)}" y1="${top + d.h + 120}" x2="${center(d.w) + d.w}" y2="${top + d.h + 120}" stroke="${INK}" stroke-width="5"/>
    <line x1="${center(d.w)}" y1="${top + d.h + 96}" x2="${center(d.w)}" y2="${top + d.h + 144}" stroke="${INK}" stroke-width="5"/>
    <line x1="${center(d.w) + d.w}" y1="${top + d.h + 96}" x2="${center(d.w) + d.w}" y2="${top + d.h + 144}" stroke="${INK}" stroke-width="5"/>
    <text x="${S / 2}" y="${top + d.h + 210}" text-anchor="middle" font-family="Inter, sans-serif" font-size="46" fill="${MUTED}">approx. 8 in wide</text>
  </svg>`);
  return bg(STUDIO).composite([{ input: d.buf, top, left: center(d.w) }, { input: ruler, top: 0, left: 0 }, badgeTopLeft(badge)]).jpeg({ quality: 86 }).toBuffer();
}

async function infoCard(_design: Buffer, badge: Buffer) {
  // W&H FAQ-card language: peach ground, centered badge, centered serif copy.
  const lines = [
    'Six 2000px square JPGs',
    'No watermark, sized for Etsy',
    'Flat · hoop · styled photo · detail · scale',
    'Instant download + emailed link',
    'Re-download for 7 days',
  ];
  const card = svg(`<svg width="${S}" height="${S}" xmlns="http://www.w3.org/2000/svg">
    <text x="${S / 2}" y="700" text-anchor="middle" font-family="PT Serif, serif" font-size="92" font-weight="700" fill="${INK}">What you get</text>
    <text x="${S / 2}" y="790" text-anchor="middle" font-family="PT Serif, serif" font-size="42" fill="${PRIMARY}">6 Etsy-ready listing images · one design</text>
    ${lines.map((t, i) => `<text x="${S / 2}" y="${960 + i * 110}" text-anchor="middle" font-family="PT Serif, serif" font-size="48" fill="${INK}">${t}</text>`).join('')}
    <text x="${S / 2}" y="1720" text-anchor="middle" font-family="Inter, sans-serif" font-size="34" fill="${MUTED}">Questions? Just reply to your receipt.</text>
  </svg>`);
  return bg(PEACH)
    .composite([{ input: badge, top: 220, left: (S - BADGE_W) / 2 }, { input: card, top: 0, left: 0 }])
    .jpeg({ quality: 86 }).toBuffer();
}

const COMPOSERS: { id: PackItemId; label: string; fn: (d: Buffer, badge: Buffer) => Promise<Buffer> }[] = [
  { id: 'flat', label: 'Flat render', fn: flat },
  { id: 'framed', label: 'Styled hoop photo', fn: framed },
  { id: 'in-hoop', label: 'In-hoop mockup', fn: inHoop },
  { id: 'detail', label: 'Detail crop', fn: detail },
  { id: 'scale', label: 'Scale shot', fn: scale },
  { id: 'info-card', label: '“What you get” card', fn: infoCard },
];

/** Generate the full 6-image pack (clean + watermarked) from one design buffer. */
export async function generatePack(design: Buffer): Promise<GeneratedImage[]> {
  const badge = await designBadge(design);
  const out: GeneratedImage[] = [];
  for (const c of COMPOSERS) {
    const clean = await c.fn(design, badge);
    out.push({ id: c.id, label: c.label, clean, watermarked: await watermark(clean) });
  }
  return out;
}
