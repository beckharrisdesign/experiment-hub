// Regenerates the Estate Sale Planner app icons (placeholder art until the founder supplies her own).
// Run: node scripts/estate-sale-planner/icons.mjs
import sharp from "sharp";
const BG = "#14100d", CORAL = "#f0905d", INK = "#2b1407";
// A price tag (the sale) with a house cut into it (the estate). Drawn on a 512 grid; `k` scales
// the mark so the maskable variant keeps it inside the 80% safe zone.
const mark = (k) => `<g transform="translate(256 256) scale(${k}) translate(-256 -256) translate(10 -9) translate(256 256) scale(${1/1}) translate(-256 -256)">
<g transform="rotate(-45 256 256)">
  <path d="M136 176 Q136 156 156 156 H340 L408 256 L340 356 H156 Q136 356 136 336 Z" fill="${CORAL}"/>
  <circle cx="352" cy="256" r="18" fill="${BG}"/>
</g>
<g transform="translate(-14 -4)">
  <path d="M206 278 L256 236 L306 278 V326 Q306 334 298 334 H214 Q206 334 206 326 Z" fill="${INK}"/>
  <rect x="245" y="298" width="22" height="36" rx="3" fill="${CORAL}"/>
</g></g>`;
const svg = (k) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" fill="${BG}"/>${mark(k)}</svg>`);
const out = process.argv[2] ?? "public/estate-sale-planner";
await sharp(svg(1.12)).resize(512).png().toFile(`${out}/icon-512.png`);
await sharp(svg(1.12)).resize(192).png().toFile(`${out}/icon-192.png`);
await sharp(svg(0.86)).resize(512).png().toFile(`${out}/icon-maskable-512.png`);
await sharp(svg(1.12)).resize(180).png().toFile(`${out}/apple-touch-icon.png`);
console.log("ok");
