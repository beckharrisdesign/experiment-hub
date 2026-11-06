"use client";

import { useEffect, useState } from "react";

/** setTimeout's ceiling: anything longer fires at once. */
const MAX_TIMEOUT = 2 ** 31 - 1;

/**
 * The time, read once and again when `next` arrives, so a screen left open across a limit
 * re-renders as soon as it expires. No ticking in between: nothing else here reads the clock.
 */
export function useNowUntil(next: string | null): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!next) return;
    let timer: ReturnType<typeof setTimeout>;
    const arm = () => {
      const left = Date.parse(next) - Date.now();
      if (left > MAX_TIMEOUT) timer = setTimeout(arm, MAX_TIMEOUT);
      else timer = setTimeout(() => setNow(Date.now()), Math.max(left, 0));
    };
    arm();
    return () => clearTimeout(timer);
  }, [next]);
  return now;
}
