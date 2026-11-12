import type { Settings } from "../engine/pipeline";
import type { Gray } from "../engine/types";

/** The slice of Worker this client uses; lets tests pass a fake. */
export type WorkerLike = {
  postMessage(msg: unknown, transfer?: Transferable[]): void;
  onmessage: ((e: MessageEvent) => void) | null;
  onerror: ((e: ErrorEvent) => void) | null;
};

type Pending = { resolve: (v: any) => void; reject: (e: Error) => void };

/** Promise wrapper around the engine worker. One worker; requests run in order. */
export class Engine {
  private worker: WorkerLike;
  private next = 1;
  private pending = new Map<number, Pending>();

  constructor(worker?: WorkerLike) {
    this.worker = worker ?? (new Worker(new URL("../worker/engine.worker.ts", import.meta.url), { type: "module" }) as unknown as WorkerLike);
    this.worker.onmessage = (e) => {
      const p = this.pending.get(e.data.id);
      if (!p) return;
      this.pending.delete(e.data.id);
      if (e.data.error) p.reject(new Error(e.data.error));
      else p.resolve(e.data);
    };
    // A crashed worker must not leave callers waiting forever (Copilot review, PR #591).
    this.worker.onerror = (e) => {
      const err = new Error(`Image engine failed: ${e.message || "unknown error"}`);
      for (const p of this.pending.values()) p.reject(err);
      this.pending.clear();
    };
  }

  private call(msg: object, transfer: Transferable[] = []): Promise<any> {
    const id = this.next++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ ...msg, id }, transfer);
    });
  }

  async loadSample(width: number, height: number, thumbW: number, thumbH: number): Promise<Uint8ClampedArray> {
    return (await this.call({ type: "sample", width, height, thumbW, thumbH })).thumb;
  }
  setSource(rgba: Uint8ClampedArray, width: number, height: number): Promise<void> {
    const copy = rgba.slice();
    return this.call({ type: "source", rgba: copy.buffer, width, height }, [copy.buffer]);
  }
  async tile(settings: Settings, width: number, height: number, boxW: number, boxH: number): Promise<Uint8ClampedArray> {
    return (await this.call({ type: "tile", settings, width, height, boxW, boxH })).rgba;
  }
  async render(settings: Settings, width: number, height: number): Promise<Gray> {
    const r = await this.call({ type: "render", settings, width, height });
    return { width: r.width, height: r.height, data: r.data };
  }
}
