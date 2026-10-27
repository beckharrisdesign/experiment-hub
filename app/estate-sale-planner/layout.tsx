import type { Metadata } from "next";
import AppShell from "./AppShell";

/**
 * Route shell for Estate Sale Planner.
 *
 * `mvds-theme` (app/globals.css) restores MVDS's own palette for this subtree
 * — base MVDS, not the hub skin — and `esp-theme` brands it (coral primary on
 * warm darks).
 * The hub pins `.dark` at the root, so this renders in MVDS dark mode. Every
 * page gets the app shell (sticky top bar and tab bar) — see AppShell.
 */
export const metadata: Metadata = {
  title: "Estate Sale Planner: what's worth keeping",
  description:
    "Photograph a parent's house. A vision model flags what might be worth something, you sort sell, donate, or keep, and one tap schedules the donation pickup.",
};

interface EstateSalePlannerLayoutProps {
  children: React.ReactNode;
}

export default function EstateSalePlannerLayout({ children }: EstateSalePlannerLayoutProps) {
  return (
    <div className="mvds-theme esp-theme min-h-screen bg-background text-foreground">
      <AppShell>{children}</AppShell>
    </div>
  );
}
