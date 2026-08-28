/**
 * Transform module DECLARATIONS — client-safe.
 *
 * This file must never import sharp. The stack UI needs labels, parameter
 * ranges, and defaults, and a client component importing the sharp-backed
 * implementations drags a native Node module into the browser bundle (the build
 * fails with `UnhandledSchemeError: node:events`). Implementations live in
 * modules.server.ts, imported only from the render path.
 *
 * Adding a module means touching both files: the declaration here, the sharp
 * implementation there. Composing modules needs no code at all — that split is
 * the point of the sandbox.
 */

export type ParamType = 'number';

export interface ParamDef {
  name: string;
  label: string;
  type: ParamType;
  min: number;
  max: number;
  step: number;
  default: number;
}

export interface ModuleDef {
  id: string;
  label: string;
  description: string;
  params: ParamDef[];
}

export const MODULES: ModuleDef[] = [
  {
    id: 'blur',
    label: 'Blur',
    description: 'Gaussian blur. Radius 0 passes the image through untouched.',
    params: [{ name: 'radius', label: 'Radius', type: 'number', min: 0, max: 100, step: 1, default: 12 }],
  },
  {
    id: 'colour-simplify',
    label: 'Colour simplify',
    description: 'Quantize to a limited palette. Fewer colours means flatter regions.',
    params: [{ name: 'colours', label: 'Colours', type: 'number', min: 2, max: 64, step: 1, default: 6 }],
  },
];

export const MODULE_BY_ID = new Map(MODULES.map((m) => [m.id, m]));

export function defaultParams(def: ModuleDef): Record<string, number> {
  return Object.fromEntries(def.params.map((p) => [p.name, p.default]));
}

/** Clamp to the declared range so a hand-edited stack cannot crash the renderer. */
export function coerceParams(
  def: ModuleDef,
  params: Record<string, number> | undefined,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of def.params) {
    const raw = params?.[p.name];
    const value = typeof raw === 'number' && Number.isFinite(raw) ? raw : p.default;
    out[p.name] = Math.min(p.max, Math.max(p.min, value));
  }
  return out;
}
