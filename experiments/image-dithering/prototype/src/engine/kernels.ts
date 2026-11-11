/**
 * Error-diffusion kernels as data. Each entry is [dx, dy, weight]: the share of a pixel's
 * quantization error pushed to the neighbor at (x + dx, y + dy), divided by `divisor`.
 * dx is relative to the scan direction, so serpentine rows mirror it automatically.
 *
 * Atkinson's weights sum to 6/8 on purpose — it discards a quarter of the error, which is
 * what gives it its high-contrast look.
 */
export type Kernel = { divisor: number; taps: readonly (readonly [number, number, number])[] };

export const KERNELS = {
  "floyd-steinberg": {
    divisor: 16,
    taps: [
      [1, 0, 7],
      [-1, 1, 3], [0, 1, 5], [1, 1, 1],
    ],
  },
  atkinson: {
    divisor: 8,
    taps: [
      [1, 0, 1], [2, 0, 1],
      [-1, 1, 1], [0, 1, 1], [1, 1, 1],
      [0, 2, 1],
    ],
  },
  jarvis: {
    divisor: 48,
    taps: [
      [1, 0, 7], [2, 0, 5],
      [-2, 1, 3], [-1, 1, 5], [0, 1, 7], [1, 1, 5], [2, 1, 3],
      [-2, 2, 1], [-1, 2, 3], [0, 2, 5], [1, 2, 3], [2, 2, 1],
    ],
  },
  stucki: {
    divisor: 42,
    taps: [
      [1, 0, 8], [2, 0, 4],
      [-2, 1, 2], [-1, 1, 4], [0, 1, 8], [1, 1, 4], [2, 1, 2],
      [-2, 2, 1], [-1, 2, 2], [0, 2, 4], [1, 2, 2], [2, 2, 1],
    ],
  },
  "sierra-lite": {
    divisor: 4,
    taps: [
      [1, 0, 2],
      [-1, 1, 1], [0, 1, 1],
    ],
  },
} as const satisfies Record<string, Kernel>;

export type DiffusionAlgorithm = keyof typeof KERNELS;
