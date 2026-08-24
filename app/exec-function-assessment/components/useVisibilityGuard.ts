"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Watches for the tab going into the background while a timed task runs.
 *
 * Browsers throttle setTimeout in hidden tabs — typically to no better than one
 * second. Both timed tasks here depend on sub-second presentation (a 600 ms
 * Corsi flash, a 500 ms n-back stimulus), so a session taken with the tab
 * backgrounded was not administered at the protocol's timing and its score is
 * not comparable to the rest of the history.
 *
 * The tool cannot prevent that, so it records it: the flag goes into the
 * session and the result screen says so, rather than letting a mistimed session
 * sit in the trend looking like every other point.
 */
export function useVisibilityGuard(active: boolean) {
  const [interrupted, setInterrupted] = useState(false);
  const wasActive = useRef(active);

  // Reset when a new run starts, so one bad session does not taint the next.
  // Seeded from the current visibility rather than from false, which also
  // covers a run begun while the tab was already in the background.
  useEffect(() => {
    if (active && !wasActive.current) setInterrupted(document.hidden);
    wasActive.current = active;
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const onChange = () => {
      if (document.hidden) setInterrupted(true);
    };
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, [active]);

  const reset = useCallback(() => setInterrupted(false), []);

  return { interrupted, reset };
}
