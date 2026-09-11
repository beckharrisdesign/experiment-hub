"use client";

import { useMemo } from "react";
import type { StitchPlan } from "@/lib/svg-to-stitch/plan";

interface Segment {
  color: string;
  jump: boolean;
  points: string; // SVG polyline points attribute
}

interface StitchPreviewProps {
  plan: StitchPlan;
}

/**
 * Renders the stitch plan as the needle would sew it: one polyline per run,
 * dashed gray lines for jumps. Machine coordinates are y-up, so y flips back
 * for screen display.
 */
export default function StitchPreview({ plan }: StitchPreviewProps) {
  const { segments, viewBox } = useMemo(() => {
    const segments: Segment[] = [];
    let colorIndex = 0;
    let run: Array<{ x: number; y: number }> = [];
    let position: { x: number; y: number } | null = null;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    const flushRun = () => {
      if (run.length > 1) {
        segments.push({
          color: plan.colors[colorIndex] ?? "#000000",
          jump: false,
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
        case "stitch":
          if (run.length === 0 && position) run.push(position);
          run.push(p);
          position = p;
          break;
        case "jump":
          flushRun();
          if (position) {
            segments.push({
              color: "",
              jump: true,
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
    const viewBox = `${minX - pad} ${minY - pad} ${maxX - minX + 2 * pad} ${
      maxY - minY + 2 * pad
    }`;
    return { segments, viewBox };
  }, [plan]);

  return (
    <svg
      viewBox={viewBox}
      style={{ width: "100%", height: "100%" }}
      role="img"
      aria-label="Stitch path preview"
      preserveAspectRatio="xMidYMid meet"
    >
      {segments.map((segment, i) =>
        segment.jump ? (
          <polyline
            key={i}
            points={segment.points}
            fill="none"
            stroke="var(--muted-foreground)"
            strokeWidth={3}
            strokeDasharray="8 8"
            vectorEffect="non-scaling-stroke"
            strokeOpacity={0.6}
          />
        ) : (
          <polyline
            key={i}
            points={segment.points}
            fill="none"
            stroke={segment.color}
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ),
      )}
    </svg>
  );
}
