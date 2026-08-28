/**
 * Transform module IMPLEMENTATIONS — server only.
 *
 * Keyed by the ids declared in modules.ts. Every implementation takes a PNG
 * buffer and returns a PNG buffer, so modules chain in any order; that is what
 * makes the stack order-dependent rather than a pipeline with switches.
 */
import 'server-only';
import sharp from 'sharp';

export type ModuleImpl = (input: Buffer, params: Record<string, number>) => Promise<Buffer>;

export const IMPLEMENTATIONS: Record<string, ModuleImpl> = {
  async blur(input, { radius }) {
    // sharp rejects sigma below 0.3; radius 0 is a legitimate "off" value, so
    // pass the buffer straight through rather than erroring.
    if (radius <= 0) return input;
    return sharp(input).blur(Math.max(0.3, radius / 4)).png().toBuffer();
  },

  async 'colour-simplify'(input, { colours }) {
    // Re-encoding through a palette PNG is what actually reduces the pixel data,
    // so a module later in the stack sees the quantized image rather than the
    // original. This is why blur-then-quantize differs from quantize-then-blur.
    return sharp(input).png({ palette: true, colors: Math.round(colours) }).toBuffer();
  },
};
