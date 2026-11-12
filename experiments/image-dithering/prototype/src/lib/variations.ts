import type { Settings } from "../engine/pipeline";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Four tone moves around the current settings. Round 1 moves gamma ×/÷1.25 and contrast ±25;
 * every later round halves the step, so repeated picks converge on what the person wants.
 */
export function variations(s: Settings, round: number): { name: string; settings: Settings }[] {
  const k = 2 ** (Math.max(1, round) - 1);
  const g = 1 + 0.25 / k;
  const c = 25 / k;
  return [
    { name: "Lighter", settings: { ...s, gamma: clamp(s.gamma * g, 0.2, 3) } },
    { name: "Darker", settings: { ...s, gamma: clamp(s.gamma / g, 0.2, 3) } },
    { name: "More contrast", settings: { ...s, contrast: clamp(s.contrast + c, -100, 100) } },
    { name: "Softer", settings: { ...s, contrast: clamp(s.contrast - c, -100, 100) } },
  ];
}
