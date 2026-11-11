const MM_PER_INCH = 25.4;

/** Physical length → whole pixels at a DPI (nearest pixel). */
export function mmToPx(mm: number, dpi: number): number {
  return Math.round((mm / MM_PER_INCH) * dpi);
}

/** Pixels per meter for a DPI, as the PNG pHYs chunk stores it. */
export function dpiToPpm(dpi: number): number {
  return Math.round(dpi / (MM_PER_INCH / 1000));
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Fill in the other side from the source aspect ratio, to 0.01 mm. */
export function lockAspect(
  srcW: number,
  srcH: number,
  size: { widthMm: number } | { heightMm: number },
): { widthMm: number; heightMm: number } {
  if ("widthMm" in size) {
    return { widthMm: size.widthMm, heightMm: round2((size.widthMm * srcH) / srcW) };
  }
  return { widthMm: round2((size.heightMm * srcW) / srcH), heightMm: size.heightMm };
}
