"use client";

import { useState } from "react";
import { cn } from "@beckharrisdesign/mvds";
import type { Box } from "../../lib/estate-sale-planner/flag";

export type BoxState = "selected" | "faint" | "editing" | "picked";

export interface EditorBox {
  id: string;
  label: string;
  box: Box;
  state: BoxState;
}

interface BoxEditorProps {
  src: string;
  alt: string;
  boxes: EditorBox[];
  /** Tap a box (view and select modes). */
  onTap?: (id: string) => void;
  /** The box being edited moved or resized (adjust mode); normalized 0–1. */
  onEdit?: (id: string, box: Box) => void;
  /** Drawing on empty photo makes a new box (split and add modes). */
  onDraw?: (box: Box) => void;
}

const MIN = 0.03;
const clamp = (n: number) => Math.min(1, Math.max(0, n));
type Corner = "nw" | "ne" | "sw" | "se";
type Drag = { kind: "move"; id: string; start: { x: number; y: number }; orig: Box } | { kind: "resize"; id: string; corner: Corner; orig: Box } | { kind: "draw"; start: { x: number; y: number } };

export function normalizeBox(a: { x: number; y: number }, b: { x: number; y: number }): Box {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) };
}

function resize(orig: Box, corner: Corner, p: { x: number; y: number }): Box {
  const right = orig.x + orig.w;
  const bottom = orig.y + orig.h;
  const x1 = corner === "nw" || corner === "sw" ? Math.min(p.x, right - MIN) : orig.x;
  const y1 = corner === "nw" || corner === "ne" ? Math.min(p.y, bottom - MIN) : orig.y;
  const x2 = corner === "ne" || corner === "se" ? Math.max(p.x, orig.x + MIN) : right;
  const y2 = corner === "sw" || corner === "se" ? Math.max(p.y, orig.y + MIN) : bottom;
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

/**
 * The source photo with the boxes the model drew (sold-comps design D3 and the MVDS hand-off:
 * an overlay on MVDS tokens with pointer events, not a library component — a `BoxEditor`
 * candidate for MVDS). Coordinates are normalized to the photo, so the same box lands on the
 * 768 px frame the model saw and the 1600 px original shown here.
 *
 * Selected uses --primary; other items from the photo are faint and dashed with their names;
 * corner handles have a 44 px hit area around an 8 px dot.
 */
export default function BoxEditor({ src, alt, boxes, onTap, onEdit, onDraw }: BoxEditorProps) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const [draft, setDraft] = useState<Box | null>(null);

  // The editor element, found from the event so handlers never read a ref during render.
  const surface = (e: React.PointerEvent) => (e.currentTarget as HTMLElement).closest<HTMLElement>("[data-box-editor]")!;
  const point = (e: React.PointerEvent) => {
    const r = surface(e).getBoundingClientRect();
    return { x: clamp((e.clientX - r.left) / r.width), y: clamp((e.clientY - r.top) / r.height) };
  };

  const start = (e: React.PointerEvent, d: Drag) => {
    e.stopPropagation();
    surface(e).setPointerCapture(e.pointerId);
    setDrag(d);
  };

  const move = (e: React.PointerEvent) => {
    if (!drag) return;
    const p = point(e);
    if (drag.kind === "draw") setDraft(normalizeBox(drag.start, p));
    else if (drag.kind === "move") {
      const { orig } = drag;
      const x = Math.min(1 - orig.w, Math.max(0, orig.x + p.x - drag.start.x));
      const y = Math.min(1 - orig.h, Math.max(0, orig.y + p.y - drag.start.y));
      onEdit?.(drag.id, { ...orig, x, y });
    } else onEdit?.(drag.id, resize(drag.orig, drag.corner, p));
  };

  const end = () => {
    if (drag?.kind === "draw" && draft && draft.w >= MIN && draft.h >= MIN) onDraw?.(draft);
    setDrag(null);
    setDraft(null);
  };

  return (
    <div
      data-box-editor
      className={cn("relative w-full touch-none select-none overflow-visible rounded-lg", onDraw && "cursor-crosshair")}
      onPointerDown={(e) => onDraw && start(e, { kind: "draw", start: point(e) })}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} draggable={false} className="block w-full rounded-lg" />
      {[...boxes, ...(draft ? [{ id: "__draft", label: "", box: draft, state: "editing" as const }] : [])].map((b) => {
        const style = { left: `${b.box.x * 100}%`, top: `${b.box.y * 100}%`, width: `${b.box.w * 100}%`, height: `${b.box.h * 100}%` };
        const editing = b.state === "editing" && b.id !== "__draft" && onEdit;
        return (
          <div
            key={b.id}
            style={style}
            role={onTap ? "button" : undefined}
            tabIndex={onTap ? 0 : undefined}
            aria-label={onTap ? `${b.label}${b.state === "picked" ? ", selected" : ""}` : undefined}
            aria-pressed={onTap && b.state === "picked" ? true : undefined}
            onClick={onTap ? (e) => (e.stopPropagation(), onTap(b.id)) : undefined}
            onKeyDown={onTap ? (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onTap(b.id)) : undefined}
            onPointerDown={editing ? (e) => start(e, { kind: "move", id: b.id, start: point(e), orig: b.box }) : undefined}
            className={cn(
              "absolute rounded",
              b.state === "faint" && "border border-dashed border-muted-foreground/60",
              (b.state === "selected" || b.state === "editing") && "border-2 border-primary",
              b.state === "picked" && "border-2 border-primary bg-primary/20",
              onTap && "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              editing && "cursor-move",
            )}
          >
            {b.label && (
              <span className={cn("absolute left-1 top-1 rounded px-1 text-caption", b.state === "faint" ? "bg-background/80 text-muted-foreground" : "bg-primary text-primary-foreground")}>
                {b.label}
              </span>
            )}
            {editing &&
              (["nw", "ne", "sw", "se"] as const).map((c) => (
                <span
                  key={c}
                  aria-hidden
                  onPointerDown={(e) => start(e, { kind: "resize", id: b.id, corner: c, orig: b.box })}
                  className={cn(
                    "absolute flex size-11 items-center justify-center",
                    c === "nw" && "-left-[22px] -top-[22px] cursor-nwse-resize",
                    c === "ne" && "-right-[22px] -top-[22px] cursor-nesw-resize",
                    c === "sw" && "-bottom-[22px] -left-[22px] cursor-nesw-resize",
                    c === "se" && "-bottom-[22px] -right-[22px] cursor-nwse-resize",
                  )}
                >
                  <span className="size-2 rounded-full border-2 border-background bg-primary" />
                </span>
              ))}
          </div>
        );
      })}
    </div>
  );
}
