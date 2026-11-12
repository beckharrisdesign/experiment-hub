/// <reference lib="webworker" />
import { processImage, toGray, type Settings } from "../engine/pipeline";
import type { Gray } from "../engine/types";

// The engine runs here so the page never blocks. The decoded source is cached as gray once,
// and every preview or export re-runs only the pipeline.
let source: Gray | null = null;

type Msg =
  | { type: "source"; id: number; rgba: ArrayBuffer; width: number; height: number }
  | { type: "render"; id: number; settings: Settings; width: number; height: number };

self.onmessage = (e: MessageEvent<Msg>) => {
  const m = e.data;
  if (m.type === "source") {
    source = toGray(new Uint8ClampedArray(m.rgba), m.width, m.height);
    self.postMessage({ id: m.id, ok: true });
    return;
  }
  if (!source) { self.postMessage({ id: m.id, error: "no source" }); return; }
  const out = processImage(source, { ...m.settings, widthPx: m.width, heightPx: m.height });
  self.postMessage({ id: m.id, width: out.width, height: out.height, data: out.data }, [out.data.buffer]);
};
