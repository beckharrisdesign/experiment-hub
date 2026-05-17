import type { BannerOverlay } from "./constants";

export function drawBannerOverlays(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  overlays: BannerOverlay[],
): void {
  for (const overlay of overlays) {
    if (overlay === "header") {
      drawHeaderBand(ctx, width, height);
    } else if (overlay === "footer") {
      drawFooterRibbon(ctx, width, height);
    }
  }
}

function drawHeaderBand(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  const bandHeight = Math.max(48, Math.round(height * 0.12));
  const gradient = ctx.createLinearGradient(0, 0, 0, bandHeight);
  gradient.addColorStop(0, "rgba(15, 23, 42, 0.92)");
  gradient.addColorStop(1, "rgba(15, 23, 42, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, bandHeight);

  ctx.fillStyle = "rgba(201, 209, 217, 0.95)";
  ctx.font = "600 14px system-ui, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText("Photo banner studio", 16, bandHeight / 2);
}

function drawFooterRibbon(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  const ribbonHeight = Math.max(40, Math.round(height * 0.1));
  const y = height - ribbonHeight;
  ctx.fillStyle = "rgba(88, 166, 255, 0.88)";
  ctx.fillRect(0, y, width, ribbonHeight);

  ctx.fillStyle = "rgba(13, 17, 23, 0.95)";
  ctx.font = "600 13px system-ui, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText("Download your moment", 16, y + ribbonHeight / 2);
}
