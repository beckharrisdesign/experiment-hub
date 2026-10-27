import { Inline } from "@beckharrisdesign/mvds";

/**
 * A group of buttons (founder, 2026-10-27; rules/design-guidelines.mdc → Button groups): the
 * same size, right-aligned, Spacing/space-8 between, primary last so it is always rightmost.
 * Wraps onto a second right-aligned line when narrow; never reorders. Groups only — a lone CTA
 * keeps the centered, own-line rule.
 */
export default function ButtonGroup({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <Inline gap={8} justify="end" align="center" wrap className={className}>
      {children}
    </Inline>
  );
}
