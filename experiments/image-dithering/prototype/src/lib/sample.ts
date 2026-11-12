/**
 * The sample image shown until someone adds their own: a lit sphere on a warm backdrop,
 * drawn procedurally so it ships as code, not a file. Replace with a real photo before launch
 * (design.md, Known gaps).
 */
export function sampleImage(width = 800, height = 600): Uint8ClampedArray {
  const out = new Uint8ClampedArray(width * height * 4);
  const cx = 0.42 * width, cy = 0.46 * height, r = 0.3 * height;
  const L = [-0.55, -0.6, 0.58], n = Math.hypot(...L), l = L.map((v) => v / n);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    let v = 200 - (y / height) * 90 + (x / width) * 25;
    if (y > 0.7 * height) v = 150 + ((y - 0.7 * height) / (0.3 * height)) * 60;
    const sx = (x - (cx + 0.18 * r)) / (1.15 * r), sy = (y - 0.72 * height) / (0.12 * r), sh = sx * sx + sy * sy;
    if (sh < 1) v *= 0.45 + 0.55 * sh;
    const dx = (x - cx) / r, dy = (y - cy) / r, d2 = dx * dx + dy * dy;
    if (d2 < 1) { const dz = Math.sqrt(1 - d2); const lam = Math.max(0, dx * l[0] + dy * l[1] + dz * l[2]); v = 18 + 210 * lam + 60 * lam ** 40; }
    const i = (y * width + x) * 4;
    out[i] = Math.min(255, v * 1.08); out[i + 1] = Math.min(255, v * 0.98); out[i + 2] = Math.min(255, v * 0.86); out[i + 3] = 255;
  }
  return out;
}
