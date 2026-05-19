/**
 * Future: upload cropped PNG to an image host and return a public markdown URL.
 * Keep call sites behind this module so GitHub body assembly stays stable.
 */
export async function uploadScreenshotForMarkdown(_blob, _meta) {
  throw new Error(
    'Image hosting is not implemented in v1. Use local download + issue body filename.'
  );
}
