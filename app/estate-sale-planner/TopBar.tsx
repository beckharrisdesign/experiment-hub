"use client";

import Link from "next/link";
import { Button, Chrome, Container, Inline } from "@beckharrisdesign/mvds";
import type { Chrome as ChromeInfo } from "../../lib/estate-sale-planner/routes";

/**
 * The sticky top bar on every page: the sale's name as an eyebrow, where you
 * are as the title, Back when there is somewhere to go. The page body keeps its
 * own h1 — this names the place, not the content. MVDS Chrome (top) gives the
 * stickiness, z-layer and height token; the inner Container matches the page's.
 */
export default function TopBar({ chrome }: { chrome: ChromeInfo }) {
  return (
    <Chrome position="top" bg="background" className="border-b border-border print:hidden">
      <Container size="xl" className="h-full">
        <Inline gap={8} align="center" className="h-full">
          {chrome.back && (
            <Button variant="ghost" size="sm" asChild>
              <Link href={chrome.back} aria-label="Back">
                ← Back
              </Link>
            </Button>
          )}
          <div className="min-w-0 flex-1">
            {chrome.eyebrow && <p className="truncate text-caption uppercase text-muted-foreground">{chrome.eyebrow}</p>}
            <p className="truncate text-h4 text-foreground" aria-live="polite">
              {chrome.title}
            </p>
          </div>
        </Inline>
      </Container>
    </Chrome>
  );
}
