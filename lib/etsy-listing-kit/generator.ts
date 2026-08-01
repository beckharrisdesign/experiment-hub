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

export type PackItemId = 'flat' | 'framed' | 'in-hoop' | 'scale' | 'floss' | 'sewn';
export interface GeneratedImage { id: PackItemId; label: string; clean: Buffer; watermarked: Buffer; }

const svg = (s: string) => Buffer.from(s);

/**
 * The design always scales relative to its scene's fabric circle and sits
 * centered in it, with a 15% buffer of visible fabric on each side before
 * the hoop frame: rendered size = fabric diameter × 0.70. Uploads are
 * trimmed first so files with baked-in padding still land at this size.
 */
const DESIGN_FILL = 0.70;

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

// ── watermark overlay (diagonal tiled PREVIEW text) ──────────────────────────
// Dual-tone (white + dark shadow copy) so it reads on light fabric AND dark
// props; opacity tuned to clearly deter grabbing the preview (Katy,
// 2026-07-31: the old 7% black vanished into photo texture) while the design
// underneath stays judgeable.
function watermarkSvg() {
  const rows: string[] = [];
  for (let y = 0; y < S + 400; y += 230) {
    for (let x = -200; x < S; x += 580) {
      rows.push(`<text x="${x + 2}" y="${y + 2}" font-family="Inter, sans-serif" font-size="38" font-weight="600" fill="#000" fill-opacity="0.16" transform="rotate(-30 ${x + 2} ${y + 2})">PREVIEW · ETSY LISTING KIT</text>`);
      rows.push(`<text x="${x}" y="${y}" font-family="Inter, sans-serif" font-size="38" font-weight="600" fill="#fff" fill-opacity="0.18" transform="rotate(-30 ${x} ${y})">PREVIEW · ETSY LISTING KIT</text>`);
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

/**
 * Knock out a flat background so the artwork composites naturally on any
 * fabric: uploads are usually JPEG/PNG with a solid canvas (white, gray,
 * cream …) that multiply would smear onto the scene as a box. Detects the
 * background from the border pixels (must be near-uniform) and flood-fills
 * it to transparent from the edges. No-ops for already-transparent files
 * and for photo backgrounds it can't identify safely.
 *
 * Regions enclosed by a closed shape (the middle of a wreath, inside a
 * circular border) aren't reachable from the edges. For a **non-white**
 * canvas those are cleared too — a colored canvas is a scan/export artifact
 * and left behind it reads as a disc on the fabric. A near-white canvas is
 * treated as paper and its enclosed areas are kept, since white fill inside
 * artwork is usually deliberate (Katy's call, 2026-07-31, option C).
 */
async function knockoutFlatBackground(png: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  // Already meaningfully transparent → trust the file's own alpha.
  let transparent = 0;
  for (let i = 0; i < w * h; i++) if (data[i * 4 + 3] < 200) transparent++;
  if (transparent > w * h * 0.02) return png;
  // Background color = mean of border pixels; bail if the border isn't flat.
  const border: number[] = [];
  for (let x = 0; x < w; x++) border.push(x, x + w * (h - 1));
  for (let y = 1; y < h - 1; y++) border.push(y * w, y * w + w - 1);
  let br = 0, bg = 0, bb = 0;
  for (const p of border) { br += data[p * 4]; bg += data[p * 4 + 1]; bb += data[p * 4 + 2]; }
  br /= border.length; bg /= border.length; bb /= border.length;
  let dev = 0;
  for (const p of border) dev += Math.abs(data[p * 4] - br) + Math.abs(data[p * 4 + 1] - bg) + Math.abs(data[p * 4 + 2] - bb);
  if (dev / border.length > 60) return png; // busy border → photo, leave alone
  // Flood fill from the border: connected pixels near the background color.
  const TOL = 48;
  const near = (p: number) =>
    Math.abs(data[p * 4] - br) + Math.abs(data[p * 4 + 1] - bg) + Math.abs(data[p * 4 + 2] - bb) < TOL * 3;
  const visited = new Uint8Array(w * h);
  const queue: number[] = [];
  for (const p of border) if (!visited[p] && near(p)) { visited[p] = 1; queue.push(p); }
  while (queue.length) {
    const p = queue.pop()!;
    data[p * 4 + 3] = 0;
    const x = p % w, y = (p / w) | 0;
    for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]) {
      if (q >= 0 && !visited[q] && near(q)) { visited[q] = 1; queue.push(q); }
    }
  }
  // Non-white canvas → also clear the enclosed pockets the fill can't reach.
  const canvasIsWhite = br > 235 && bg > 235 && bb > 235;
  if (!canvasIsWhite) {
    for (let p = 0; p < w * h; p++) if (data[p * 4 + 3] !== 0 && near(p)) data[p * 4 + 3] = 0;
  }
  return sharp(data, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}

/** Bounding box of visible (alpha) pixels — trim that respects the knockout. */
async function trimToAlpha(png: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (data[(y * w + x) * 4 + 3] > 16) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return png; // nothing visible — leave as-is
  return sharp(png).extract({ left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 }).png().toBuffer();
}

/**
 * Design resized to the scene's fabric circle (centered, scaled to it).
 * Background knocked out and padding trimmed first, so the visible artwork —
 * not the file's canvas — gets the 15% buffer and nothing boxes the fabric.
 */
async function prepDesign(design: Buffer, spot: Spot) {
  const size = Math.round(2 * spot.r * DESIGN_FILL);
  // Bound the raster before pixel passes (SVGs at density 300 can be huge).
  const raster = await sharp(design, { density: 300 })
    .rotate()
    .resize(1600, 1600, { fit: 'inside', withoutEnlargement: false })
    .png().toBuffer();
  const cut = await trimToAlpha(await knockoutFlatBackground(raster));
  const buf = await sharp(cut)
    .resize(size, size, { fit: 'inside', withoutEnlargement: false })
    .png().toBuffer();
  const m = await sharp(buf).metadata();
  return { buf, w: m.width ?? size, h: m.height ?? size };
}

/**
 * Alpha mask of the design's actual ink. prepDesign has already knocked out
 * a flat background, so alpha is authoritative here — sub-threshold pixels
 * drop out entirely, keeping the sewn shadow/hatch on the artwork rather
 * than smearing across semi-transparent antialiasing.
 */
async function inkMask(prepped: { buf: Buffer; w: number; h: number }): Promise<Buffer> {
  const { data, info } = await sharp(prepped.buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(data.length);
  for (let i = 0; i < info.width * info.height; i++) {
    const a = data[i * 4 + 3];
    out[i * 4] = data[i * 4]; out[i * 4 + 1] = data[i * 4 + 1]; out[i * 4 + 2] = data[i * 4 + 2];
    out[i * 4 + 3] = a > 40 ? a : 0;
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
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
  // Effects key off the artwork's ink, not the upload's rectangle — opaque
  // (JPEG/white-bg) files would otherwise stamp a visible box on the fabric.
  const ink = await inkMask(prepped);

  // Relief shadow: the ink's silhouette, blurred and nudged down-right.
  const silhouette = await sharp(ink)
    .linear([0, 0, 0, 0.35], [0, 0, 0, 0]) // black at ~35% of the ink's alpha
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
    .composite([{ input: ink, blend: 'dest-in' }]) // only where the design has ink
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

// Fabric-circle geometry re-measured 2026-07-31 on a 100px grid — the old
// eyeballed spots sat the design visibly off-center once sizing was unified.
/** Hoop on natural linen with pastel floss (W&H "Linen" style). */
const flat = (d: Buffer) => hoopPhoto(d, 'hoop-linen.jpg', { cx: 1045, cy: 930, r: 600 });
/** Styled sage flat-lay hoop with leaves/props (W&H "Blocks C" style). */
const framed = (d: Buffer) => hoopPhoto(d, 'hoop-alt.jpg', { cx: 1055, cy: 1005, r: 595 });
/** Clean studio hoop (W&H "Plain Hoop" template). */
const inHoop = (d: Buffer) => hoopPhoto(d, 'hoop-basic.jpg', { cx: 1005, cy: 1025, r: 700 });
/** Hoop on terracotta linen with walnut ring (W&H "Terra Cotta" style). */
const scale = (d: Buffer) => hoopPhoto(d, 'hoop-terra.jpg', { cx: 990, cy: 990, r: 505 });
/**
 * Light sage scene with mustard/teal floss (W&H Alt "Blocks R", hoop offset
 * right). NEW per #335 — replaced the dark Mustard base (Katy, 2026-07-31:
 * dark line art vanished on dark fabric; lighter ground avoids inversions).
 */
const floss = (d: Buffer) => hoopPhoto(d, 'hoop-floss.jpg', { cx: 1560, cy: 1010, r: 600 });
/**
 * Sage sketchbook scene (W&H Alt "Blocks L", hoop offset left) with the
 * fully-sewn render. NEW per #335. Blocks C was the original pick but it is
 * the same photo as the long-standing framed scene — swapped to keep all six
 * scenes distinct.
 */
const sewn = (d: Buffer) => sewnPhoto(d, 'hoop-sage.jpg', { cx: 525, cy: 995, r: 570 });

const COMPOSERS: { id: PackItemId; label: string; fn: (d: Buffer) => Promise<Buffer> }[] = [
  { id: 'flat', label: 'Hoop on linen', fn: flat },
  { id: 'framed', label: 'Styled hoop photo', fn: framed },
  { id: 'in-hoop', label: 'In-hoop mockup', fn: inHoop },
  { id: 'scale', label: 'Hoop on terracotta', fn: scale },
  { id: 'floss', label: 'Hoop with floss', fn: floss },
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
