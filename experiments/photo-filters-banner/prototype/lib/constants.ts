export const ACCEPTED_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AcceptedMime = (typeof ACCEPTED_MIMES)[number];

export const MAX_EDGE_PX = 4096;
export const EXPORT_FILENAME = "photo-studio-export.png";

export type FilterPreset = "normal" | "slate" | "mono-pop" | "high-contrast";

export const FILTER_PRESETS: {
  id: FilterPreset;
  label: string;
  hint: string;
}[] = [
  { id: "normal", label: "Normal", hint: "Source pixels unchanged" },
  { id: "slate", label: "Slate", hint: "Cool desaturated duotone" },
  { id: "mono-pop", label: "Mono pop", hint: "High-contrast monochrome" },
  { id: "high-contrast", label: "High contrast", hint: "Punchy tones" },
];

export type BannerOverlay = "header" | "footer";
