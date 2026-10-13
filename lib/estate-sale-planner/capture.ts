/**
 * Frame capture — the browser half. Draws a walkthrough video (or photos)
 * onto a canvas on the device, hands the pure sampler the thumbnails, and
 * returns only the frames that survive the budget. Nothing here touches the
 * network: the caller sends on the user's confirm.
 */

import { FRAME_BUDGET } from "./config";
import { grayFromRgba, sampleTimes, selectFrames, type FrameSignature } from "./frames";

export interface CapturedFrame extends FrameSignature {
  /** Base64 JPEG without the data: prefix — what the flag route takes. */
  data: string;
  /** data: URL for the confirm grid. */
  preview: string;
}

export interface CaptureProgress {
  done: number;
  total: number;
}

function scaledSize(w: number, h: number): [number, number] {
  const edge = Math.max(w, h);
  if (edge <= FRAME_BUDGET.maxEdgePx) return [w, h];
  const k = FRAME_BUDGET.maxEdgePx / edge;
  return [Math.round(w * k), Math.round(h * k)];
}

function encode(
  source: CanvasImageSource,
  w: number,
  h: number,
  id: string,
  at: number,
): CapturedFrame {
  const [cw, ch] = scaledSize(w, h);
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available in this browser.");
  ctx.drawImage(source, 0, 0, cw, ch);

  const tiny = document.createElement("canvas");
  tiny.width = 8;
  tiny.height = 8;
  const tctx = tiny.getContext("2d");
  if (!tctx) throw new Error("Canvas is not available in this browser.");
  tctx.drawImage(canvas, 0, 0, 8, 8);
  const gray = grayFromRgba(tctx.getImageData(0, 0, 8, 8).data);

  const preview = canvas.toDataURL("image/jpeg", FRAME_BUDGET.jpegQuality);
  return { id, at, gray, data: preview.split(",")[1] ?? "", preview };
}

function loadVideo(file: File): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = URL.createObjectURL(file);
    video.onloadedmetadata = () => resolve(video);
    video.onerror = () => reject(new Error("That video couldn't be read. Try a different file."));
  });
}

function seek(video: HTMLVideoElement, t: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const onSeeked = () => {
      video.removeEventListener("seeked", onSeeked);
      resolve();
    };
    video.addEventListener("seeked", onSeeked);
    video.onerror = () => reject(new Error("Seeking the video failed."));
    video.currentTime = Math.min(t, Math.max(0, video.duration - 0.05));
  });
}

/** Sample a walkthrough video into budgeted frames, entirely on the device. */
export async function framesFromVideo(
  file: File,
  onProgress?: (p: CaptureProgress) => void,
): Promise<CapturedFrame[]> {
  const video = await loadVideo(file);
  try {
    const times = sampleTimes(video.duration);
    const all: CapturedFrame[] = [];
    for (let i = 0; i < times.length; i++) {
      await seek(video, times[i]);
      all.push(encode(video, video.videoWidth, video.videoHeight, `v${i}`, times[i]));
      onProgress?.({ done: i + 1, total: times.length });
    }
    return selectFrames(all);
  } finally {
    URL.revokeObjectURL(video.src);
  }
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`${file.name} couldn't be read.`));
    img.src = URL.createObjectURL(file);
  });
}

/** Photos are frames too — one per file, same budget. */
export async function framesFromPhotos(
  files: File[],
  onProgress?: (p: CaptureProgress) => void,
): Promise<CapturedFrame[]> {
  const all: CapturedFrame[] = [];
  for (let i = 0; i < files.length; i++) {
    const img = await loadImage(files[i]);
    try {
      all.push(encode(img, img.naturalWidth, img.naturalHeight, `p${i}`, i));
    } finally {
      URL.revokeObjectURL(img.src);
    }
    onProgress?.({ done: i + 1, total: files.length });
  }
  return selectFrames(all);
}

export function isVideo(file: File): boolean {
  return file.type.startsWith("video/");
}
