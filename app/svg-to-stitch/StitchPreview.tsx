"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@beckharrisdesign/mvds";
import type { StitchPlan } from "@/lib/svg-to-stitch/plan";

interface Segment {
  color: string;
  colorIndex: number; // index into plan.colors; -1 for jumps
  jump: boolean;
  underlay: boolean; // recessed rendering — sewn beneath the top stitching
  points: string; // SVG polyline points attribute
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface StitchPreviewProps {
  plan: StitchPlan;
  /** Highlighted thread color (index into plan.colors), null for none. */
  selectedColor?: number | null;
  onSelectColor?: (index: number | null) => void;
}

const MAX_ZOOM_IN = 64; // view width can shrink to base/64
const MAX_ZOOM_OUT = 4; // and grow to base*4
const DRAG_THRESHOLD_PX = 4; // under this, a pointer gesture counts as a click

// The viewer is touch-first on tablets at the machine, so overlay controls
// keep a 44×44px minimum hit area.
const ZOOM_BUTTON_STYLE: React.CSSProperties = {
  minWidth: 44,
  minHeight: 44,
};

function clampView(view: Box, base: Box): Box {
  const w = Math.min(
    Math.max(view.w, base.w / MAX_ZOOM_IN),
    base.w * MAX_ZOOM_OUT,
  );
  const scale = w / view.w;
  return { x: view.x, y: view.y, w, h: view.h * scale };
}

/** Zoom the view by `factor` keeping the SVG-space point (cx, cy) fixed. */
function zoomAt(
  view: Box,
  base: Box,
  factor: number,
  cx: number,
  cy: number,
): Box {
  const next = clampView(
    { ...view, w: view.w * factor, h: view.h * factor },
    base,
  );
  const applied = next.w / view.w;
  return {
    ...next,
    x: cx - (cx - view.x) * applied,
    y: cy - (cy - view.y) * applied,
  };
}

/**
 * Renders the stitch plan as the needle would sew it: one polyline per run,
 * dashed gray lines for jumps. Machine coordinates are y-up, so y flips back
 * for screen display. Scroll/pinch zooms, drag pans, clicking a colored run
 * highlights that thread color (click empty space to clear).
 */
export default function StitchPreview({
  plan,
  selectedColor = null,
  onSelectColor,
}: StitchPreviewProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const { segments, base } = useMemo(() => {
    const segments: Segment[] = [];
    let colorIndex = 0;
    let run: Array<{ x: number; y: number }> = [];
    let runUnderlay = false;
    let position: { x: number; y: number } | null = null;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    const flushRun = () => {
      if (run.length > 1) {
        segments.push({
          color: plan.colors[colorIndex] ?? "#000000",
          colorIndex,
          jump: false,
          underlay: runUnderlay,
          points: run.map((p) => `${p.x},${p.y}`).join(" "),
        });
      }
      run = [];
    };

    for (const entry of plan.entries) {
      const p = { x: entry.x, y: -entry.y }; // back to screen y-down
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
      switch (entry.kind) {
        case "stitch": {
          const underlay = entry.underlay ?? false;
          if (run.length > 0 && underlay !== runUnderlay) flushRun();
          if (run.length === 0 && position) run.push(position);
          runUnderlay = underlay;
          run.push(p);
          position = p;
          break;
        }
        case "jump":
          flushRun();
          if (position) {
            segments.push({
              color: "",
              colorIndex: -1,
              jump: true,
              underlay: false,
              points: `${position.x},${position.y} ${p.x},${p.y}`,
            });
          }
          position = p;
          break;
        case "color":
          flushRun();
          colorIndex++;
          break;
        case "end":
          flushRun();
          break;
      }
    }
    flushRun();

    const pad = Math.max(maxX - minX, maxY - minY) * 0.05 + 10;
    const base: Box = {
      x: minX - pad,
      y: minY - pad,
      w: maxX - minX + 2 * pad,
      h: maxY - minY + 2 * pad,
    };
    return { segments, base };
  }, [plan]);

  const [view, setView] = useState<Box>(base);
  const [dragging, setDragging] = useState(false);

  // A new plan means new geometry — refit the view to it.
  const baseKey = `${base.x} ${base.y} ${base.w} ${base.h}`;
  const [prevBaseKey, setPrevBaseKey] = useState(baseKey);
  if (baseKey !== prevBaseKey) {
    setPrevBaseKey(baseKey);
    setView(base);
  }

  // Gesture bookkeeping lives in refs: it changes on every pointer event and
  // must not re-render.
  const gesture = useRef({
    pointers: new Map<
      number,
      { x: number; y: number; downX: number; downY: number }
    >(),
    moved: false,
    pinchDist: 0,
  });

  /** Client px → SVG user units, honoring preserveAspectRatio. */
  const toSvgPoint = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg || typeof svg.getScreenCTM !== "function") return null;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const pt = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    return { x: pt.x, y: pt.y };
  };

  /** Client px distance → SVG units (uniform "meet" scale). */
  const unitsPerPixel = () => {
    const svg = svgRef.current;
    if (!svg) return 1;
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return 1;
    return 1 / Math.min(rect.width / view.w, rect.height / view.h);
  };

  // React registers wheel listeners as passive, so preventDefault (to stop
  // the page scrolling under the preview) needs a native non-passive one.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = Math.exp(e.deltaY * 0.002);
      setView((v) => {
        const at = toSvgPoint(e.clientX, e.clientY) ?? {
          x: v.x + v.w / 2,
          y: v.y + v.h / 2,
        };
        return zoomAt(v, base, factor, at.x, at.y);
      });
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseKey]);

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const g = gesture.current;
    g.pointers.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
      downX: e.clientX,
      downY: e.clientY,
    });
    if (g.pointers.size === 1) g.moved = false;
    if (g.pointers.size === 2) {
      const [a, b] = [...g.pointers.values()];
      g.pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
    }
    // Keeps the drag alive when the pointer leaves the svg; jsdom lacks it.
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const g = gesture.current;
    const prev = g.pointers.get(e.pointerId);
    if (!prev) return;
    const curr = { ...prev, x: e.clientX, y: e.clientY };
    g.pointers.set(e.pointerId, curr);
    // Click vs drag by total displacement from where this pointer went down,
    // so a slow drag of tiny moves still counts as a drag.
    if (
      Math.hypot(curr.x - curr.downX, curr.y - curr.downY) > DRAG_THRESHOLD_PX
    ) {
      g.moved = true;
    }

    if (g.pointers.size === 2) {
      // Pinch: zoom around the midpoint by the distance ratio.
      const [a, b] = [...g.pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (g.pinchDist > 0 && dist > 0) {
        const factor = g.pinchDist / dist;
        const mid = toSvgPoint((a.x + b.x) / 2, (a.y + b.y) / 2);
        setView((v) =>
          zoomAt(
            v,
            base,
            factor,
            mid?.x ?? v.x + v.w / 2,
            mid?.y ?? v.y + v.h / 2,
          ),
        );
      }
      g.pinchDist = dist;
      g.moved = true;
    } else if (g.pointers.size === 1) {
      const upp = unitsPerPixel();
      const dx = (curr.x - prev.x) * upp;
      const dy = (curr.y - prev.y) * upp;
      if (dx !== 0 || dy !== 0) {
        setView((v) => ({ ...v, x: v.x - dx, y: v.y - dy }));
      }
    }
  };

  // A canceled pointer (interrupted touch, palm rejection) is never a click:
  // clean up the gesture without running the selection path.
  const onPointerCancel = (e: React.PointerEvent<SVGSVGElement>) => {
    const g = gesture.current;
    g.pointers.delete(e.pointerId);
    if (g.pointers.size < 2) g.pinchDist = 0;
    if (g.pointers.size === 0) setDragging(false);
  };

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    const g = gesture.current;
    const wasOnly = g.pointers.size === 1;
    onPointerCancel(e);

    // Selection happens here, not in onClick: pointer capture retargets
    // click events to the svg, so a click handler on the polylines would
    // never fire in a real browser.
    if (!wasOnly || g.moved) return;
    let el: Element | null = null;
    try {
      el = document.elementFromPoint(e.clientX, e.clientY);
    } catch {
      // jsdom: no layout, fall through to the event target
    }
    el ??= e.target as Element;
    const hit = el?.closest?.("[data-color-index]");
    if (hit) {
      const index = Number(hit.getAttribute("data-color-index"));
      onSelectColor?.(selectedColor === index ? null : index);
    } else {
      onSelectColor?.(null);
    }
  };
  const zoomFromCenter = (factor: number) =>
    setView((v) => zoomAt(v, base, factor, v.x + v.w / 2, v.y + v.h / 2));

  const dimmed = (colorIndex: number) =>
    selectedColor !== null && selectedColor !== colorIndex;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <svg
        ref={svgRef}
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        style={{
          width: "100%",
          height: "100%",
          touchAction: "none",
          cursor: dragging ? "grabbing" : "grab",
          display: "block",
        }}
        role="img"
        aria-label="Stitch path preview"
        preserveAspectRatio="xMidYMid meet"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onDoubleClick={() => setView(base)}
      >
        {segments.map((segment, i) =>
          segment.jump ? (
            <polyline
              key={i}
              points={segment.points}
              fill="none"
              stroke="var(--muted-foreground)"
              strokeWidth={1.5}
              strokeDasharray="6 6"
              vectorEffect="non-scaling-stroke"
              strokeOpacity={selectedColor !== null ? 0.1 : 0.35}
              pointerEvents="none"
            />
          ) : (
            <g key={i}>
              {/* Screen-sized strokes: without non-scaling-stroke the
                  viewBox-unit widths balloon to hundreds of pixels at 64×
                  zoom and obscure the stitch path. Underlay draws recessed —
                  on fabric it sits beneath the top stitching. Selection
                  never changes stroke width: on dense fills and satin the
                  fattened strokes overlap into a solid blob and misstate
                  thread coverage — dimming the other colors is the whole
                  highlight. */}
              <polyline
                points={segment.points}
                fill="none"
                stroke={segment.color}
                strokeWidth={segment.underlay ? 1 : 2.5}
                vectorEffect="non-scaling-stroke"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity={
                  dimmed(segment.colorIndex)
                    ? 0.12
                    : segment.underlay
                      ? 0.35
                      : 1
                }
                pointerEvents="none"
              />
              {/* Invisible fat twin so thin runs are still clickable. */}
              <polyline
                points={segment.points}
                fill="none"
                stroke="transparent"
                strokeWidth={14}
                vectorEffect="non-scaling-stroke"
                strokeLinecap="round"
                strokeLinejoin="round"
                pointerEvents="stroke"
                data-color-index={segment.colorIndex}
                aria-label={`Highlight thread color ${segment.colorIndex + 1}`}
                style={{ cursor: "pointer" }}
              />
            </g>
          ),
        )}
      </svg>

      <div
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          display: "flex",
          gap: 4,
        }}
      >
        <Button
          variant="secondary"
          size="sm"
          aria-label="Zoom in"
          style={ZOOM_BUTTON_STYLE}
          onClick={() => zoomFromCenter(1 / 1.5)}
        >
          +
        </Button>
        <Button
          variant="secondary"
          size="sm"
          aria-label="Zoom out"
          style={ZOOM_BUTTON_STYLE}
          onClick={() => zoomFromCenter(1.5)}
        >
          −
        </Button>
        <Button
          variant="secondary"
          size="sm"
          aria-label="Fit design"
          style={ZOOM_BUTTON_STYLE}
          onClick={() => setView(base)}
        >
          Fit
        </Button>
      </div>

      <span
        style={{
          position: "absolute",
          bottom: 8,
          right: 8,
          fontSize: 11,
          color: "var(--muted-foreground)",
          pointerEvents: "none",
          textAlign: "right",
        }}
      >
        dashed = jump · click a color to highlight
        <br />
        scroll to zoom · drag to pan · double-click to fit
      </span>
    </div>
  );
}
