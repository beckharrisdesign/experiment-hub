import type { Settings } from "../engine/pipeline";
import type { Gray } from "../engine/types";

/** Promise wrapper around the engine worker. One worker; requests run in order. */
export class Engine {
  private worker = new Worker(new URL("../worker/engine.worker.ts", import.meta.url), { type: "module" });
  private next = 1;
  private pending = new Map<number, (v: any) => void>();
  constructor() {
    this.worker.onmessage = (e) => { const r = this.pending.get(e.data.id); this.pending.delete(e.data.id); r?.(e.data); };
  }
  private call(msg: object, transfer: Transferable[] = []): Promise<any> {
    const id = this.next++;
    return new Promise((resolve) => { this.pending.set(id, resolve); this.worker.postMessage({ ...msg, id }, transfer); });
  }
  setSource(rgba: Uint8ClampedArray, width: number, height: number): Promise<void> {
    const copy = rgba.slice();
    return this.call({ type: "source", rgba: copy.buffer, width, height }, [copy.buffer]);
  }
  async render(settings: Settings, width: number, height: number): Promise<Gray> {
    const r = await this.call({ type: "render", settings, width, height });
    return { width: r.width, height: r.height, data: r.data };
  }
}
