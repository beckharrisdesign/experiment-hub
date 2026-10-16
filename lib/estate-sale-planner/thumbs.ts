/**
 * Item thumbnails — "what it thinks it found".
 *
 * The model names the frame an object is clearest in and, when it can, a
 * normalized box around it. The device crops the kept frame to that box and
 * keeps a small JPEG with the item, so the card can show the object rather
 * than a label. `cropRect` is the pure half (tested); `itemThumbnail` draws.
 */

import type { Box } from "./flag";

export const THUMB = {
  /** Output edge in px; cards render it at 2× density on phones. */
  size: 320,
  jpegQuality: 0.7,
  /** Padding added around the model's box, as a fraction of the box. */
  pad: 0.15,
  /** A box smaller than this fraction of the frame is widened to it. */
  minFraction: 0.28,
} as const;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Source rectangle in frame pixels for a thumbnail: the model's box, padded,
 * never smaller than `minFraction` of the frame, and clamped to the frame.
 * Without a box the whole frame is used.
 */
export function cropRect(box: Box | null | undefined, frameW: number, frameH: number): Rect {
  if (!box || box.w <= 0 || box.h <= 0) return { x: 0, y: 0, w: frameW, h: frameH };
  let w = Math.max(box.w * (1 + THUMB.pad * 2), THUMB.minFraction);
  let h = Math.max(box.h * (1 + THUMB.pad * 2), THUMB.minFraction);
  w = Math.min(w, 1);
  h = Math.min(h, 1);
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  let x = cx - w / 2;
  let y = cy - h / 2;
  x = Math.min(Math.max(x, 0), 1 - w);
  y = Math.min(Math.max(y, 0), 1 - h);
  return {
    x: Math.round(x * frameW),
    y: Math.round(y * frameH),
    w: Math.max(1, Math.round(w * frameW)),
    h: Math.max(1, Math.round(h * frameH)),
  };
}

function loadDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Frame couldn't be decoded."));
    img.src = dataUrl;
  });
}

/** Crop a kept frame (data URL) to the item's box; square, cover-fit. */
export async function itemThumbnail(frameDataUrl: string, box: Box | null | undefined): Promise<string> {
  const img = await loadDataUrl(frameDataUrl);
  const r = cropRect(box, img.naturalWidth, img.naturalHeight);
  const side = Math.min(r.w, r.h);
  const sx = r.x + (r.w - side) / 2;
  const sy = r.y + (r.h - side) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = THUMB.size;
  canvas.height = THUMB.size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available in this browser.");
  ctx.drawImage(img, sx, sy, side, side, 0, 0, THUMB.size, THUMB.size);
  return canvas.toDataURL("image/jpeg", THUMB.jpegQuality);
}
