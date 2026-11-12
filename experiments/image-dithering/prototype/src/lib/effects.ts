import type { Algorithm } from "../engine/dither";
import type { HalftoneOptions } from "../engine/halftone";
import type { Settings } from "../engine/pipeline";

export type Effect = { label: string; apply: (s: Settings) => Settings };

const dither = (label: string, algorithm: Algorithm): Effect => ({ label, apply: (s) => ({ ...s, mode: "dither", algorithm }) });
const screen = (label: string, h: Omit<HalftoneOptions, "dpi">): Effect => ({ label, apply: (s) => ({ ...s, mode: "halftone", halftone: h }) });

export const DITHER_EFFECTS: Effect[] = [
  dither("Floyd–Steinberg", "floyd-steinberg"),
  dither("Atkinson", "atkinson"),
  dither("Jarvis–Judice–Ninke", "jarvis"),
  dither("Stucki", "stucki"),
  dither("Sierra Lite", "sierra-lite"),
  dither("Bayer 4×4", "bayer-4"),
  dither("Bayer 8×8", "bayer-8"),
  dither("Threshold", "threshold"),
];

export const HALFTONE_EFFECTS: Effect[] = [
  screen("Round dots · 45°", { screen: "dot", angle: 45, lpi: 50, dotShape: "round" }),
  screen("Square dots", { screen: "dot", angle: 45, lpi: 50, dotShape: "square" }),
  screen("Ellipse dots", { screen: "dot", angle: 45, lpi: 50, dotShape: "ellipse" }),
  screen("Diamond dots", { screen: "dot", angle: 45, lpi: 50, dotShape: "diamond" }),
  screen("Lines · 45°", { screen: "line", angle: 45, lpi: 50, dotShape: "round" }),
  screen("Lines · 0°", { screen: "line", angle: 0, lpi: 50, dotShape: "round" }),
  screen("Cross", { screen: "cross", angle: 45, lpi: 50, dotShape: "round" }),
  screen("Coarse round dots", { screen: "dot", angle: 45, lpi: 30, dotShape: "round" }),
];
