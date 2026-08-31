/**
 * Scene ladder — ten Etsy-ready kit images + the reusable template
 * (design decision 27; approved Figma 02.26 scene-system frame).
 *
 * Three inputs only: the listing's own photos, its brief (verbatim, sourced),
 * and a palette sampled from the photos. Ladder rules, in order:
 *   1. Photo re-edits first — square, tone, detail-crop what the seller has.
 *   2. Data cards render only when their fields exist — no field, no card.
 *   3. Gaps backfill with more photo treatments — never blanks, never
 *      fabricated copy.
 *   4. Blank slots live in the template file, not in shipped images.
 *
 * Every string a template card renders is returned in `copy` so the
 * provenance assertion (QA 4.6) can verify it quotes the brief — the one
 * allowed exception is the composed headline (the kit's suggested title,
 * design decision 30), which callers pass in explicitly.
 *
 * Pure: buffers in, buffers out. Fetching photo bytes is fulfillment's job.
 */

import path from 'path';
import sharp from 'sharp';
import { PACK_IMAGE_PX } from './config';
import type { ListingBrief, BriefPhrase } from './brief';

// Serverless runtimes ship no fonts (see generator.ts) — same bundled setup.
if (!process.env.FONTCONFIG_FILE) {
  process.env.FONTCONFIG_FILE = path.join(process.cwd(), 'assets', 'fonts', 'fonts.conf');
}

const S = PACK_IMAGE_PX; // 2000
const CREAM = '#faf4ec';
const INK = '#2b2320';

export interface SceneInput {
  /** The listing's photos, highest-rank first. */
  photos: Buffer[];
  brief: ListingBrief;
  /** Sampled palette (palette.ts) — colors[0] leads the card grounds. */
  palette: { colors: string[]; sampled: boolean };
  /** The kit's suggested title when the composer ran; falls back to the listing title. */
  headline?: string;
  /** Shop display name when known — the closing card renders only if provided. */
  shopName?: string;
}

export interface KitImage {
  id: string;
  label: string;
  buffer: Buffer;
  /** Text strings rendered on this image (empty for pure photo re-edits). */
  copy: string[];
}

export interface KitScenes {
  images: KitImage[]; // exactly KIT_IMAGE_COUNT
  template: KitImage; // the reusable blank, shipped alongside
}

export const KIT_IMAGE_COUNT = 10;

export interface ScenePlanEntry {
  id: string;
  label: string;
  /** What the image shows, for alt-text composition (design note 2026-08-31:
   * alt text annotates the DELIVERED kit images, not the source photos). */
  altContext: string;
  /** Render hints (internal): which photo/crop this entry uses, when photo-derived. */
  photoIndex?: number;
  recipeIndex?: number;
}

/**
 * The ladder's plan, computable without rendering: which ten images a listing
 * gets, in order. generateKitScenes() follows this exact plan, so alt text
 * composed against it always matches the delivered set.
 */
export function planKitScenes(input: {
  photoCount: number;
  photoAlts?: (string | null)[];
  hasFacts: boolean;
  shopName?: string;
}): ScenePlanEntry[] {
  const alt = (i: number) => {
    const a = input.photoAlts?.[i]?.trim();
    return a ? ` Source photo shows: ${a}.` : '';
  };
  const plan: ScenePlanEntry[] = [];
  for (let i = 0; i < input.photoCount && plan.length < KIT_IMAGE_COUNT - 2; i++) {
    plan.push({ id: `recut-${i + 1}`, label: `Photo ${i + 1}, refreshed`, altContext: `Refreshed re-edit of the listing's photo ${i + 1}.${alt(i)}`, photoIndex: i });
  }
  for (let i = 0; i < input.photoCount && plan.length < KIT_IMAGE_COUNT - 2; i++) {
    plan.push({ id: `detail-${i + 1}`, label: `Photo ${i + 1}, ${CROP_RECIPES[0].name}`, altContext: `Close detail crop of the listing's photo ${i + 1}.${alt(i)}`, photoIndex: i, recipeIndex: 0 });
  }
  const cards: ScenePlanEntry[] = [
    { id: 'title-card', label: 'Title card', altContext: 'Text card showing the listing title on a brand-color background with an arch-framed product photo.' },
    ...(input.hasFacts ? [{ id: 'details-card', label: 'Details card', altContext: 'Text card listing the price, made-to-order note, shipping time, and stock.' }] : []),
    ...(input.photoCount >= 2 ? [{ id: 'collage', label: 'Photo collage', altContext: 'Collage of two listing photos side by side under the listing title.' }] : []),
    ...(input.shopName ? [{ id: 'closing-card', label: 'Shop card', altContext: `Sign-off card with an arch-framed product photo and the shop name ${input.shopName}.` }] : []),
  ];
  plan.push(...cards.slice(0, KIT_IMAGE_COUNT - plan.length));
  let recipe = 1, photo = 0;
  while (plan.length < KIT_IMAGE_COUNT) {
    const r = CROP_RECIPES[recipe % CROP_RECIPES.length];
    const n = (photo % input.photoCount) + 1;
    plan.push({ id: `treatment-${plan.length + 1}`, label: `Photo ${n}, ${r.name}`, altContext: `Alternate crop of the listing's photo ${n}.${alt(n - 1)}`, photoIndex: n - 1, recipeIndex: recipe % CROP_RECIPES.length });
    photo += 1;
    if (photo % input.photoCount === 0) recipe += 1;
  }
  return plan.slice(0, KIT_IMAGE_COUNT);
}

const svg = (s: string) => Buffer.from(s);
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function wrap(text: string, max: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length > max) {
      if (current) lines.push(current.trim());
      current = word;
    } else current += ' ' + word;
  }
  if (current.trim()) lines.push(current.trim());
  return lines;
}

/** W&H-style arch: the template motif used for photo frames. */
function archPath(cx: number, y: number, w: number, h: number): string {
  const r = w / 2;
  return `M ${cx - r} ${y + h} L ${cx - r} ${y + r} A ${r} ${r} 0 0 1 ${cx + r} ${y + r} L ${cx + r} ${y + h} Z`;
}

/** Step JPEG quality down until under Etsy's ~1MB guidance (as generator.ts). */
async function toEtsyJpeg(pipeline: sharp.Sharp): Promise<Buffer> {
  for (const quality of [86, 76, 68]) {
    const buf = await pipeline.jpeg({ quality }).toBuffer();
    if (buf.length < 1000 * 1024) return buf;
  }
  return pipeline.jpeg({ quality: 60 }).toBuffer();
}

// ---------------------------------------------------------------------------
// Photo re-edits (ladder rule 1) — square, tone, crop; no text, no invention
// ---------------------------------------------------------------------------

async function recut(photo: Buffer, region?: { left: number; top: number; size: number }): Promise<Buffer> {
  let p = sharp(photo).rotate();
  if (region) {
    const meta = await p.metadata();
    const w = meta.width ?? S, h = meta.height ?? S;
    const size = Math.floor(Math.min(w, h) * region.size);
    p = p.extract({
      left: Math.floor((w - size) * region.left),
      top: Math.floor((h - size) * region.top),
      width: size,
      height: size,
    });
  }
  return toEtsyJpeg(
    p.resize(S, S, { fit: 'cover' })
      .modulate({ brightness: 1.03, saturation: 1.06 })
      .sharpen({ sigma: 0.8 }),
  );
}

/**
 * Deterministic crop recipes, most useful first. `left`/`top` position the
 * square crop window (0–1); `size` is its share of the short edge.
 */
const CROP_RECIPES = [
  { name: 'detail crop', region: { left: 0.5, top: 0.5, size: 0.6 } },
  { name: 'tight crop', region: { left: 0.5, top: 0.35, size: 0.75 } },
  { name: 'close detail', region: { left: 0.35, top: 0.5, size: 0.45 } },
  { name: 'alternate crop', region: { left: 0.2, top: 0.6, size: 0.7 } },
];

// ---------------------------------------------------------------------------
// Data cards (ladder rule 2) — copy quotes the brief; fields gate rendering
// ---------------------------------------------------------------------------

const FACT_LABELS: Record<string, string> = {
  price: 'PRICE',
  when_made: 'MADE',
  processing_min: 'SHIPS',
  quantity: 'STOCK',
};

async function archThumb(photo: Buffer, w: number, h: number): Promise<Buffer> {
  const mask = svg(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><path d="${archPath(w / 2, 0, w, h)}" fill="#fff"/></svg>`);
  return sharp(photo).rotate().resize(w, h, { fit: 'cover' })
    .composite([{ input: mask, blend: 'dest-in' }])
    .png().toBuffer();
}

function footerBar(brand: string, label?: string): string {
  return `<rect y="${S - 90}" width="${S}" height="90" fill="${brand}"/>` + (label
    ? `<text x="${S / 2}" y="${S - 32}" font-family="Inter" font-size="28" letter-spacing="8" fill="#fff" text-anchor="middle">${esc(label.toUpperCase())}</text>`
    : '');
}

async function titleCard(input: SceneInput, headline: string): Promise<KitImage> {
  const brand = input.palette.colors[0];
  const copy = [headline, ...(input.shopName ? [input.shopName] : [])];
  const lines = wrap(headline, 20);
  const textY = 520;
  const body = svg(`<svg width="${S}" height="${S}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${S}" height="${S}" fill="${CREAM}"/>
    ${footerBar(brand, input.shopName)}
    ${input.shopName ? `<text x="1420" y="360" font-family="Inter" font-size="34" letter-spacing="10" fill="${brand}" text-anchor="middle">${esc(input.shopName.toUpperCase())}</text>` : ''}
    ${lines.map((l, i) => `<text x="1420" y="${textY + i * 88}" font-family="PT Serif" font-weight="bold" font-size="66" fill="${INK}" text-anchor="middle">${esc(l)}</text>`).join('')}
  </svg>`);
  const thumb = await archThumb(input.photos[0], 760, 980);
  const buffer = await toEtsyJpeg(
    sharp(body).composite([{ input: thumb, top: 440, left: 150 }]).flatten({ background: CREAM }),
  );
  return { id: 'title-card', label: 'Title card', buffer, copy };
}

async function detailsCard(input: SceneInput): Promise<KitImage | null> {
  if (input.brief.facts.length === 0) return null;
  const brand = input.palette.colors[0];
  const title = input.brief.what.text;
  const copy = [title, ...input.brief.facts.map((f) => f.text)];
  const rows = input.brief.facts.slice(0, 4);
  const label = (f: BriefPhrase) => FACT_LABELS[f.field ?? ''] ?? 'DETAIL';
  const body = svg(`<svg width="${S}" height="${S}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${S}" height="${S}" fill="${brand}"/>
    <rect x="90" y="90" width="${S - 180}" height="${S - 180}" fill="${CREAM}" rx="24"/>
    <text x="${S / 2}" y="330" font-family="Inter" font-size="34" letter-spacing="10" fill="${brand}" text-anchor="middle">THE DETAILS</text>
    ${wrap(title, 24).map((l, i) => `<text x="${S / 2}" y="${450 + i * 92}" font-family="PT Serif" font-weight="bold" font-size="76" fill="${INK}" text-anchor="middle">${esc(l)}</text>`).join('')}
    ${rows.map((f, i) => `
      <line x1="330" x2="${S - 330}" y1="${780 + i * 210}" y2="${780 + i * 210}" stroke="${INK}" stroke-opacity="0.12" stroke-width="3"/>
      <text x="330" y="${870 + i * 210}" font-family="Inter" font-size="34" letter-spacing="6" fill="${brand}">${esc(label(f))}</text>
      <text x="${S - 330}" y="${872 + i * 210}" font-family="Inter" font-weight="500" font-size="52" fill="${INK}" text-anchor="end">${esc(f.text)}</text>`).join('')}
  </svg>`);
  return { id: 'details-card', label: 'Details card', buffer: await toEtsyJpeg(sharp(body)), copy };
}

async function collageCard(input: SceneInput): Promise<KitImage | null> {
  if (input.photos.length < 2) return null;
  const brand = input.palette.colors[0];
  const title = input.brief.what.text;
  const eyebrow = input.brief.facts.slice(0, 2).map((f) => f.text.toUpperCase()).join(' · ');
  const copy = [title, ...input.brief.facts.slice(0, 2).map((f) => f.text)];
  const cell = 880, gap = 80, top = 510;
  const [a, b] = await Promise.all(
    input.photos.slice(0, 2).map((p) => sharp(p).rotate().resize(cell, cell, { fit: 'cover' }).toBuffer()),
  );
  const body = svg(`<svg width="${S}" height="${S}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${S}" height="${S}" fill="${CREAM}"/>
    ${eyebrow ? `<text x="${S / 2}" y="300" font-family="Inter" font-size="34" letter-spacing="10" fill="${brand}" text-anchor="middle">${esc(eyebrow)}</text>` : ''}
    ${wrap(title, 34).slice(0, 2).map((l, i) => `<text x="${S / 2}" y="${390 + i * 80}" font-family="PT Serif" font-weight="bold" font-size="64" fill="${INK}" text-anchor="middle">${esc(l)}</text>`).join('')}
    ${footerBar(brand, input.shopName)}
  </svg>`);
  const buffer = await toEtsyJpeg(sharp(body).composite([
    { input: a, top, left: (S - cell * 2 - gap) / 2 },
    { input: b, top, left: (S - cell * 2 - gap) / 2 + cell + gap },
  ]));
  return { id: 'collage', label: 'Photo collage', buffer, copy: input.shopName ? [...copy, input.shopName] : copy };
}

async function closingCard(input: SceneInput): Promise<KitImage | null> {
  if (!input.shopName) return null; // no shop name, no sign-off — never invent one
  const brand = input.palette.colors[0];
  const thumb = await archThumb(input.photos[0], 700, 902);
  const body = svg(`<svg width="${S}" height="${S}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${S}" height="${S}" fill="${brand}"/>
    <text x="${S / 2}" y="1560" font-family="Inter" font-size="40" letter-spacing="14" fill="#fff" text-anchor="middle">${esc(input.shopName.toUpperCase())}</text>
    <text x="${S / 2}" y="1650" font-family="Inter" font-size="34" fill="#fff" fill-opacity="0.8" text-anchor="middle">${esc(input.brief.what.text)}</text>
  </svg>`);
  const buffer = await toEtsyJpeg(
    sharp(body).composite([{ input: thumb, top: 465, left: (S - 700) / 2 }]).flatten({ background: brand }),
  );
  return { id: 'closing-card', label: 'Shop card', buffer, copy: [input.shopName, input.brief.what.text] };
}

async function templateCard(input: SceneInput): Promise<KitImage> {
  const brand = input.palette.colors[0];
  const body = svg(`<svg width="${S}" height="${S}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${S}" height="${S}" fill="${CREAM}"/>
    <path d="${archPath(490, 420, 760, 980)}" fill="none" stroke="${brand}" stroke-width="5" stroke-dasharray="18 14"/>
    <text x="490" y="930" font-family="Inter" font-size="36" fill="${brand}" fill-opacity="0.75" text-anchor="middle">Your photo here</text>
    <rect x="980" y="430" width="740" height="330" fill="none" stroke="${INK}" stroke-opacity="0.45" stroke-width="4" stroke-dasharray="16 12" rx="12"/>
    <text x="1350" y="610" font-family="Inter" font-size="36" fill="${INK}" fill-opacity="0.55" text-anchor="middle">Your headline here</text>
    <rect x="980" y="820" width="740" height="220" fill="none" stroke="${INK}" stroke-opacity="0.3" stroke-width="4" stroke-dasharray="16 12" rx="12"/>
    <text x="1350" y="945" font-family="Inter" font-size="32" fill="${INK}" fill-opacity="0.45" text-anchor="middle">Details, price, options</text>
    ${footerBar(brand, 'your shop name')}
  </svg>`);
  return { id: 'template', label: 'Reusable template', buffer: await toEtsyJpeg(sharp(body)), copy: [] };
}

// ---------------------------------------------------------------------------
// The ladder
// ---------------------------------------------------------------------------

export async function generateKitScenes(input: SceneInput): Promise<KitScenes> {
  if (input.photos.length === 0) throw new Error('scene ladder needs at least one listing photo');
  const headline = input.headline?.trim() || input.brief.what.text;
  const plan = planKitScenes({
    photoCount: input.photos.length,
    hasFacts: input.brief.facts.length > 0,
    shopName: input.shopName,
  });

  const images: KitImage[] = [];
  for (const step of plan) {
    if (step.photoIndex !== undefined) {
      const region = step.recipeIndex !== undefined ? CROP_RECIPES[step.recipeIndex].region : undefined;
      images.push({ id: step.id, label: step.label, buffer: await recut(input.photos[step.photoIndex], region), copy: [] });
      continue;
    }
    const card =
      step.id === 'title-card' ? await titleCard(input, headline)
      : step.id === 'details-card' ? await detailsCard(input)
      : step.id === 'collage' ? await collageCard(input)
      : await closingCard(input);
    if (!card) throw new Error(`scene plan/render drift: ${step.id} planned but not renderable`);
    images.push(card);
  }

  return { images, template: await templateCard(input) };
}
