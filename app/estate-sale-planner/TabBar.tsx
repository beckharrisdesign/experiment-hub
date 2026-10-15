"use client";

import Link from "next/link";
import { Button } from "@beckharrisdesign/mvds";
import { cameraTarget, paths, type Tab } from "../../lib/estate-sale-planner/routes";

interface TabBarProps {
  active: Tab | null;
  /** The sale the Items / Sort / Progress tabs point at; absent → those tabs are disabled. */
  saleId?: string;
  /** Items still to sort in that sale, for the Sort label. */
  left: number;
}

function CameraGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

/**
 * The tab bar on every screen but the camera flows (round 05a): Home · Items ·
 * [camera] · Sort · Progress. The camera is the one thing you do most, so it
 * sits in the middle and goes to "add a room" for the sale in context or to a
 * new sale when there is none. Fixed on MVDS's `z-float` utility (not `Layer`,
 * which is a full-viewport overlay that swallows taps); the shell pads for it.
 * MVDS has no tab bar yet (hand-off #39); this is a composition on its tokens.
 */
export default function TabBar({ active, saleId, left }: TabBarProps) {
  const tab = (id: Tab, label: string, href: string | null) => {
    const lit = active === id;
    if (!href) {
      return (
        <Button key={id} variant="ghost" size="sm" disabled aria-disabled>
          {label}
        </Button>
      );
    }
    return (
      <Button key={id} variant={lit ? "default" : "ghost"} size="sm" asChild>
        <Link href={href} aria-current={lit ? "page" : undefined}>
          {label}
        </Link>
      </Button>
    );
  };
  const sortLabel = saleId ? (left > 0 ? `Sort · ${left}` : "Sorted") : "Sort";

  return (
    <div className="fixed inset-x-0 bottom-0 z-float border-t border-border bg-background/95 backdrop-blur print:hidden">
      <nav aria-label="Estate Sale Planner" className="mx-auto flex max-w-md items-center justify-around gap-1 px-2 py-2">
        {tab("home", "Home", paths.home())}
        {tab("items", "Items", saleId ? paths.sale(saleId) : null)}
        <Button size="icon-lg" className="rounded-full shadow-lg" asChild>
          <Link href={cameraTarget(saleId)} aria-label={saleId ? "Photograph another room" : "Start a sale"} data-analytics-event="esp_capture_open">
            <CameraGlyph />
          </Link>
        </Button>
        {tab("sort", sortLabel, saleId ? paths.sort(saleId) : null)}
        {tab("progress", "Progress", saleId ? paths.progress(saleId) : null)}
      </nav>
    </div>
  );
}
