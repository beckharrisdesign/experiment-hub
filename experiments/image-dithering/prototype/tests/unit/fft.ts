// Independent 2D FFT for the screen-angle test. Deliberately not shared with src/, so the
// test does not trust the implementation it is checking.

function fft1d(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    for (let i = 0; i < n; i += len) {
      for (let k = 0; k < len / 2; k++) {
        const wr = Math.cos(ang * k), wi = Math.sin(ang * k);
        const ar = re[i + k + len / 2], ai = im[i + k + len / 2];
        const xr = ar * wr - ai * wi, xi = ar * wi + ai * wr;
        re[i + k + len / 2] = re[i + k] - xr;
        im[i + k + len / 2] = im[i + k] - xi;
        re[i + k] += xr;
        im[i + k] += xi;
      }
    }
  }
}

/**
 * Direction, in degrees [0, 180), of the strongest non-DC frequency of a square power-of-two
 * image. x to the right, y down (image coordinates). Frequencies below `minRadius` bins are
 * ignored so slow edge effects can't win.
 */
export function dominantDirection(data: Uint8ClampedArray, size: number, minRadius = 4): number {
  const re = new Float64Array(size * size);
  const im = new Float64Array(size * size);
  let mean = 0;
  for (const v of data) mean += v;
  mean /= data.length;
  for (let i = 0; i < data.length; i++) re[i] = data[i] - mean;
  const rr = new Float64Array(size), ri = new Float64Array(size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) { rr[x] = re[y * size + x]; ri[x] = im[y * size + x]; }
    fft1d(rr, ri);
    for (let x = 0; x < size; x++) { re[y * size + x] = rr[x]; im[y * size + x] = ri[x]; }
  }
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) { rr[y] = re[y * size + x]; ri[y] = im[y * size + x]; }
    fft1d(rr, ri);
    for (let y = 0; y < size; y++) { re[y * size + x] = rr[y]; im[y * size + x] = ri[y]; }
  }
  let best = -1, bx = 0, by = 0;
  const half = size / 2;
  for (let ky = -half + 1; ky < half; ky++) {
    for (let kx = -half + 1; kx < half; kx++) {
      if (Math.hypot(kx, ky) < minRadius) continue;
      const i = ((ky + size) % size) * size + ((kx + size) % size);
      const p = re[i] * re[i] + im[i] * im[i];
      if (p > best) { best = p; bx = kx; by = ky; }
    }
  }
  return ((Math.atan2(by, bx) * 180) / Math.PI + 360) % 180;
}

/** Smallest distance between two directions taken modulo `period` degrees. */
export function angleDiff(a: number, b: number, period: number): number {
  const d = (((a - b) % period) + period) % period;
  return Math.min(d, period - d);
}
