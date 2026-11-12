// Writes tests/fixtures/photo.png: a small, fixed RGB "photo" (lit sphere on a warm backdrop).
// Deterministic. Committed; regenerate only if the fixture needs to change.
import { writeFileSync } from "node:fs";
import { PNG } from "pngjs";
const W = 400, H = 300;
const png = new PNG({ width: W, height: H });
const cx = 0.42 * W, cy = 0.46 * H, r = 0.3 * H;
const l = [-0.55, -0.6, 0.58].map((v, _, a) => v / Math.hypot(...a));
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  let v = 200 - (y / H) * 90 + (x / W) * 25;
  if (y > 0.7 * H) v = 150 + ((y - 0.7 * H) / (0.3 * H)) * 60;
  const dx = (x - cx) / r, dy = (y - cy) / r, d2 = dx * dx + dy * dy;
  if (d2 < 1) { const dz = Math.sqrt(1 - d2); const lam = Math.max(0, dx * l[0] + dy * l[1] + dz * l[2]); v = 18 + 210 * lam + 60 * Math.pow(lam, 40); }
  const i = (y * W + x) * 4;
  png.data[i] = Math.min(255, v * 1.08); png.data[i + 1] = Math.min(255, v * 0.98); png.data[i + 2] = Math.min(255, v * 0.86); png.data[i + 3] = 255;
}
writeFileSync(new URL("../tests/fixtures/photo.png", import.meta.url), PNG.sync.write(png));
console.log("wrote tests/fixtures/photo.png", W, H);
