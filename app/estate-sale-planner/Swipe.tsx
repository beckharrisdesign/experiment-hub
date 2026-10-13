"use client";

import { useRef, useState } from "react";
import { Button, Card, CardContent, Inline, Stack } from "@beckharrisdesign/mvds";
import { keepList, tossList, undecided, type Session } from "../../lib/estate-sale-planner/session";

interface SwipeProps {
  session: Session;
  onDecide: (itemId: string, decision: "keep" | "toss") => void;
  onUndo: () => void;
}

const SWIPE_THRESHOLD_PX = 80;

/**
 * Screen 4 — one item at a time. Keep and Toss are real buttons (keyboard,
 * screen readers) and the card also takes a horizontal drag: left is toss,
 * right is keep. Undo sits under the card and is always visible.
 */
export default function Swipe({ session, onDecide, onUndo }: SwipeProps) {
  const stack = undecided(session);
  const item = stack[0];
  const [dx, setDx] = useState(0);
  const startX = useRef<number | null>(null);

  if (!item) return null;

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
    if (moved <= -SWIPE_THRESHOLD_PX) onDecide(item.id, "toss");
    else if (moved >= SWIPE_THRESHOLD_PX) onDecide(item.id, "keep");
  };

  return (
    <Stack gap={24} align="center">
      <Stack gap={4} align="center">
        <h1 className="text-2xl font-semibold text-foreground">Keep or toss?</h1>
        <p className="text-sm text-muted-foreground">
          {stack.length} left · {keepList(session).length} keep · {tossList(session).length} toss
        </p>
      </Stack>

      <Card
        className="w-full max-w-sm touch-pan-y select-none"
        style={{ transform: `translateX(${dx}px) rotate(${dx / 30}deg)`, transition: dx ? "none" : "transform 150ms ease-out" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        aria-label={`${item.name}, ${item.room}`}
      >
        <CardContent>
          <Stack gap={8}>
            <p className="text-xl font-medium text-foreground">{item.name}</p>
            <p className="text-sm text-muted-foreground">{item.room}</p>
            <p className="text-sm text-muted-foreground">{item.reason}</p>
          </Stack>
        </CardContent>
      </Card>

      <Inline gap={16} justify="center">
        <Button variant="destructive" size="lg" onClick={() => onDecide(item.id, "toss")}>
          Toss
        </Button>
        <Button size="lg" onClick={() => onDecide(item.id, "keep")}>
          Keep
        </Button>
      </Inline>

      <Button variant="ghost" size="sm" disabled={session.decided.length === 0} onClick={onUndo}>
        Undo
      </Button>
    </Stack>
  );
}
