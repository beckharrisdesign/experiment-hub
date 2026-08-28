'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Badge, Button } from '@beckharrisdesign/mvds';
import { ModuleRow } from '@/components/ModuleRow';
import { Viewport } from '@/components/Viewport';
import { MODULES } from '@/lib/modules';
import { defaultStack, describe, move, newEntry, type StackEntry } from '@/lib/stack';
import { markOpened, record } from '@/lib/instrument';

export default function SandboxPage() {
  const [sourceRef, setSourceRef] = useState<string | null>(null);
  const [stack, setStack] = useState<StackEntry[]>(() => defaultStack());
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Bumping this is how a change asks for a render. Dragging a slider updates
  // the label continuously but only bumps on release — commit-on-release,
  // carried from image-lab.
  const [renderKey, setRenderKey] = useState(0);
  const inFlight = useRef<AbortController | null>(null);
  const lastUrl = useRef<string | null>(null);

  useEffect(() => markOpened(), []);

  const requestRender = useCallback(() => setRenderKey((k) => k + 1), []);

  async function upload(file: File) {
    setError(null);
    const body = new FormData();
    body.append('file', file);
    const res = await fetch('/api/source', { method: 'POST', body });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? 'upload failed');
      return;
    }
    setSourceRef(json.sourceRef);
    requestRender();
  }

  useEffect(() => {
    if (!sourceRef) return;

    // Latest parameters win: abort whatever is still running before starting.
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;
    setBusy(true);

    fetch('/api/render', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceRef, stack, preview: true }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error ?? 'render failed');
        return res.blob();
      })
      .then((blob) => {
        if (controller.signal.aborted) return;
        if (lastUrl.current) URL.revokeObjectURL(lastUrl.current);
        const url = URL.createObjectURL(blob);
        lastUrl.current = url;
        setResultUrl(url);
        setError(null);
        record('first-result');
      })
      .catch((e) => {
        if (e.name === 'AbortError') return;
        setError(e instanceof Error ? e.message : 'render failed');
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });

    return () => controller.abort();
    // `stack` is read at request time; renderKey is the deliberate trigger so a
    // slider drag does not fire a request per pixel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceRef, renderKey]);

  const toggle = (uid: string) => {
    setStack((s) => s.map((e) => (e.uid === uid ? { ...e, enabled: !e.enabled } : e)));
    record('toggle');
    requestRender();
  };

  const reorder = (from: number, to: number) => {
    setStack((s) => move(s, from, to));
    record('reorder');
    requestRender();
  };

  const setParam = (uid: string, name: string, value: number) => {
    setStack((s) => s.map((e) => (e.uid === uid ? { ...e, params: { ...e.params, [name]: value } } : e)));
  };

  const commitParam = () => {
    record('param');
    requestRender();
  };

  const addModule = (id: string) => {
    setStack((s) => [...s, newEntry(id)]);
    requestRender();
  };

  async function exportFull() {
    if (!sourceRef) return;
    const res = await fetch('/api/render', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceRef, stack, preview: false }),
    });
    if (!res.ok) return;
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sandbox-export.png';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto flex h-dvh max-w-[1024px] flex-col gap-5 p-6">
      <header className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">Generative Sandbox</h1>
        <span className="ml-auto" />
        <label className="cursor-pointer">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
            }}
          />
          <Button variant="secondary" size="sm" asChild>
            <span>{sourceRef ? 'Replace photo' : 'Add photo'}</span>
          </Button>
        </label>
        <Button size="sm" onClick={exportFull} disabled={!sourceRef}>
          Export PNG
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 gap-6">
        <section className="flex w-[360px] shrink-0 flex-col gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">Stack</h2>
            <Badge variant="muted">{stack.filter((e) => e.enabled).length} on</Badge>
            <span className="ml-auto" />
            {MODULES.map((m) => (
              <Button key={m.id} variant="outline" size="sm" onClick={() => addModule(m.id)}>
                + {m.label}
              </Button>
            ))}
          </div>

          <ul className="flex flex-col gap-2 overflow-y-auto">
            {stack.map((entry, index) => (
              <ModuleRow
                key={entry.uid}
                entry={entry}
                index={index}
                total={stack.length}
                onToggle={() => toggle(entry.uid)}
                onMove={(to) => reorder(index, to)}
                onParamChange={(name, value) => setParam(entry.uid, name, value)}
                onParamCommit={commitParam}
              />
            ))}
          </ul>

          <p className="text-[10px] text-muted-foreground">{describe(stack) || 'every module is off'}</p>
        </section>

        <section className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">Result</h2>
            {busy && <Badge variant="muted">rendering…</Badge>}
            {error && <Badge variant="destructive">{error}</Badge>}
            <span className="ml-auto" />
            <span className="text-[10px] text-muted-foreground">preview · 1600px proxy</span>
          </div>
          <Viewport src={resultUrl} alt="Rendered result" />
        </section>
      </div>
    </main>
  );
}
