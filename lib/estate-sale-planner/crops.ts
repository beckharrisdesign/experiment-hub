/**
 * Pictures cut from the kept originals (sold-comps design D3) — the browser
 * half of a correction. A corrected box gets a fresh 320 px card thumbnail and
 * a larger crop for the re-read; a message sends the item's current picture.
 */
import type { Box } from "./flag";
import { DETAIL_SHOT } from "./config";
import { getPhoto } from "./photos";
import { cropRect, itemThumbnail } from "./thumbs";

export interface Crop {
  /** Base64 JPEG, no data: prefix — what the re-read route takes. */
  data: string;
  /** Square 320 px data URL for the card. */
  thumb: string;
}

function load(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("The photo couldn't be decoded."));
    img.src = url;
  });
}

/** Crop a kept original to a box. Null when the original is no longer on this device. */
export async function cropFromPhoto(photoId: string, box: Box | null): Promise<Crop | null> {
  const blob = await getPhoto(photoId);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  try {
    const img = await load(url);
    const r = cropRect(box, img.naturalWidth, img.naturalHeight);
    const k = Math.min(1, DETAIL_SHOT.maxEdgePx / Math.max(r.w, r.h));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(r.w * k));
    canvas.height = Math.max(1, Math.round(r.h * k));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available in this browser.");
    ctx.drawImage(img, r.x, r.y, r.w, r.h, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL("image/jpeg", DETAIL_SHOT.jpegQuality).split(",")[1] ?? "";
    const thumb = await itemThumbnail(url, box);
    return { data, thumb };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Object URL for showing a whole original (the source photo screen). Caller revokes. */
export async function photoUrl(photoId: string): Promise<string | null> {
  const blob = await getPhoto(photoId);
  return blob ? URL.createObjectURL(blob) : null;
}
