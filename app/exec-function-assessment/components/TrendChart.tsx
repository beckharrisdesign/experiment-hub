"use client";

import { useId, useState } from "react";
import type { SeriesPoint } from "@/lib/exec-function/sessions";

/**
 * Score over time for one track.
 *
 * Plotted against the calendar, not against session number, so a week with no
 * sessions reads as a gap rather than being compressed away. Points are the
 * data; the line only connects them.
 *
 * One series per chart by construction, so there is no legend — the card title
 * names the measure, and a legend box for a single line is noise.
 */

const SERIES_COLOR = "#3987e5";

const VIEW_W = 480;
const VIEW_H = 168;
const PAD = { top: 14, right: 16, bottom: 26, left: 38 };
const PLOT_W = VIEW_W - PAD.left - PAD.right;
const PLOT_H = VIEW_H - PAD.top - PAD.bottom;

interface Scale {
  x: (dayKey: string) => number;
  y: (value: number) => number;
  rawMin: number;
  rawMax: number;
  firstDay: string;
  lastDay: string;
}

function dayNumber(dayKey: string): number {
  const [y, m, d] = dayKey.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

function shortDate(dayKey: string): string {
  const [, m, d] = dayKey.split("-").map(Number);
  return `${m}/${d}`;
}

export interface TrendChartProps {
  points: SeriesPoint[];
  /** Names the measure, so the chart needs no legend of its own. */
  valueLabel: string;
  direction: "higher is better" | "lower is better";
}

export default function TrendChart({ points, valueLabel, direction }: TrendChartProps) {
  const titleId = useId();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const scale = ((): Scale | null => {
    if (points.length === 0) return null;

    const days = points.map((p) => dayNumber(p.dayKey));
    const values = points.map((p) => p.value);

    const dayMin = Math.min(...days);
    const dayMax = Math.max(...days);
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);

    // A flat series would collapse to a zero-height plot; give it room so the
    // line sits mid-chart instead of on the axis.
    const span = rawMax - rawMin;
    const padValue = span === 0 ? Math.max(1, Math.abs(rawMax) * 0.1) : span * 0.15;
    const valueMin = rawMin - padValue;
    const valueMax = rawMax + padValue;

    return {
      x: (dayKey: string) =>
        dayMax === dayMin
          ? PAD.left + PLOT_W / 2
          : PAD.left + ((dayNumber(dayKey) - dayMin) / (dayMax - dayMin)) * PLOT_W,
      y: (value: number) =>
        PAD.top + PLOT_H - ((value - valueMin) / (valueMax - valueMin)) * PLOT_H,
      rawMin,
      rawMax,
      firstDay: points.reduce((a, b) => (a.dayKey <= b.dayKey ? a : b)).dayKey,
      lastDay: points.reduce((a, b) => (a.dayKey >= b.dayKey ? a : b)).dayKey,
    };
  })();

  if (!scale) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No sessions logged yet. Your first result will appear here.
      </p>
    );
  }

  const hovered = hoverIndex === null ? null : points[hoverIndex];
  const lastIndex = points.length - 1;
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${scale.x(p.dayKey)},${scale.y(p.value)}`)
    .join(" ");

  return (
    <div>
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        // Capped so a handful of points do not stretch into a 300px-tall
        // band of empty plot on a wide screen.
        className="h-auto w-full max-w-xl"
        role="img"
        aria-labelledby={titleId}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <title id={titleId}>
          {valueLabel} over time, {direction}. {points.length} session
          {points.length === 1 ? "" : "s"} from {scale.firstDay} to {scale.lastDay}.
        </title>

        {/* Axis frame — recessive, and only the lines that carry meaning. */}
        <line
          x1={PAD.left}
          y1={PAD.top + PLOT_H}
          x2={PAD.left + PLOT_W}
          y2={PAD.top + PLOT_H}
          className="stroke-border"
          strokeWidth={1}
        />
        <text x={PAD.left - 8} y={PAD.top + 4} textAnchor="end" className="fill-muted-foreground text-[10px]">
          {Math.round(scale.rawMax)}
        </text>
        <text
          x={PAD.left - 8}
          y={PAD.top + PLOT_H}
          textAnchor="end"
          className="fill-muted-foreground text-[10px]"
        >
          {Math.round(scale.rawMin)}
        </text>
        <text x={PAD.left} y={VIEW_H - 8} textAnchor="start" className="fill-muted-foreground text-[10px]">
          {shortDate(scale.firstDay)}
        </text>
        <text
          x={PAD.left + PLOT_W}
          y={VIEW_H - 8}
          textAnchor="end"
          className="fill-muted-foreground text-[10px]"
        >
          {shortDate(scale.lastDay)}
        </text>

        {hovered && (
          <line
            x1={scale.x(hovered.dayKey)}
            y1={PAD.top}
            x2={scale.x(hovered.dayKey)}
            y2={PAD.top + PLOT_H}
            className="stroke-border"
            strokeWidth={1}
            strokeDasharray="2 3"
          />
        )}

        {points.length > 1 && (
          <path d={path} fill="none" stroke={SERIES_COLOR} strokeWidth={2} strokeLinecap="round" />
        )}

        {points.map((p, i) => {
          const isLatest = i === lastIndex;
          const isHovered = hoverIndex === i;
          return (
            <g key={p.sessionId}>
              {/* 2px surface ring keeps overlapping marks separable. */}
              <circle
                cx={scale.x(p.dayKey)}
                cy={scale.y(p.value)}
                r={isLatest ? 6 : 4}
                fill={SERIES_COLOR}
                stroke="var(--card)"
                strokeWidth={2}
              />
              {isLatest && (
                <circle
                  cx={scale.x(p.dayKey)}
                  cy={scale.y(p.value)}
                  r={9}
                  fill="none"
                  stroke={SERIES_COLOR}
                  strokeWidth={1.5}
                  opacity={0.5}
                />
              )}
              {/* Hit target larger than the mark. */}
              <circle
                cx={scale.x(p.dayKey)}
                cy={scale.y(p.value)}
                r={16}
                fill="transparent"
                onMouseEnter={() => setHoverIndex(i)}
                onFocus={() => setHoverIndex(i)}
                tabIndex={0}
                role="button"
                aria-label={`${p.dayKey}: ${p.value}`}
              />
              {isHovered && (
                <circle
                  cx={scale.x(p.dayKey)}
                  cy={scale.y(p.value)}
                  r={isLatest ? 6 : 4}
                  fill="none"
                  stroke="var(--foreground)"
                  strokeWidth={1.5}
                />
              )}
            </g>
          );
        })}
      </svg>

      {/* Tooltip in text tokens — the mark beside it carries the identity. */}
      <p className="mt-1 min-h-5 text-xs text-muted-foreground">
        {hovered ? (
          <>
            <span
              aria-hidden="true"
              className="mr-2 inline-block h-2 w-2 rounded-full align-middle"
              style={{ background: SERIES_COLOR }}
            />
            {hovered.dayKey} · {valueLabel} {hovered.value}
          </>
        ) : (
          <>Latest point ringed. {direction}.</>
        )}
      </p>
    </div>
  );
}
