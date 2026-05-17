import { drawBannerOverlays } from "./banners";
import type { BannerOverlay } from "./constants";
import type { FilterPreset } from "./constants";
import { applyFilterToImageData } from "./filters";

export function paintComposite(
  canvas: HTMLCanvasElement,
  source: HTMLImageElement,
  filter: FilterPreset,
  banners: BannerOverlay[],
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const width = source.naturalWidth;
  const height = source.naturalHeight;
  canvas.width = width;
  canvas.height = height;

  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(source, 0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);
  applyFilterToImageData(imageData, filter);
  ctx.putImageData(imageData, 0, 0);

  drawBannerOverlays(ctx, width, height, banners);
}

export function downloadCanvasPng(canvas: HTMLCanvasElement, filename: string): void {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}
