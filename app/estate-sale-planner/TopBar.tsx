"use client";

import Link from "next/link";
import { Button, Chrome, Container } from "@beckharrisdesign/mvds";
import type { Chrome as ChromeInfo } from "../../lib/estate-sale-planner/routes";
import MenuPlaceholder from "./MenuPlaceholder";

/**
 * The sticky header on every page (esp-header-affordance, option A; founder, 2026-10-28: "I want
 * to increase the affordance of the header/breadcrumb a bit" … "A for now"). One row: a Back
 * button to the parent screen, the current page's name, and the menu. The parent is the last
 * crumb `chromeFor` already works out, so routes don't change; ancestors above it aren't shown.
 * Home has no Back button.
 *
 * Only the title gives way when space runs short: it truncates first, then the Back label inside
 * its button; Back and Menu keep their 44 px on touch (the `.esp-theme` floor, #564).
 *
 * `children` is an optional row under this one that stays sticky with it — the item screen puts
 * its destination toggle there (sold-comps D21). MVDS Chrome clips to `--chrome-top-height`, so
 * the header sets that token for its own contents (design D3).
 */
export default function TopBar({
  chrome,
  children,
}: {
  chrome: ChromeInfo;
  children?: React.ReactNode;
}) {
  const { crumbs, title } = chrome;
  const parent = crumbs[crumbs.length - 1];
  const height = children ? "7.75rem" : "3.75rem";
  return (
    <Chrome
      position="top"
      bg="background"
      className="border-b border-border print:hidden"
      style={{ ["--chrome-top-height" as string]: height }}
    >
      <Container size="xl" className="h-full">
        <nav aria-label="Page" className="flex h-[3.75rem] items-center gap-2">
          {parent && (
            <Button
              variant="secondary"
              className="min-w-0 max-w-[45%] shrink justify-start"
              asChild
            >
              <Link href={parent.href} aria-label={`Back to ${parent.label}`}>
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="m15 18-6-6 6-6" />
                </svg>
                <span className="truncate">{parent.label}</span>
              </Link>
            </Button>
          )}
          <span
            aria-current="page"
            aria-live="polite"
            className="min-w-0 flex-1 truncate text-body font-semibold text-foreground"
          >
            {title}
          </span>
          <MenuPlaceholder />
        </nav>
        {children && <div className="pb-2">{children}</div>}
      </Container>
    </Chrome>
  );
}
