/**
 * Etsy Listing Kit — asset-pack generator.
 *
 * One design → 6 curated 2000px-square Etsy listing images (clean + watermarked).
 * Composition language follows Katy's W&H listing reference (Figma
 * ZZusgWsPM4Fz8YuhKxnD4R): six real hoop photo scenes from her template sets.
 * Pack recomposition per #335 (Figma page 02.4): detail crop + "what you get"
 * card removed (seller-specific, unresolved designs); two more W&H mockup
 * backgrounds folded in, one of which renders the design as fully sewn
 * stitches. No logo/badge overlay — a buyer-logo slot is deferred and must
 * never be filled from the uploaded design.
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

export type PackItemId = 'flat' | 'framed' | 'in-hoop' | 'scale' | 'mustard' | 'sewn';
export interface GeneratedImage { id: PackItemId; label: string; clean: Buffer; watermarked: Buffer; }

const svg = (s: string) => Buffer.from(s);

/**
 * The design always scales relative to its scene's fabric circle and sits
 * centered in it: rendered size = fabric diameter × DESIGN_FILL, so every
 * scene reads consistently regardless of how large the hoop is in frame.
 */
const DESIGN_FILL = 0.78;

/**
 * Encode to JPEG, stepping quality down until under Etsy's ~1MB guidance —
 * texture-heavy photo templates (linen weave) exceed 1MB at q86.
 */
async function toEtsyJpeg(pipeline: sharp.Sharp): Promise<Buffer> {
  for (const quality of [86, 76, 68]) {
    const buf = await pipeline.jpeg({ quality }).toBuffer();
    if (buf.length < 1000 * 1024) return buf;
  }
  return pipeline.jpeg({ quality: 60 }).toBuffer();
}

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
  return toEtsyJpeg(sharp(clean).composite([{ input: watermarkSvg(), top: 0, left: 0 }]));
}

// ── compositions ─────────────────────────────────────────────────────────────
/** A scene's fabric circle: center + radius in the 2000px template. */
type Spot = { cx: number; cy: number; r: number };

/** Design resized to the scene's fabric circle (centered, scaled to it). */
async function prepDesign(design: Buffer, spot: Spot) {
  const size = Math.round(2 * spot.r * DESIGN_FILL);
  const buf = await sharp(design, { density: 300 })
    .rotate()
    .resize(size, size, { fit: 'inside', withoutEnlargement: false })
    .png().toBuffer();
  const m = await sharp(buf).metadata();
  return { buf, w: m.width ?? size, h: m.height ?? size };
}

const circleMask = (spot: Spot) =>
  svg(`<svg width="${S}" height="${S}" xmlns="http://www.w3.org/2000/svg"><circle cx="${spot.cx}" cy="${spot.cy}" r="${spot.r}" fill="#fff"/></svg>`);

/**
 * Composite the design onto a real hoop photo template (assets/mockups —
 * exported from Katy's W&H Listing Generator Figma file, her own assets).
 * The design is multiply-blended so the fabric weave shows through (alpha
 * preserved — transparent designs touch nothing outside their strokes), and
 * clipped to the fabric circle so nothing darkens the ring or surroundings.
 */
async function hoopPhoto(design: Buffer, template: string, spot: Spot) {
  const prepped = await prepDesign(design, spot);
  const layer = await sharp({ create: { width: S, height: S, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([
      { input: prepped.buf, top: Math.round(spot.cy - prepped.h / 2), left: Math.round(spot.cx - prepped.w / 2) },
      { input: circleMask(spot), blend: 'dest-in' },
    ])
    .png().toBuffer();
  return toEtsyJpeg(
    sharp(path.join(process.cwd(), 'assets', 'mockups', template))
      .composite([{ input: layer, blend: 'multiply' }]),
  );
}

/**
 * "Fully sewn" treatment: the design reads as stitched thread, not a flat
 * print — a soft relief shadow lifts it off the fabric, and a fine diagonal
 * hatch (masked to the design's own inked pixels) suggests satin-stitch sheen.
 */
async function sewnPhoto(design: Buffer, template: string, spot: Spot) {
  const prepped = await prepDesign(design, spot);
  const top = Math.round(spot.cy - prepped.h / 2);
  const left = Math.round(spot.cx - prepped.w / 2);

  // Relief shadow: the design's silhouette, blurred and nudged down-right.
  const silhouette = await sharp(prepped.buf)
    .ensureAlpha()
    .linear([0, 0, 0, 0.35], [0, 0, 0, 0]) // black at ~35% of the design's alpha
    .blur(6)
    .png().toBuffer();

  // Satin-stitch hatch: fine 45° thread lines clipped to the design's alpha.
  const lines: string[] = [];
  const span = prepped.w + prepped.h;
  for (let d = 0; d < span; d += 8) {
    lines.push(`<line x1="${d}" y1="0" x2="0" y2="${d}" stroke="#ffffff" stroke-width="2.4" opacity="0.5"/>`);
    lines.push(`<line x1="${d + 4}" y1="0" x2="0" y2="${d + 4}" stroke="#000000" stroke-width="1.6" opacity="0.28"/>`);
  }
  const hatch = await sharp(svg(`<svg width="${prepped.w}" height="${prepped.h}" xmlns="http://www.w3.org/2000/svg">${lines.join('')}</svg>`))
    .composite([{ input: prepped.buf, blend: 'dest-in' }]) // only where the design has ink
    .png().toBuffer();

  const shadowLayer = await sharp({ create: { width: S, height: S, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([
      { input: silhouette, top: top + 7, left: left + 5 },
      { input: circleMask(spot), blend: 'dest-in' },
    ])
    .png().toBuffer();
  const designLayer = await sharp({ create: { width: S, height: S, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([
      { input: prepped.buf, top, left },
      { input: circleMask(spot), blend: 'dest-in' },
    ])
    .png().toBuffer();
  const hatchLayer = await sharp({ create: { width: S, height: S, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([
      { input: hatch, top, left },
      { input: circleMask(spot), blend: 'dest-in' },
    ])
    .png().toBuffer();

  return toEtsyJpeg(
    sharp(path.join(process.cwd(), 'assets', 'mockups', template)).composite([
      { input: shadowLayer, blend: 'multiply' },
      { input: designLayer, blend: 'multiply' },
      { input: hatchLayer, blend: 'overlay' },
    ]),
  );
}

/** Hoop on natural linen with pastel floss (W&H "Linen" style). */
const flat = (d: Buffer) => hoopPhoto(d, 'hoop-linen.jpg', { cx: 995, cy: 906, r: 585 });
/** Styled flat-lay hoop with floss/props (W&H "Photograph" template). */
const framed = (d: Buffer) => hoopPhoto(d, 'hoop-alt.jpg', { cx: 1020, cy: 1010, r: 540 });
/** Clean studio hoop (W&H "Plain Hoop" template). */
const inHoop = (d: Buffer) => hoopPhoto(d, 'hoop-basic.jpg', { cx: 985, cy: 1030, r: 665 });
/** Hoop on terracotta linen with walnut ring (W&H "Terra Cotta" style). */
const scale = (d: Buffer) => hoopPhoto(d, 'hoop-terra.jpg', { cx: 1005, cy: 1000, r: 500 });
/** Hoop on mustard linen (W&H Alt "Mustard" — echoes the ELK ochre). NEW per #335. */
const mustard = (d: Buffer) => hoopPhoto(d, 'hoop-mustard.jpg', { cx: 1000, cy: 920, r: 560 });
/** Sage botanical scene (W&H Alt "Blocks C") with the fully-sewn render. NEW per #335. */
const sewn = (d: Buffer) => sewnPhoto(d, 'hoop-sage.jpg', { cx: 1048, cy: 1005, r: 575 });

const COMPOSERS: { id: PackItemId; label: string; fn: (d: Buffer) => Promise<Buffer> }[] = [
  { id: 'flat', label: 'Hoop on linen', fn: flat },
  { id: 'framed', label: 'Styled hoop photo', fn: framed },
  { id: 'in-hoop', label: 'In-hoop mockup', fn: inHoop },
  { id: 'scale', label: 'Hoop on terracotta', fn: scale },
  { id: 'mustard', label: 'Hoop on mustard', fn: mustard },
  { id: 'sewn', label: 'Stitched preview', fn: sewn },
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
