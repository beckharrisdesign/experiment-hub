import { dpiToPpm } from "./size";

const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function physChunk(dpi: number): Uint8Array {
  const ppm = dpiToPpm(dpi);
  const chunk = new Uint8Array(4 + 4 + 9 + 4);
  const v = new DataView(chunk.buffer);
  v.setUint32(0, 9);
  chunk.set([0x70, 0x48, 0x59, 0x73], 4); // "pHYs"
  v.setUint32(8, ppm);
  v.setUint32(12, ppm);
  v.setUint8(16, 1); // unit: meter
  v.setUint32(17, crc32(chunk.subarray(4, 17)));
  return chunk;
}

/**
 * Return a copy of `png` carrying a pHYs chunk for `dpi`, placed right after IHDR (so before
 * the first IDAT). Any existing pHYs is dropped. canvas.toBlob never writes one, and without
 * it LightBurn / xTool Creative Space fall back to their default DPI and import at the wrong size.
 */
export function injectPhys(png: Uint8Array, dpi: number): Uint8Array {
  if (png.length < 8 || SIGNATURE.some((b, i) => png[i] !== b)) {
    throw new Error("Not a PNG file");
  }
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  const parts: Uint8Array[] = [png.subarray(0, 8)];
  let p = 8;
  let inserted = false;
  while (p + 12 <= png.length) {
    const len = view.getUint32(p);
    const end = p + 12 + len;
    if (end > png.length) throw new Error("Truncated PNG chunk");
    const type = String.fromCharCode(png[p + 4], png[p + 5], png[p + 6], png[p + 7]);
    if (type !== "pHYs") parts.push(png.subarray(p, end));
    if (type === "IHDR" && !inserted) {
      parts.push(physChunk(dpi));
      inserted = true;
    }
    p = end;
  }
  if (!inserted) throw new Error("PNG has no IHDR chunk");

  const out = new Uint8Array(parts.reduce((n, part) => n + part.length, 0));
  let o = 0;
  for (const part of parts) {
    out.set(part, o);
    o += part.length;
  }
  return out;
}
