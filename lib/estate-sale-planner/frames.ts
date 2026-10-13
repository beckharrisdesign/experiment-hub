/**
 * Frame sampling — the pure half.
 *
 * The browser half (lib/estate-sale-planner/capture.ts) draws <video> onto a
 * canvas; this file decides WHICH frames survive, so the budget and the
 * de-duplication are unit-testable without a DOM. A frame here is already a
 * tiny greyscale thumbnail (8×8 = 64 bytes) plus an id; the full JPEG lives
 * with the caller.
 */

import { FRAME_BUDGET } from "./config";

export interface FrameSignature {
  /** Caller's handle for the full-size frame. */
  id: string;
  /** Seconds into the video, or the photo's index. */
  at: number;
  /** 8×8 greyscale thumbnail, 64 values in 0–255. */
  gray: Uint8Array | number[];
}

/** Mean absolute difference between two equal-length greyscale thumbnails. */
export function meanAbsDiff(a: ArrayLike<number>, b: ArrayLike<number>): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 255;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += Math.abs(a[i] - b[i]);
  return sum / n;
}

/** Sample times for a video of `durationSeconds`, on the budget's interval. */
export function sampleTimes(
  durationSeconds: number,
  interval = FRAME_BUDGET.intervalSeconds,
): number[] {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return [0];
  const times: number[] = [];
  for (let t = 0; t < durationSeconds; t += interval) times.push(Number(t.toFixed(3)));
  return times;
}

export interface SelectFramesOptions {
  maxFrames?: number;
  duplicateMeanDiff?: number;
}

/**
 * Keep frames that differ from the last kept frame, then cap at the budget.
 * When the cap bites, frames are thinned evenly across the walkthrough rather
 * than truncated, so the last rooms are not the ones that get dropped.
 */
export function selectFrames<T extends FrameSignature>(
  frames: T[],
  { maxFrames = FRAME_BUDGET.maxFrames, duplicateMeanDiff = FRAME_BUDGET.duplicateMeanDiff }: SelectFramesOptions = {},
): T[] {
  const kept: T[] = [];
  for (const frame of frames) {
    const last = kept[kept.length - 1];
    if (!last || meanAbsDiff(last.gray, frame.gray) >= duplicateMeanDiff) kept.push(frame);
  }
  if (kept.length <= maxFrames) return kept;
  const step = kept.length / maxFrames;
  const thinned: T[] = [];
  for (let i = 0; i < maxFrames; i++) thinned.push(kept[Math.floor(i * step)]);
  return thinned;
}

/** 8×8 greyscale from RGBA pixel data already downscaled to 8×8. */
export function grayFromRgba(rgba: ArrayLike<number>): Uint8Array {
  const out = new Uint8Array(64);
  for (let i = 0; i < 64; i++) {
    const r = rgba[i * 4] ?? 0;
    const g = rgba[i * 4 + 1] ?? 0;
    const b = rgba[i * 4 + 2] ?? 0;
    out[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }
  return out;
}
