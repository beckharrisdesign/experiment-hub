// Writes public/og.png (1200×630): the sample image, dithered on the left and halftoned on the
// right, made by the same engine the page uses. Regenerate if the sample or the engine changes.
import { writeFileSync } from "node:fs";
import { PNG } from "pngjs";
import { DEFAULT_SETTINGS, processImage, toGray } from "../src/engine/pipeline";
import { sampleImage } from "../src/lib/sample";

const W = 1200, H = 630, HALF = W / 2;
const gray = toGray(sampleImage(HALF, H), HALF, H);
const left = processImage(gray, { ...DEFAULT_SETTINGS, algorithm: "jarvis", gamma: 1.15 });
const right = processImage(gray, { ...DEFAULT_SETTINGS, mode: "halftone", gamma: 1.15, dpi: 300, halftone: { screen: "dot", angle: 45, lpi: 40, dotShape: "round" } });
const png = new PNG({ width: W, height: H, colorType: 0, inputColorType: 0, bitDepth: 8 } as never);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const v = x < HALF ? left.data[y * HALF + x] : right.data[y * HALF + (x - HALF)];
  const i = (y * W + x) * 4; png.data[i] = png.data[i + 1] = png.data[i + 2] = v; png.data[i + 3] = 255;
}
writeFileSync(new URL("../public/og.png", import.meta.url), PNG.sync.write(png, { colorType: 0 }));
console.log("wrote public/og.png", W, H);
