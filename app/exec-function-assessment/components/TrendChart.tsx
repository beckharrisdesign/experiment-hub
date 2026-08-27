"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { SeriesPoint } from "@/lib/exec-function/sessions";

/**
 * Score over time for one track.
 *
 * Plotted against elapsed time, not against session number, so a week with no
 * sessions reads as a gap rather than being compressed away. Points are the
 * data; the line only connects them.
 *
 * Positioned by the *instant* a session was recorded rather than by its
 * calendar day. Day buckets sent every session sharing a date to one x — two
 * runs in a morning drew as a vertical line, which looked like a rendering
 * fault and hid the fact that they were two separate events.
 *
 * The chart spans its container at a fixed height, and the viewBox is sized to
 * the measured width so one SVG unit is one CSS pixel. That keeps a 10px label
 * at 10px everywhere; a fixed viewBox scaled as a unit, so the same label
 * drifted between roughly 8.7px and 12px depending on the card.
 *
 * One series per chart by construction, so there is no legend — the card title
 * names the measure, and a legend box for a single line is noise.
 */

const SERIES_COLOR = "#3987e5";

/**
 * Height is fixed rather than derived from width. The chart used to carry a
 * `max-w-xl` cap for exactly this reason — a fixed aspect ratio deepened the
 * plot as it widened — but the cap paid for it by leaving unexplained empty
 * space beside the chart on a wide card. Pinning the height buys the same
 * protection and lets the plot use the room it is given.
 */
const CHART_H = 200;
/** First paint, before the container has been measured. */
const DEFAULT_W = 640;
const PAD = { top: 14, right: 16, bottom: 26, left: 38 };
const PLOT_H = CHART_H - PAD.top - PAD.bottom;

interface Scale {
  x: (timestamp: string) => number;
  y: (value: number) => number;
  rawMin: number;
  rawMax: number;
  firstDay: string;
  lastDay: string;
}

function shortDate(dayKey: string): string {
  const [, m, d] = dayKey.split("-").map(Number);
  return `${m}/${d}`;
}

/**
 * The rendered width of the chart's container.
 *
 * Server-rendered markup has no width to measure, so the first paint uses a
 * defined default and the observer corrects it on mount. Without the observer
 * the chart would keep whatever width it was born with and never respond to a
 * resize.
 */
function useContainerWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(DEFAULT_W);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const measured = entries[0]?.contentRect.width;
      if (measured && measured > 0) setWidth(Math.round(measured));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}

export interface TrendChartProps {
  points: SeriesPoint[];
  /** Names the measure, so the chart needs no legend of its own. */
  valueLabel: string;
  direction: "higher is better" | "lower is better";
}

/** The direction string is stored lowercase for mid-sentence use in the SVG title. */
function sentenceCase(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default function TrendChart({ points, valueLabel, direction }: TrendChartProps) {
  const titleId = useId();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const { ref: wrapRef, width } = useContainerWidth();
  const PLOT_W = Math.max(width - PAD.left - PAD.right, 1);

  const scale = ((): Scale | null => {
    if (points.length === 0) return null;

    const times = points.map((p) => Date.parse(p.timestamp));
    const values = points.map((p) => p.value);

    const timeMin = Math.min(...times);
    const timeMax = Math.max(...times);
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);

    // A flat series would collapse to a zero-height plot; give it room so the
    // line sits mid-chart instead of on the axis.
    const span = rawMax - rawMin;
    const padValue = span === 0 ? Math.max(1, Math.abs(rawMax) * 0.1) : span * 0.15;
    const valueMin = rawMin - padValue;
    const valueMax = rawMax + padValue;

    return {
      // A lone point has no span to scale against, so it sits mid-plot.
      x: (timestamp: string) =>
        timeMax === timeMin
          ? PAD.left + PLOT_W / 2
          : PAD.left + ((Date.parse(timestamp) - timeMin) / (timeMax - timeMin)) * PLOT_W,
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
    .map((p, i) => `${i === 0 ? "M" : "L"}${scale.x(p.timestamp)},${scale.y(p.value)}`)
    .join(" ");

  return (
    <div ref={wrapRef}>
      <svg
        viewBox={`0 0 ${width} ${CHART_H}`}
        width="100%"
        height={CHART_H}
        className="block"
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
        {scale.firstDay === scale.lastDay ? (
          // Printing the same date at both ends implies a range that is not there.
          <text
            x={PAD.left + PLOT_W / 2}
            y={CHART_H - 8}
            textAnchor="middle"
            className="fill-muted-foreground text-[10px]"
          >
            {shortDate(scale.firstDay)}
          </text>
        ) : (
          <>
            <text x={PAD.left} y={CHART_H - 8} textAnchor="start" className="fill-muted-foreground text-[10px]">
              {shortDate(scale.firstDay)}
            </text>
            <text
              x={PAD.left + PLOT_W}
              y={CHART_H - 8}
              textAnchor="end"
              className="fill-muted-foreground text-[10px]"
            >
              {shortDate(scale.lastDay)}
            </text>
          </>
        )}

        {hovered && (
          <line
            x1={scale.x(hovered.timestamp)}
            y1={PAD.top}
            x2={scale.x(hovered.timestamp)}
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
                cx={scale.x(p.timestamp)}
                cy={scale.y(p.value)}
                r={isLatest ? 6 : 4}
                fill={SERIES_COLOR}
                stroke="var(--card)"
                strokeWidth={2}
              />
              {isLatest && (
                <circle
                  cx={scale.x(p.timestamp)}
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
                cx={scale.x(p.timestamp)}
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
                  cx={scale.x(p.timestamp)}
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
          <>Latest point ringed. {sentenceCase(direction)}.</>
        )}
      </p>
    </div>
  );
}
