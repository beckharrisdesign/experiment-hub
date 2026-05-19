/**
 * Map a CSS-pixel rectangle (relative to the layout viewport) onto the bitmap
 * returned by chrome.tabs.captureVisibleTab. Chrome scales the capture to
 * device pixels; innerWidth/innerHeight describe the CSS viewport, so scale
 * factors are imgW/cssW (not 1/dpr alone — avoids drift on fractional DPR).
 */

export function cssRectToBitmapRect(rect, viewportCss, imageWidth, imageHeight) {
  const sx = (rect.left / viewportCss.width) * imageWidth;
  const sy = (rect.top / viewportCss.height) * imageHeight;
  const sw = (rect.width / viewportCss.width) * imageWidth;
  const sh = (rect.height / viewportCss.height) * imageHeight;
  return {
    sx: Math.max(0, Math.floor(sx)),
    sy: Math.max(0, Math.floor(sy)),
    sw: Math.max(1, Math.round(sw)),
    sh: Math.max(1, Math.round(sh)),
  };
}

/**
 * @param {string} dataUrl - full visible-tab PNG/JPEG data URL
 * @param {{ left: number, top: number, width: number, height: number }} rectCss
 * @param {{ width: number, height: number }} viewportCss
 * @returns {Promise<Blob>}
 */
export async function cropVisibleTabToPngBlob(dataUrl, rectCss, viewportCss) {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const bitmap = await createImageBitmap(blob);
  try {
    const { sx, sy, sw, sh } = cssRectToBitmapRect(
      rectCss,
      viewportCss,
      bitmap.width,
      bitmap.height
    );
    const canvas = new OffscreenCanvas(sw, sh);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, sw, sh);
    return canvas.convertToBlob({ type: 'image/png' });
  } finally {
    bitmap.close();
  }
}

export async function blobToDataUrl(blob) {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  const base64 = btoa(binary);
  return `data:image/png;base64,${base64}`;
}
