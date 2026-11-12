import data from "../data/presets.json";
import type { Settings } from "../engine/pipeline";

export type Material = (typeof data.materials)[number] & { settings: Partial<Settings> };
export const MATERIALS = data.materials as Material[];
export const materialById = (id: string | null): Material | null => MATERIALS.find((m) => m.id === id) ?? null;

/** The fields a material sets when it is picked in Export: what the laser needs, not the look. */
export const EXPORT_KEYS = ["invert", "mirror", "dpi"] as const;
export const exportSettings = (m: Material): Partial<Settings> =>
  Object.fromEntries(EXPORT_KEYS.filter((k) => k in m.settings).map((k) => [k, m.settings[k]])) as Partial<Settings>;
