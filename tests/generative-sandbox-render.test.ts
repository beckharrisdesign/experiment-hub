/**
 * @vitest-environment node
 *
 * The hub's vitest defaults to jsdom, which sets `window` — and the sandbox's
 * server modules assert they are not in a browser before importing sharp. This
 * suite exercises exactly that server path, so it opts into the node
 * environment rather than weakening the guard.
 */
import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { renderStack } from '@/lib/generative-sandbox/render';
import { MODULE_BY_ID, coerceParams } from '@/lib/generative-sandbox/modules';
import type { StackEntry } from '@/lib/generative-sandbox/stack';

const entry = (module: string, params: Record<string, number>, enabled = true): StackEntry =>
  ({ uid: module, module, enabled, params });

/** A gradient, so blur and quantization both have something to bite on. */
async function fixture(): Promise<Buffer> {
  return sharp({
    create: { width: 240, height: 240, channels: 3, background: { r: 20, g: 90, b: 160 } },
  })
    .composite([
      {
        input: {
          create: { width: 120, height: 240, channels: 3, background: { r: 230, g: 120, b: 40 } },
        },
        left: 120,
        top: 0,
      },
    ])
    .png()
    .toBuffer();
}

describe('renderStack', () => {
  it('order changes the image — the whole premise of the stack', async () => {
    const source = await fixture();
    const blurThenQuantize = await renderStack(source, [
      entry('blur', { radius: 24 }),
      entry('colour-simplify', { colours: 4 }),
    ]);
    const quantizeThenBlur = await renderStack(source, [
      entry('colour-simplify', { colours: 4 }),
      entry('blur', { radius: 24 }),
    ]);
    expect(blurThenQuantize.equals(quantizeThenBlur)).toBe(false);
  });

  it('a disabled module is excluded but keeps its params in the request', async () => {
    const source = await fixture();
    const withDisabled = await renderStack(source, [
      entry('blur', { radius: 24 }, false),
      entry('colour-simplify', { colours: 4 }),
    ]);
    const withoutIt = await renderStack(source, [entry('colour-simplify', { colours: 4 })]);
    expect(withDisabled.equals(withoutIt)).toBe(true);
  });

  it('an empty stack still returns a valid PNG', async () => {
    const out = await renderStack(await fixture(), []);
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe('png');
  });

  it('preview mode caps the longest edge', async () => {
    const big = await sharp({
      create: { width: 3000, height: 1200, channels: 3, background: { r: 10, g: 10, b: 10 } },
    })
      .png()
      .toBuffer();
    const preview = await sharp(await renderStack(big, [], { preview: true })).metadata();
    const full = await sharp(await renderStack(big, [], { preview: false })).metadata();
    expect(preview.width).toBe(1600);
    expect(full.width).toBe(3000);
  });

  it('out-of-range parameters are clamped, not thrown', async () => {
    const blur = MODULE_BY_ID.get('blur')!;
    expect(coerceParams(blur, { radius: 9999 })).toEqual({ radius: 100 });
    expect(coerceParams(blur, { radius: -5 })).toEqual({ radius: 0 });
    expect(coerceParams(blur, {})).toEqual({ radius: 12 });

    const out = await renderStack(await fixture(), [entry('blur', { radius: 9999 })]);
    expect((await sharp(out).metadata()).format).toBe('png');
  });

  it('an unknown module id is skipped rather than fatal', async () => {
    const source = await fixture();
    const withGhost = await renderStack(source, [entry('does-not-exist', {}), entry('blur', { radius: 8 })]);
    const withoutGhost = await renderStack(source, [entry('blur', { radius: 8 })]);
    expect(withGhost.equals(withoutGhost)).toBe(true);
  });
});
