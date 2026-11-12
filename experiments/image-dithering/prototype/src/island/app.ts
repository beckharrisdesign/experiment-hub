import { injectPhys } from "../engine/png-phys";
import type { Settings } from "../engine/pipeline";
import { lockAspect, mmToPx } from "../engine/size";
import type { Gray } from "../engine/types";
import { DITHER_EFFECTS, HALFTONE_EFFECTS, type Effect } from "../lib/effects";
import { exportSettings, materialById } from "../lib/presets";
import { sampleImage } from "../lib/sample";
import { searchFor, stateFromSearch } from "../lib/url";
import { variations } from "../lib/variations";
import { Engine } from "./engine-client";

type Step = 1 | 2 | 3 | 4;
const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector(sel) as T;
const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => [...root.querySelectorAll(sel)] as T[];

const engine = new Engine();
const fromUrl = stateFromSearch(location.search);
const MAX_SOURCE = 4000; // px on the long side; keeps memory sane for 12 MP+ photos

const state = {
  active: 2 as Step,
  reached: 2 as Step,
  srcW: 800,
  srcH: 600,
  sourceName: "Sample photo",
  effect: "dither" as "dither" | "halftone",
  pick: null as number | null,
  base: fromUrl.settings as Settings, // look + laser starting point (from ?material=)
  current: fromUrl.settings as Settings,
  round: 1,
  exportFor: fromUrl.exportFor,
  material: fromUrl.material,
  widthMm: 100,
  widthPx: 800,
};

const effects = (): Effect[] => (state.effect === "dither" ? DITHER_EFFECTS : HALFTONE_EFFECTS);

// ── Rendering ────────────────────────────────────────────────────────────────

/** The export size in pixels for the current choices. */
function exportSize(): { w: number; h: number; dpi: number } {
  const dpi = state.current.dpi;
  if (state.exportFor === "laser") {
    const { heightMm } = lockAspect(state.srcW, state.srcH, { widthMm: state.widthMm });
    return { w: mmToPx(state.widthMm, dpi), h: mmToPx(heightMm, dpi), dpi };
  }
  return { w: state.widthPx, h: Math.max(1, Math.round((state.widthPx * state.srcH) / state.srcW)), dpi };
}

/**
 * Settings for a preview of `w` px across. A halftone cell is dpi ÷ lpi px at export size, so
 * the preview scales dpi by the same factor to keep the screen looking the same.
 */
function previewSettings(s: Settings, w: number): Settings {
  if (s.mode !== "halftone") return s;
  const scale = w / exportSize().w;
  return { ...s, dpi: Math.max(s.halftone.lpi * 2, s.dpi * scale) };
}

let generation = 0; // bumps whenever the source or step content changes; stale paints are dropped

/** Render `s` into a canvas at its real pixel size × devicePixelRatio, fitted (contain) on white. */
async function paint(canvas: HTMLCanvasElement, s: Settings, gen: number): Promise<boolean> {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const box = canvas.getBoundingClientRect();
  const cw = Math.max(16, Math.round((box.width || 200) * dpr));
  const ch = Math.max(12, Math.round((box.height || cw * 0.75) * dpr));
  const fit = Math.min(cw / state.srcW, ch / state.srcH);
  const w = Math.max(1, Math.round(state.srcW * fit)), h = Math.max(1, Math.round(state.srcH * fit));
  const out = await engine.render(previewSettings(s, w), w, h);
  if (gen !== generation) return false;
  canvas.width = cw; canvas.height = ch;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cw, ch);
  ctx.putImageData(toImageData(out), Math.round((cw - w) / 2), Math.round((ch - h) / 2));
  return true;
}

function toImageData(g: Gray): ImageData {
  const img = new ImageData(g.width, g.height);
  for (let i = 0, p = 0; i < g.data.length; i++, p += 4) {
    const v = g.data[i]; img.data[p] = v; img.data[p + 1] = v; img.data[p + 2] = v; img.data[p + 3] = 255;
  }
  return img;
}

function tile(label: string, onPick: () => void): { el: HTMLButtonElement; canvas: HTMLCanvasElement } {
  const el = document.createElement("button");
  el.type = "button"; el.className = "tile"; el.dataset.tile = ""; el.setAttribute("aria-pressed", "false");
  const canvas = document.createElement("canvas"); canvas.setAttribute("aria-hidden", "true");
  const span = document.createElement("span"); span.textContent = label;
  el.append(canvas, span);
  el.addEventListener("click", onPick);
  return { el, canvas };
}

async function renderEffects() {
  const gen = ++generation;
  const grid = $("#effect-grid");
  grid.replaceChildren();
  const tiles = effects().map((fx, i) => {
    const t = tile(fx.label, () => pickEffect(i));
    t.el.setAttribute("aria-pressed", String(state.pick === i));
    grid.append(t.el);
    return { ...t, fx };
  });
  for (const t of tiles) if (await paint(t.canvas, t.fx.apply(state.base), gen)) t.el.dataset.rendered = "true";
}

async function renderFine() {
  const gen = ++generation;
  $("#fine-round").textContent = `Round ${state.round}`;
  const grid = $("#fine-grid");
  grid.replaceChildren();
  const opts = variations(state.current, state.round).map((v) => ({ ...tile(v.name, () => pickVariation(v.settings)), v }));
  for (const o of opts) grid.append(o.el);
  renderAdvanced();
  await paint($<HTMLCanvasElement>("#fine-current"), state.current, gen);
  for (const o of opts) if (await paint(o.canvas, o.v.settings, gen)) o.el.dataset.rendered = "true";
}

async function renderExport() {
  const gen = ++generation;
  syncExportControls();
  await paint($<HTMLCanvasElement>("#export-preview"), state.current, gen);
}

// ── Actions ──────────────────────────────────────────────────────────────────

function pickEffect(i: number) {
  state.pick = i;
  state.current = effects()[i].apply(state.base);
  state.round = 1;
  state.reached = 2;
  $$("#effect-grid .tile").forEach((el, j) => el.setAttribute("aria-pressed", String(j === i)));
  $<HTMLButtonElement>("#step-effect [data-next]").disabled = false;
  updateSteps();
}

function pickVariation(s: Settings) {
  state.current = s;
  state.round += 1;
  renderFine();
}

function goTo(step: Step) {
  if (step === 1) { $<HTMLInputElement>("#file").focus(); return; }
  state.active = step;
  state.reached = Math.max(state.reached, step) as Step;
  updateSteps();
  if (step === 2) renderEffects();
  if (step === 3) renderFine();
  if (step === 4) renderExport();
  const section = $(`[data-step="${step}"]`);
  section.scrollIntoView({ block: "start", behavior: "smooth" });
  ($(".step-head h2", section) as HTMLElement).setAttribute("tabindex", "-1");
  ($(".step-head h2", section) as HTMLElement).focus({ preventScroll: true });
}

function setExportFor(v: "screen" | "laser") {
  state.exportFor = v;
  if (v === "screen") state.material = null;
  syncUrl();
  renderExport();
}

function setMaterial(id: string) {
  const m = materialById(id);
  if (!m) return;
  state.material = id;
  state.current = { ...state.current, ...exportSettings(m) };
  syncUrl();
  renderExport();
}

function toggle(key: "invert" | "mirror") {
  state.current = { ...state.current, [key]: !state.current[key] };
  renderExport();
}

function syncUrl() {
  const q = searchFor({ material: state.exportFor === "laser" ? state.material : null }, location.search);
  history.replaceState(null, "", location.pathname + q + location.hash);
}

async function download() {
  const { w, h, dpi } = exportSize();
  const btn = $<HTMLButtonElement>("#download");
  btn.disabled = true; btn.textContent = "Preparing…";
  try {
    const out = await engine.render(state.current, w, h);
    const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h;
    canvas.getContext("2d")!.putImageData(toImageData(out), 0, 0);
    const blob = await new Promise<Blob>((r) => canvas.toBlob((b) => r(b!), "image/png"));
    const png = injectPhys(new Uint8Array(await blob.arrayBuffer()), dpi);
    const url = URL.createObjectURL(new Blob([png as Uint8Array<ArrayBuffer>], { type: "image/png" }));
    const a = document.createElement("a");
    const name = state.current.mode === "halftone" ? `halftone-${state.current.halftone.screen}` : `dither-${state.current.algorithm}`;
    a.href = url; a.download = `${name}-${w}x${h}.png`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  } finally {
    btn.disabled = false; btn.textContent = "Download PNG";
  }
}

// ── Source image ─────────────────────────────────────────────────────────────

async function setSource(rgba: Uint8ClampedArray, w: number, h: number, name: string) {
  state.srcW = w; state.srcH = h; state.sourceName = name;
  state.widthPx = Math.min(w, 2400);
  await engine.setSource(rgba, w, h);
  const thumb = $<HTMLCanvasElement>("#source-thumb");
  const tc = thumb.getContext("2d")!;
  const tmp = document.createElement("canvas"); tmp.width = w; tmp.height = h;
  tmp.getContext("2d")!.putImageData(new ImageData(rgba as Uint8ClampedArray<ArrayBuffer>, w, h), 0, 0);
  tc.fillStyle = "#fff"; tc.fillRect(0, 0, thumb.width, thumb.height);
  const f = Math.min(thumb.width / w, thumb.height / h);
  tc.drawImage(tmp, (thumb.width - w * f) / 2, (thumb.height - h * f) / 2, w * f, h * f);
  $("#source-name").textContent = name;
  // A new image invalidates every pick below it.
  state.pick = null; state.current = state.base; state.round = 1; state.reached = 2;
  $<HTMLButtonElement>("#step-effect [data-next]").disabled = true;
  state.active = 2;
  updateSteps();
  await renderEffects();
}

async function loadFile(file: File) {
  if (!file.type.startsWith("image/")) return;
  const bmp = await createImageBitmap(file);
  const f = Math.min(1, MAX_SOURCE / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * f), h = Math.round(bmp.height * f);
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const ctx = c.getContext("2d")!; ctx.drawImage(bmp, 0, 0, w, h);
  await setSource(ctx.getImageData(0, 0, w, h).data, w, h, file.name);
}

// ── Steps and controls ───────────────────────────────────────────────────────

function updateSteps() {
  for (const section of $$<HTMLElement>("[data-step]")) {
    const n = Number(section.dataset.step) as Step;
    if (n === 1) continue;
    section.dataset.state = n === state.active ? "active" : n < state.active ? "done" : "locked";
  }
  const fx = state.pick === null ? null : effects()[state.pick];
  $("#step-effect .summary-text").textContent = fx ? `${state.effect === "dither" ? "Dither" : "Halftone"} · ${fx.label}` : "";
  $("#step-fine .summary-text").textContent = `Round ${state.round}`;
  $("#effect-hint").textContent = state.effect === "dither"
    ? "Your image in all eight dither patterns. Pick the one you like."
    : "Your image as eight halftone screens. Pick the one you like.";
  $$("[data-effect]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.effect === state.effect)));
}

function syncExportControls() {
  $$("[data-for]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.for === state.exportFor)));
  $$<HTMLElement>("[data-when]").forEach((el) => { el.hidden = el.dataset.when !== state.exportFor; });
  $$("[data-material]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.material === state.material)));
  $$("[data-toggle]").forEach((b) => b.setAttribute("aria-checked", String(Boolean(state.current[b.dataset.toggle as "invert" | "mirror"]))));
  const { heightMm } = lockAspect(state.srcW, state.srcH, { widthMm: state.widthMm });
  $<HTMLInputElement>("#width-mm").value = String(state.widthMm);
  $<HTMLInputElement>("#height-mm").value = String(heightMm);
  $<HTMLSelectElement>("#dpi").value = String(state.current.dpi);
  $<HTMLInputElement>("#width-px").value = String(state.widthPx);
  const { w, h, dpi } = exportSize();
  $("#export-size").textContent = state.exportFor === "laser"
    ? `${w} × ${h} px at ${dpi} DPI, written into the file so your laser software places it at ${state.widthMm} × ${heightMm} mm.`
    : `${w} × ${h} px, black and white.`;
}

function renderAdvanced() {
  const s = state.current;
  const root = $("#advanced");
  const range = (id: string, label: string, min: number, max: number, step: number, value: number) =>
    `<div class="range"><label for="${id}">${label}</label><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}"><output for="${id}">${value}</output></div>`;
  const common = range("adv-brightness", "Brightness", -100, 100, 1, s.brightness) + range("adv-contrast", "Contrast", -100, 100, 1, s.contrast) + range("adv-gamma", "Gamma", 0.2, 3, 0.01, Number(s.gamma.toFixed(2)));
  const specific = s.mode === "halftone"
    ? range("adv-angle", "Screen angle (°)", 0, 90, 1, s.halftone.angle) + range("adv-lpi", "Frequency (LPI)", 10, 120, 1, s.halftone.lpi)
    : `<label class="check"><input id="adv-serpentine" type="checkbox" ${s.serpentine ? "checked" : ""}> Serpentine scan</label>`;
  root.innerHTML = common + specific;
  root.oninput = (e) => {
    const t = e.target as HTMLInputElement;
    const v = Number(t.value);
    const out = root.querySelector(`output[for="${t.id}"]`); if (out) out.textContent = t.value;
    const c = state.current;
    if (t.id === "adv-brightness") state.current = { ...c, brightness: v };
    if (t.id === "adv-contrast") state.current = { ...c, contrast: v };
    if (t.id === "adv-gamma") state.current = { ...c, gamma: v };
    if (t.id === "adv-angle") state.current = { ...c, halftone: { ...c.halftone, angle: v } };
    if (t.id === "adv-lpi") state.current = { ...c, halftone: { ...c.halftone, lpi: v } };
    if (t.id === "adv-serpentine") state.current = { ...c, serpentine: t.checked };
    scheduleFine();
  };
}

let fineTimer = 0;
function scheduleFine() {
  clearTimeout(fineTimer);
  fineTimer = window.setTimeout(async () => {
    const gen = ++generation;
    await paint($<HTMLCanvasElement>("#fine-current"), state.current, gen);
  }, 60);
}

function wire() {
  $<HTMLInputElement>("#file").addEventListener("change", (e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) loadFile(f); });
  const dz = $("#dropzone");
  dz.addEventListener("dragover", (e) => { e.preventDefault(); dz.classList.add("dragging"); });
  dz.addEventListener("dragleave", () => dz.classList.remove("dragging"));
  dz.addEventListener("drop", (e) => { e.preventDefault(); dz.classList.remove("dragging"); const f = e.dataTransfer?.files?.[0]; if (f) loadFile(f); });
  document.addEventListener("paste", (e) => { const f = [...(e.clipboardData?.files ?? [])].find((x) => x.type.startsWith("image/")); if (f) loadFile(f); });

  $$("[data-effect]").forEach((b) => b.addEventListener("click", () => {
    const next = b.dataset.effect as "dither" | "halftone";
    if (next === state.effect) return;
    state.effect = next; state.pick = null; state.current = state.base;
    $<HTMLButtonElement>("#step-effect [data-next]").disabled = true;
    updateSteps(); renderEffects();
  }));
  $$("[data-next]").forEach((b) => b.addEventListener("click", () => goTo(Number(b.dataset.next) as Step)));
  $$("[data-goto]").forEach((b) => b.addEventListener("click", () => goTo(Number(b.dataset.goto) as Step)));
  $$("[data-for]").forEach((b) => b.addEventListener("click", () => setExportFor(b.dataset.for as "screen" | "laser")));
  $$("[data-material]").forEach((b) => b.addEventListener("click", () => setMaterial(b.dataset.material!)));
  $$("[data-toggle]").forEach((b) => b.addEventListener("click", () => toggle(b.dataset.toggle as "invert" | "mirror")));
  $<HTMLInputElement>("#width-mm").addEventListener("change", (e) => { const v = Number((e.target as HTMLInputElement).value); if (v > 0) { state.widthMm = v; renderExport(); } });
  $<HTMLInputElement>("#width-px").addEventListener("change", (e) => { const v = Math.round(Number((e.target as HTMLInputElement).value)); if (v >= 16) { state.widthPx = v; renderExport(); } });
  $<HTMLSelectElement>("#dpi").addEventListener("change", (e) => { state.current = { ...state.current, dpi: Number((e.target as HTMLSelectElement).value) }; renderExport(); });
  $("#download").addEventListener("click", download);
}

wire();
updateSteps();
setSource(sampleImage(800, 600), 800, 600, "Sample photo");
