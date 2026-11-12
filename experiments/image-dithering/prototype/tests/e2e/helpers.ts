import { readFileSync } from "node:fs";
import { expect, type Page } from "@playwright/test";

export const FIXTURE = new URL("../fixtures/photo.png", import.meta.url).pathname;

/** Chunks of a PNG, read independently of the app. */
export function pngInfo(buf: Buffer) {
  const width = buf.readUInt32BE(16), height = buf.readUInt32BE(20);
  let p = 8, ppmX: number | null = null, ppmY: number | null = null, unit: number | null = null;
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString("ascii", p + 4, p + 8);
    if (type === "pHYs") { ppmX = buf.readUInt32BE(p + 8); ppmY = buf.readUInt32BE(p + 12); unit = buf[p + 16]; }
    p += 12 + len;
  }
  return { width, height, ppmX, ppmY, unit };
}

export const step = (page: Page, name: string) => page.getByRole("region", { name });

/** Wait until every tile in a step has painted a preview. */
export async function expectRendered(page: Page, stepName: string, count: number) {
  const tiles = step(page, stepName).locator("[data-tile][data-rendered='true']");
  await expect(tiles).toHaveCount(count, { timeout: 20_000 });
}

export const readDownload = (path: string) => readFileSync(path);
