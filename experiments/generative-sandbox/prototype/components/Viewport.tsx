'use client';

import { useCallback, useRef, useState } from 'react';
import { Badge, Button } from '@beckharrisdesign/mvds';

/** Pan/zoom viewport, carried over from image-lab's zoom-viewport. 100% = fit width. */
export function Viewport({ src, alt }: { src: string | null; alt: string }) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragging = useRef<{ x: number; y: number } | null>(null);

  const reset = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div
        className="relative min-h-0 flex-1 overflow-hidden rounded-lg border border-border bg-muted/40"
        onPointerDown={(e) => {
          dragging.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!dragging.current) return;
          setOffset({ x: e.clientX - dragging.current.x, y: e.clientY - dragging.current.y });
        }}
        onPointerUp={(e) => {
          dragging.current = null;
          e.currentTarget.releasePointerCapture(e.pointerId);
        }}
        onWheel={(e) => {
          if (!e.ctrlKey && !e.metaKey) return;
          e.preventDefault();
          setScale((s) => Math.min(8, Math.max(0.25, s * (e.deltaY < 0 ? 1.1 : 0.9))));
        }}
      >
        {src ? (
          <img
            src={src}
            alt={alt}
            draggable={false}
            className="absolute left-0 top-0 w-full origin-top-left select-none"
            style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}
          />
        ) : (
          <p className="flex h-full items-center justify-center text-xs text-muted-foreground">
            Add a photo to start
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground">drag to pan · ⌘/ctrl-scroll to zoom</span>
        <span className="ml-auto" />
        <Button variant="outline" size="sm" onClick={() => setScale((s) => Math.max(0.25, s * 0.9))}>
          −
        </Button>
        <Badge variant="outline">{Math.round(scale * 100)}%</Badge>
        <Button variant="outline" size="sm" onClick={() => setScale((s) => Math.min(8, s * 1.1))}>
          +
        </Button>
        <Button variant="ghost" size="sm" onClick={reset}>
          Reset
        </Button>
      </div>
    </div>
  );
}
