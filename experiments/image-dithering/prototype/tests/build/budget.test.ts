import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";

const dist = new URL("../../dist", import.meta.url).pathname;
const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? files(p) : [p]; });
const gz = (p: string) => gzipSync(readFileSync(p), { level: 9 }).length;

describe("JS budget (ship gate)", () => {
  it("initial JS ≤ 60 KB gzipped, worker excluded (worker size reported)", () => {
    const html = readFileSync(join(dist, "index.html"), "utf8");
    const initial = [...html.matchAll(/<script[^>]*src="([^"]+\.js)"/g)].map((m) => m[1]);
    // Follow static imports one level deep from the entry scripts.
    const seen = new Set<string>();
    const queue = initial.map((u) => join(dist, u.replace(/^\/[^/]*?(?=_astro)/, "").replace(/^\//, "")));
    while (queue.length) {
      const f = queue.pop()!;
      if (seen.has(f)) continue;
      seen.add(f);
      const src = readFileSync(f, "utf8");
      for (const m of src.matchAll(/(?:import|from)\s*["']\.\/([^"']+\.js)["']/g)) queue.push(join(f, "..", m[1]));
    }
    const workers = files(dist).filter((f) => /worker[^/]*\.js$/.test(f));
    const initialGz = [...seen].filter((f) => !workers.includes(f)).reduce((n, f) => n + gz(f), 0);
    const workerGz = workers.reduce((n, f) => n + gz(f), 0);
    console.log(`initial JS: ${(initialGz / 1024).toFixed(1)} KB gz · worker: ${(workerGz / 1024).toFixed(1)} KB gz`);
    expect(initial.length).toBeGreaterThan(0);
    expect(workers.length).toBeGreaterThan(0);
    expect(initialGz).toBeLessThanOrEqual(60 * 1024);
  });
});
