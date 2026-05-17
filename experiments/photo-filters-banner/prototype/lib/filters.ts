import type { FilterPreset } from "./constants";

export function applyFilterToImageData(
  imageData: ImageData,
  preset: FilterPreset,
): void {
  if (preset === "normal") return;

  const { data } = imageData;
  const n = data.length;

  if (preset === "slate") {
    for (let i = 0; i < n; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      data[i] = Math.round(gray * 0.75 + 40);
      data[i + 1] = Math.round(gray * 0.8 + 48);
      data[i + 2] = Math.round(gray * 0.95 + 72);
    }
    return;
  }

  if (preset === "mono-pop" || preset === "high-contrast") {
    const contrast = preset === "high-contrast" ? 1.35 : 1.2;
    const factor = (259 * (contrast * 80 + 255)) / (255 * (259 - contrast * 80));

    for (let i = 0; i < n; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      if (preset === "mono-pop") {
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        r = g = b = gray;
      }

      data[i] = clamp(factor * (r - 128) + 128);
      data[i + 1] = clamp(factor * (g - 128) + 128);
      data[i + 2] = clamp(factor * (b - 128) + 128);
    }
  }
}

function clamp(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}
