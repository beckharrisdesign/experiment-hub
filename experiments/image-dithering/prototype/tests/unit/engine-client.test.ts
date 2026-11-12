import { describe, expect, it } from "vitest";
import { Engine, type WorkerLike } from "../../src/island/engine-client";
import { DEFAULT_SETTINGS } from "../../src/engine/pipeline";

function fakeWorker() {
  const w: WorkerLike & { sent: any[] } = {
    sent: [],
    onmessage: null,
    onerror: null,
    postMessage(msg: any) { this.sent.push(msg); },
  };
  return w;
}

// Copilot review on PR #591: a worker failure left pending calls waiting forever.
describe("engine client", () => {
  it("rejects every pending call when the worker errors", async () => {
    const w = fakeWorker();
    const engine = new Engine(w);
    const a = engine.render(DEFAULT_SETTINGS, 10, 10);
    const b = engine.tile(DEFAULT_SETTINGS, 10, 10, 12, 12);
    w.onerror!({ message: "boom" } as ErrorEvent);
    await expect(a).rejects.toThrow(/boom/);
    await expect(b).rejects.toThrow(/boom/);
  });

  it("rejects a call the worker reports as failed", async () => {
    const w = fakeWorker();
    const engine = new Engine(w);
    const p = engine.render(DEFAULT_SETTINGS, 10, 10);
    w.onmessage!({ data: { id: w.sent[0].id, error: "no source" } } as MessageEvent);
    await expect(p).rejects.toThrow(/no source/);
  });
});
