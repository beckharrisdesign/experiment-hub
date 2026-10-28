"use client";

import Link from "next/link";
import { Button, Chrome, Container, Inline } from "@beckharrisdesign/mvds";
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
 * The tab bar on every page (round 05a; camera flows included since
 * 2026-10-27): Home · Items · [camera] · Sort · Progress · Sell list (founder:
 * "make the Sell list a menu item for now at the bottom"). The camera is the one
 * thing you do most, so it sits in the middle and goes to "add a room" for the
 * sale in context or to a new sale when there is none. MVDS Chrome (bottom)
 * makes it sticky; the tabs stay in a `sm` container so they don't spread
 * across a desktop screen. Phone test 2026-10-28 ("the affordances on the buttons are way too
 * small"): tabs fill their slot at 44 px and the camera is 56 px. MVDS has no tab bar yet (hand-off #39).
 */
/** Each tab shares the row's width and is a full 44 px tall, so the whole slot is the target, not just the word. */
const TAB = "h-11 min-w-0 flex-1 px-1";

export default function TabBar({ active, saleId, left }: TabBarProps) {
  const tab = (id: Tab, label: React.ReactNode, href: string | null) => {
    const lit = active === id;
    if (!href) {
      return (
        <Button key={id} variant="ghost" size="sm" className={TAB} disabled aria-disabled>
          {label}
        </Button>
      );
    }
    return (
      <Button key={id} variant={lit ? "default" : "ghost"} size="sm" className={TAB} asChild>
        <Link href={href} aria-current={lit ? "page" : undefined}>
          {label}
        </Link>
      </Button>
    );
  };
  // Six tabs fit a 360px phone only without the count; it comes back from `sm` up.
  const sortLabel = saleId ? (
    left > 0 ? (
      <>
        Sort<span className="hidden sm:inline"> · {left}</span>
      </>
    ) : (
      "Sorted"
    )
  ) : (
    "Sort"
  );

  return (
    <Chrome position="bottom" bg="background" className="border-t border-border print:hidden" style={{ ["--chrome-bottom-height" as string]: "4.5rem" }}>
      <Container size="sm" className="h-full">
        <Inline gap={0} align="center" justify="around" className="h-full flex-nowrap" role="navigation" aria-label="Estate Sale Planner">
            {tab("home", "Home", paths.home())}
            {tab("items", "Items", saleId ? paths.sale(saleId) : null)}
            <Button size="icon-lg" className="mx-1 size-14 shrink-0 rounded-full shadow-lg [&_svg]:size-6" asChild>
              <Link href={cameraTarget(saleId)} aria-label={saleId ? "Photograph another room" : "Start a sale"} data-analytics-event="esp_capture_open">
                <CameraGlyph />
              </Link>
            </Button>
            {tab("sort", sortLabel, saleId ? paths.sort(saleId) : null)}
            {tab("progress", "Progress", saleId ? paths.progress(saleId) : null)}
            {tab("sell", "Sell list", saleId ? paths.summary() : null)}
        </Inline>
      </Container>
    </Chrome>
  );
}
