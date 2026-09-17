"use client";

import {
  Button,
  CardDescription,
  Inline,
  Spacer,
  Stack,
} from "@beckharrisdesign/mvds";
import type { StitchPlan } from "@/lib/svg-to-stitch/plan";

// Sew-order glyphs for the built-in brush motifs, so each thread color's
// row can say what kind of stitching it carries at a glance.
const BRUSH_GLYPHS: Record<string, string> = {
  cross: "✕",
  tick: "╱",
  chain: "◯",
  dot: "●",
  bird: "∨",
  bean: "▬",
};

/**
 * Motif breakdown for one color block — "✕ 2 · ╱ 2 · ◯ 2". A single thread
 * can carry every brush in the library, so the string is built to wrap
 * cleanly: a non-breaking space binds each glyph to its run count, and each
 * separator stays on the line of the motif it follows.
 */
export function motifBreakdown(
  brushes: { name: string; runs: number }[],
): string {
  return brushes
    .map((b) => `${BRUSH_GLYPHS[b.name] ?? b.name} ${b.runs}`)
    .join(" · ");
}

interface SewOrderProps {
  plan: StitchPlan;
  /** Highlighted thread color (index into plan.colors), null for none. */
  selectedColor?: number | null;
  onSelectColor?: (index: number | null) => void;
}

/**
 * The sew-order list: one row per thread color, in the order the machine
 * sews them. Each row stacks — identity and stitch count on the first line,
 * the motif breakdown beneath. Laying the breakdown out beside the color
 * clipped it in the 300px panel as soon as a thread carried more than a
 * couple of brushes, and the stitch count, sitting last, was the first
 * thing lost.
 *
 * Heading for per-group angle/stitch/density controls here (see the
 * retire-umbrella-switches proposal). Two things to carry into that: the
 * row is a `<button>`, so those controls cannot simply be nested inside it
 * — the row has to become a container with its own select affordance; and
 * the panel is only 300px, of which the six-motif line already uses every
 * pixel, so a control tier needs its own line rather than a share of this
 * one.
 */
export default function SewOrder({
  plan,
  selectedColor = null,
  onSelectColor,
}: SewOrderProps) {
  return (
    <Stack gap={4}>
      {plan.colors.map((color, i) => {
        // Machine files carry no run kinds, so their rows stay plain.
        const cs = plan.colorStats?.[i];
        const motifs =
          cs && cs.brushes.length > 0 ? motifBreakdown(cs.brushes) : null;
        return (
          <Button
            key={`${color}-${i}`}
            variant="ghost"
            aria-pressed={selectedColor === i}
            onClick={() => onSelectColor?.(selectedColor === i ? null : i)}
            style={{
              flexDirection: "column",
              alignItems: "stretch",
              justifyContent: "center",
              gap: 2,
              width: "100%",
              // The button size preset is a fixed 32px; a row with a motif
              // line needs to grow past it while keeping the touch target.
              height: "auto",
              minHeight: 44,
              paddingTop: 4,
              paddingBottom: 4,
              boxShadow:
                selectedColor === i ? "0 0 0 2px var(--ring)" : undefined,
            }}
          >
            <Inline gap={8} align="center" wrap={false}>
              <CardDescription>{i + 1}.</CardDescription>
              <span
                aria-hidden
                style={{
                  display: "inline-block",
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  backgroundColor: color,
                  border: "1px solid var(--border)",
                  flexShrink: 0,
                }}
              />
              <CardDescription>{color}</CardDescription>
              <Spacer />
              {cs && (
                <CardDescription
                  data-testid={`sew-order-stitches-${i}`}
                  style={{ fontSize: 12, whiteSpace: "nowrap", flexShrink: 0 }}
                >
                  {cs.stitches.toLocaleString()} sts
                </CardDescription>
              )}
            </Inline>
            {motifs && (
              <CardDescription
                data-testid={`sew-order-motifs-${i}`}
                style={{
                  fontSize: 12,
                  textAlign: "left",
                  // The button preset sets whitespace-nowrap on the whole
                  // subtree — the motif line has to opt back out to wrap.
                  whiteSpace: "normal",
                }}
              >
                {motifs}
              </CardDescription>
            )}
          </Button>
        );
      })}
    </Stack>
  );
}
