import { crc32 } from "node:zlib";
import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";
import { injectPhys } from "../../src/engine/png-phys";

/** A plain PNG with no pHYs chunk, the way canvas.toBlob produces one. */
function fixturePng(width: number, height: number): Uint8Array {
  const png = new PNG({ width, height });
  for (let i = 0; i < width * height; i++) {
    const v = (i * 37) % 256;
    png.data.set([v, v, v, 255], i * 4);
  }
  return new Uint8Array(PNG.sync.write(png));
}

type Chunk = { type: string; data: Uint8Array; crc: number; crcInput: Uint8Array };

/** Independent chunk reader, so the test does not trust the implementation's parser. */
function chunks(png: Uint8Array): Chunk[] {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  const out: Chunk[] = [];
  let p = 8;
  while (p < png.length) {
    const len = view.getUint32(p);
    const type = String.fromCharCode(...png.subarray(p + 4, p + 8));
    const data = png.subarray(p + 8, p + 8 + len);
    const crc = view.getUint32(p + 8 + len);
    out.push({ type, data, crc, crcInput: png.subarray(p + 4, p + 8 + len) });
    p += 12 + len;
  }
  return out;
}

describe("injectPhys", () => {
  // Test 12
  it("writes 11811 pixels per meter on both axes, unit = meter, at 300 DPI", () => {
    const phys = chunks(injectPhys(fixturePng(7, 5), 300)).find((c) => c.type === "pHYs");
    expect(phys).toBeDefined();
    const v = new DataView(phys!.data.buffer, phys!.data.byteOffset, phys!.data.byteLength);
    expect(phys!.data.length).toBe(9);
    expect(v.getUint32(0)).toBe(11811);
    expect(v.getUint32(4)).toBe(11811);
    expect(v.getUint8(8)).toBe(1);
  });

  // Test 13
  it("puts pHYs before the first IDAT with a valid CRC, and the file still decodes", () => {
    const out = injectPhys(fixturePng(7, 5), 300);
    const list = chunks(out);
    const physAt = list.findIndex((c) => c.type === "pHYs");
    const idatAt = list.findIndex((c) => c.type === "IDAT");
    expect(physAt).toBeGreaterThan(0);
    expect(physAt).toBeLessThan(idatAt);
    expect(list[physAt].crc).toBe(crc32(list[physAt].crcInput));

    const decoded = PNG.sync.read(Buffer.from(out), { checkCRC: true } as never);
    expect([decoded.width, decoded.height]).toEqual([7, 5]);
  });

  it("replaces an existing pHYs instead of adding a second one", () => {
    const twice = injectPhys(injectPhys(fixturePng(3, 3), 96), 300);
    const phys = chunks(twice).filter((c) => c.type === "pHYs");
    expect(phys).toHaveLength(1);
    expect(new DataView(phys[0].data.buffer, phys[0].data.byteOffset).getUint32(0)).toBe(11811);
  });

  it("rejects bytes that are not a PNG", () => {
    expect(() => injectPhys(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9]), 300)).toThrow();
  });
});
