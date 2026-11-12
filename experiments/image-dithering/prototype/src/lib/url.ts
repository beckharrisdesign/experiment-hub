import { DEFAULT_SETTINGS, type Settings } from "../engine/pipeline";
import { materialById } from "./presets";

export type UrlState = { exportFor: "screen" | "laser"; material: string | null; settings: Settings };

/** `?material=<id>` → a laser starting point; anything else (or nothing) → the defaults. */
export function stateFromSearch(search: string): UrlState {
  const id = new URLSearchParams(search).get("material");
  const m = materialById(id);
  if (!m) return { exportFor: "screen", material: null, settings: DEFAULT_SETTINGS };
  return { exportFor: "laser", material: m.id, settings: { ...DEFAULT_SETTINGS, ...m.settings } };
}

/** The query string for a material, keeping any other parameters already present. */
export function searchFor(s: { material: string | null }, current = ""): string {
  const p = new URLSearchParams(current);
  p.delete("material");
  if (s.material) p.set("material", s.material);
  const q = p.toString();
  return q ? `?${q}` : "";
}
