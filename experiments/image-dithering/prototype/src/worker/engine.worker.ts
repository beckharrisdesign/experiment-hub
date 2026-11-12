/// <reference lib="webworker" />
import { processImage, toGray, type Settings } from "../engine/pipeline";
import type { Gray } from "../engine/types";
import { sampleImage } from "../lib/sample";

// The engine runs here so the page never blocks. The decoded source is cached as gray once,
// and every preview or export re-runs only the pipeline.
let source: Gray | null = null;

type Msg =
  | { type: "sample"; id: number; width: number; height: number; thumbW: number; thumbH: number }
  | { type: "source"; id: number; rgba: ArrayBuffer; width: number; height: number }
  | { type: "render"; id: number; settings: Settings; width: number; height: number };

self.onmessage = (e: MessageEvent<Msg>) => {
  const m = e.data;
  if (m.type === "sample") {
    // The sample is generated here, off the main thread, and only a small thumbnail goes back.
    const rgba = sampleImage(m.width, m.height);
    source = toGray(rgba, m.width, m.height);
    const thumb = new Uint8ClampedArray(m.thumbW * m.thumbH * 4);
    for (let y = 0; y < m.thumbH; y++) for (let x = 0; x < m.thumbW; x++) {
      const sx = Math.floor(((x + 0.5) * m.width) / m.thumbW), sy = Math.floor(((y + 0.5) * m.height) / m.thumbH);
      thumb.set(rgba.subarray((sy * m.width + sx) * 4, (sy * m.width + sx) * 4 + 4), (y * m.thumbW + x) * 4);
    }
    self.postMessage({ id: m.id, thumb }, [thumb.buffer]);
    return;
  }
  if (m.type === "source") {
    source = toGray(new Uint8ClampedArray(m.rgba), m.width, m.height);
    self.postMessage({ id: m.id, ok: true });
    return;
  }
  if (!source) { self.postMessage({ id: m.id, error: "no source" }); return; }
  const out = processImage(source, { ...m.settings, widthPx: m.width, heightPx: m.height });
  self.postMessage({ id: m.id, width: out.width, height: out.height, data: out.data }, [out.data.buffer]);
};
