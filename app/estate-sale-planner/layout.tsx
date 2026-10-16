import type { Metadata } from "next";

/**
 * Route shell for Estate Sale Planner.
 *
 * `mvds-theme` (app/globals.css) restores MVDS's own palette for this subtree
 * — the product is plain base MVDS, like /svg-to-stitch, not the hub skin.
 * The hub pins `.dark` at the root, so this renders in MVDS dark mode.
 */
export const metadata: Metadata = {
  title: "Estate Sale Planner: what's worth keeping, before the junk truck comes",
  description:
    "Film a walkthrough of a parent's house. A vision model flags what might be worth something, you swipe keep or toss on the rest, and one tap calls the haul-away truck.",
};

interface EstateSalePlannerLayoutProps {
  children: React.ReactNode;
}

export default function EstateSalePlannerLayout({ children }: EstateSalePlannerLayoutProps) {
  return (
    <div className="mvds-theme min-h-screen bg-background text-foreground">
      {children}
    </div>
  );
}
