"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Button, Card, CardDescription, CardHeader, CardTitle, Inline, Stack } from "@beckharrisdesign/mvds";
import { paths } from "../../lib/estate-sale-planner/routes";
import { donateList, keepList, sellList, undecided, type Destination, type Session } from "../../lib/estate-sale-planner/session";

interface SwipeProps {
  session: Session;
  onDestination: (itemId: string, to: Destination) => void;
  onOpen: (itemId: string) => void;
  onUndo: () => void;
  /** Photos are still being read: an empty pile is "more on the way", not "all done". */
  reading?: boolean;
}

const SWIPE_THRESHOLD_PX = 80;

/**
 * Screen 4 — the fast path through the undecided pile, one item at a time.
 * Three real buttons (keyboard, screen readers): Donate, Keep, Sell. The card
 * also takes a horizontal drag — left is donate, right is keep — because
 * those are the two a thumb reaches for; Sell is the deliberate tap. Details
 * opens the item; Undo is always visible.
 */
export default function Swipe({ session, onDestination, onOpen, onUndo, reading = false }: SwipeProps) {
  const stack = undecided(session);
  const item = stack[0];
  const [dx, setDx] = useState(0);
  const startX = useRef<number | null>(null);

  if (!item && reading) return null;
  if (!item) {
    return (
      // Nothing to sort is not a dead end (founder, 2026-10-27: "at least show a CTA to upload
      // another image"). One CTA, so centered on its own line.
      <Stack gap={24} align="center">
        <Stack gap={8} align="center">
          <h1 className="text-h3 text-foreground">Everything has a place</h1>
          <p className="text-center text-body text-muted-foreground">Add more photos to find more, or use the lists to change any of them.</p>
        </Stack>
        <Button size="lg" asChild>
          <Link href={paths.capture(session.id)}>Add more photos</Link>
        </Button>
      </Stack>
    );
  }

  const onPointerDown = (e: React.PointerEvent) => {
    startX.current = e.clientX;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (startX.current === null) return;
    setDx(e.clientX - startX.current);
  };
  const onPointerUp = () => {
    if (startX.current === null) return;
    const moved = dx;
    startX.current = null;
    setDx(0);
    if (moved <= -SWIPE_THRESHOLD_PX) onDestination(item.id, "donate");
    else if (moved >= SWIPE_THRESHOLD_PX) onDestination(item.id, "keep");
  };

  // Card, buttons and Undo fit one phone screen without scrolling (phone test 2026-10-28): the
  // photo is capped to a share of the visible height and the gaps are tighter than elsewhere.
  return (
    <Stack gap={16} align="center">
      <Stack gap={4} align="center">
        <h1 className="text-h3 text-foreground">Sell, donate, or keep?</h1>
        <p className="text-caption uppercase text-muted-foreground">
          {stack.length} left · {sellList(session).length} sell · {donateList(session).length} donate · {keepList(session).length} keep
        </p>
      </Stack>

      <Card
        className="w-full max-w-sm touch-pan-y select-none shadow-lg ring-foreground/15"
        style={{ transform: `translateX(${dx}px) rotate(${dx / 30}deg)`, transition: dx ? "none" : "transform 150ms ease-out" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        aria-label={item.name}
      >
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image} alt={item.name} className="aspect-square max-h-[36dvh] w-full bg-muted object-contain" draggable={false} />
        ) : (
          <div className="aspect-[4/3] max-h-[36dvh] w-full bg-muted" aria-hidden />
        )}
        <CardHeader>
          <CardTitle className="text-h3">{item.name}</CardTitle>
          <CardDescription className="text-body">{item.reason}</CardDescription>
        </CardHeader>
      </Card>

      <Inline gap={16} justify="center">
        <Button variant="outline" size="lg" onClick={() => onDestination(item.id, "donate")}>
          Donate
        </Button>
        <Button size="lg" onClick={() => onDestination(item.id, "keep")}>
          Keep
        </Button>
        <Button variant="secondary" size="lg" onClick={() => onDestination(item.id, "sell")}>
          Sell
        </Button>
      </Inline>

      <Inline gap={16} justify="center">
        <Button variant="ghost" size="sm" onClick={() => onOpen(item.id)}>
          Details
        </Button>
        <Button variant="ghost" size="sm" disabled={session.history.length === 0} onClick={onUndo}>
          Undo
        </Button>
      </Inline>
    </Stack>
  );
}
