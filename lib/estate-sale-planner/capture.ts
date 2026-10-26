/**
 * Photo capture — the browser half (round 05a: photos are the primitive, no
 * video). Each photo the family takes is drawn onto a canvas on the device,
 * scaled to the budget, and returned as one frame for the model. Nothing here
 * touches the network: the caller sends on the user's confirm.
 */

import { DETAIL_SHOT, PHOTO_BUDGET } from "./config";
import { itemThumbnail } from "./thumbs";

export interface CapturedFrame {
  id: string;
  /** Position in the pass — what the flag route echoes back as `frame`. */
  at: number;
  /** Base64 JPEG without the data: prefix — what the flag route takes. */
  data: string;
  /** data: URL for the confirm grid. */
  preview: string;
}

export interface CaptureProgress {
  done: number;
  total: number;
}

export function scaledSize(w: number, h: number, maxEdge: number = PHOTO_BUDGET.maxEdgePx): [number, number] {
  const edge = Math.max(w, h);
  if (edge <= maxEdge) return [w, h];
  const k = maxEdge / edge;
  return [Math.round(w * k), Math.round(h * k)];
}

function encode(source: CanvasImageSource, w: number, h: number, id: string, at: number): CapturedFrame {
  const [cw, ch] = scaledSize(w, h);
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available in this browser.");
  ctx.drawImage(source, 0, 0, cw, ch);
  const preview = canvas.toDataURL("image/jpeg", PHOTO_BUDGET.jpegQuality);
  return { id, at, data: preview.split(",")[1] ?? "", preview };
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`${file.name} couldn't be read.`));
    img.src = URL.createObjectURL(file);
  });
}

/** Keep only image files, in the order they were chosen, within the budget. */
export function pickPhotos(files: File[], max: number = PHOTO_BUDGET.maxPhotos): File[] {
  return files.filter((f) => f.type.startsWith("image/")).slice(0, max);
}

/** One frame per photo, same budget as before; the caller already capped the list. */
export async function framesFromPhotos(
  files: File[],
  onProgress?: (p: CaptureProgress) => void,
): Promise<CapturedFrame[]> {
  const photos = pickPhotos(files);
  const all: CapturedFrame[] = [];
  for (let i = 0; i < photos.length; i++) {
    const img = await loadImage(photos[i]);
    try {
      all.push(encode(img, img.naturalWidth, img.naturalHeight, `p${i}`, i));
    } finally {
      URL.revokeObjectURL(img.src);
    }
    onProgress?.({ done: i + 1, total: photos.length });
  }
  return all;
}

export interface DetailShot {
  /** Base64 JPEG without the data: prefix — what the refine route takes. */
  data: string;
  /** Square 320 px data URL for the card and the sheet. */
  thumb: string;
}

/**
 * A detail shot — a seam, a stamp on the bottom. Encoded larger than a
 * room photo because the point is legibility, plus a small square thumb for
 * the card. Nothing leaves the device until the caller posts it.
 */
export async function detailFromPhoto(file: File): Promise<DetailShot> {
  const img = await loadImage(file);
  try {
    const [w, h] = scaledSize(img.naturalWidth, img.naturalHeight, DETAIL_SHOT.maxEdgePx);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available in this browser.");
    ctx.drawImage(img, 0, 0, w, h);
    const full = canvas.toDataURL("image/jpeg", DETAIL_SHOT.jpegQuality);
    const thumb = await itemThumbnail(full, null);
    return { data: full.split(",")[1] ?? "", thumb };
  } finally {
    URL.revokeObjectURL(img.src);
  }
}
