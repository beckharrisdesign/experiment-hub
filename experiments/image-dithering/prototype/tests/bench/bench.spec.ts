import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { PNG } from "pngjs";

// Real browser, real worker. Each budget from the brief is measured from the user's action to
// the pixels being on screen (or the download starting), and written to bench-results.json.
function photo(width: number, height: number): string {
  const png = new PNG({ width, height });
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4, v = (128 + 100 * Math.sin(x / 37) * Math.cos(y / 53)) | 0;
    png.data[i] = v; png.data[i + 1] = (v * 0.9) | 0; png.data[i + 2] = (v * 0.8) | 0; png.data[i + 3] = 255;
  }
  const p = join(tmpdir(), `bench-${width}x${height}.png`);
  writeFileSync(p, PNG.sync.write(png));
  return p;
}
const results: Record<string, number> = {};
const best = (xs: number[]) => Math.round(Math.min(...xs));
const median = (xs: number[]) => Math.round([...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]);

async function upload(page: Page, file: string): Promise<number> {
  // Time from the file being handed to the input to all 8 tiles painted.
  await page.evaluate(() => { (window as any).__t0 = 0; document.querySelector("#file")!.addEventListener("change", () => ((window as any).__t0 = performance.now()), { once: true, capture: true }); });
  await page.getByLabel("Choose an image").setInputFiles(file);
  // Only paints that happened after the upload count.
  await page.waitForFunction(() => {
    const t0 = (window as any).__t0;
    const cs = [...document.querySelectorAll<HTMLCanvasElement>("#effect-grid canvas")];
    return t0 > 0 && cs.length === 8 && cs.every((c) => Number(c.dataset.paintedAt) > t0);
  }, null, { timeout: 120_000, polling: 50 });
  await expect(page.locator("#effect-grid [data-rendered='true']")).toHaveCount(8);
  return page.evaluate(() => Math.max(...[...document.querySelectorAll<HTMLCanvasElement>("#effect-grid canvas")].map((c) => Number(c.dataset.paintedAt))) - (window as any).__t0);
}

test("preview update after a slider change, 2 MP (budget 300 ms)", async ({ page }) => {
  await page.goto("/");
  await upload(page, photo(1633, 1225));
  await page.locator("#effect-grid .tile").first().click();
  await page.locator("#step-effect [data-next]").click();
  await expect(page.locator("#fine-grid [data-rendered='true']")).toHaveCount(4, { timeout: 60_000 });
  await page.locator(".advanced summary").click();
  const runs: number[] = [];
  for (const g of [1.3, 1.1, 1.5, 0.9, 1.2]) {
    runs.push(await page.evaluate(async (gamma) => {
      const c = document.querySelector<HTMLCanvasElement>("#fine-current")!;
      const s = document.querySelector<HTMLInputElement>("#adv-gamma")!;
      const t0 = performance.now();
      s.value = String(gamma); s.dispatchEvent(new Event("input", { bubbles: true }));
      while (!(Number(c.dataset.paintedAt) > t0)) await new Promise((r) => requestAnimationFrame(r));
      return Number(c.dataset.paintedAt) - t0;
    }, g));
  }
  results.previewSliderMs2MP = median(runs);
  console.log("slider → preview (2 MP), runs:", runs.map(Math.round), "median", results.previewSliderMs2MP);
});

test("comparison grid of 8 for a 12 MP photo (budget 1.5 s) and full-res Floyd–Steinberg export (budget 2 s)", async ({ page }) => {
  await page.goto("/");
  const file = photo(4000, 3000);
  results.grid8Ms12MP = Math.round(await upload(page, file));
  console.log("12 MP upload → 8 tiles painted:", results.grid8Ms12MP, "ms");

  await page.getByRole("button", { name: "Floyd–Steinberg" }).click();
  await page.locator("#step-effect [data-next]").click();
  await page.locator("#step-fine [data-next]").click();
  await page.locator("#width-px").fill("4000");
  await page.locator("#width-px").dispatchEvent("change");
  const runs: number[] = [];
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => {
      const orig = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function () { (window as any).__tDl = performance.now(); HTMLAnchorElement.prototype.click = orig; return orig.call(this); };
    });
    const [download] = await Promise.all([page.waitForEvent("download"), page.evaluate(() => { (window as any).__tBtn = performance.now(); document.querySelector<HTMLButtonElement>("#download")!.click(); })]);
    await download.path();
    runs.push(await page.evaluate(() => (window as any).__tDl - (window as any).__tBtn));
  }
  results.exportFsMs12MP = best(runs);
  console.log("12 MP Floyd–Steinberg export (click → file ready), runs:", runs.map(Math.round), "best", results.exportFsMs12MP);
});

test.afterAll(() => {
  writeFileSync("bench-results.json", JSON.stringify({ when: new Date().toISOString(), ...results }, null, 2));
});
