"use client";

import { Callout } from "@beckharrisdesign/mvds";

/** Shown on a result whose presentation timing cannot be trusted. */
export default function TimingWarning({ interrupted }: { interrupted: boolean }) {
  if (!interrupted) return null;

  return (
    <Callout>
      <strong className="font-medium">Timing was not reliable.</strong> This tab
      was in the background during the session, and browsers slow down timers in
      hidden tabs. The stimuli were not shown at the protocol&rsquo;s rate, so
      treat this score as not comparable to your other sessions. It is saved with
      that flag on it.
    </Callout>
  );
}
