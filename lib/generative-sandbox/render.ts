/**
 * Applies a stack to a source image, in order.
 *
 * Deliberately no reordering optimisation: order-dependence is the product
 * behaviour, so an optimiser that resequenced for speed would silently break the
 * thing being built (design.md, Decisions).
 */
import sharp from 'sharp';
import { assertServerOnly } from './server-guard';

assertServerOnly('lib/generative-sandbox/render');
import { MODULE_BY_ID, coerceParams } from './modules';
import { IMPLEMENTATIONS } from './modules.server';
import type { StackEntry } from './stack';

/** Longest edge for preview renders. Export re-runs the same stack at full size. */
export const PREVIEW_MAX_EDGE = 1600;

export interface RenderOptions {
  preview?: boolean;
}

export async function renderStack(
  source: Buffer,
  stack: StackEntry[],
  options: RenderOptions = {},
): Promise<Buffer> {
  let buffer = source;

  if (options.preview) {
    // Downscale first so every module in the stack does less work. This is what
    // makes a dragged slider feel immediate before any caching exists.
    buffer = await sharp(buffer)
      .resize({
        width: PREVIEW_MAX_EDGE,
        height: PREVIEW_MAX_EDGE,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .png()
      .toBuffer();
  } else {
    buffer = await sharp(buffer).png().toBuffer();
  }

  for (const entry of stack) {
    if (!entry.enabled) continue;
    const def = MODULE_BY_ID.get(entry.module);
    const impl = IMPLEMENTATIONS[entry.module];
    // An unknown id is skipped rather than fatal: saved stacks must keep loading
    // after the catalogue changes.
    if (!def || !impl) continue;
    buffer = await impl(buffer, coerceParams(def, entry.params));
  }

  return buffer;
}
