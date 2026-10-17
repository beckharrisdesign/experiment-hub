"use client";

import Link from "next/link";
import { Button, Container } from "@beckharrisdesign/mvds";
import type { Chrome } from "../../lib/estate-sale-planner/routes";

/**
 * The sticky top bar on every screen (round 05a): the sale's name as an
 * eyebrow, where you are as the title, Back when there is somewhere to go.
 * The page body keeps its own h1 — this names the place, not the content.
 * MVDS has no app bar yet (hand-off); this is a composition on its tokens.
 */
export default function TopBar({ chrome }: { chrome: Chrome }) {
  return (
    <header className="sticky top-0 z-float border-b border-border bg-background/95 backdrop-blur print:hidden">
      <Container size="md">
        <div className="flex min-h-14 items-center gap-2 py-2">
          {chrome.back ? (
            <Button variant="ghost" size="sm" asChild>
              <Link href={chrome.back} aria-label="Back">
                ← Back
              </Link>
            </Button>
          ) : (
            <span className="w-2" aria-hidden />
          )}
          <div className="min-w-0 flex-1">
            {chrome.eyebrow && <p className="truncate text-caption uppercase tracking-wider text-muted-foreground">{chrome.eyebrow}</p>}
            <p className="truncate text-h4 text-foreground" aria-live="polite">
              {chrome.title}
            </p>
          </div>
        </div>
      </Container>
    </header>
  );
}
