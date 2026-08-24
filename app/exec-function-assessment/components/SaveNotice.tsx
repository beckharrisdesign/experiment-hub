"use client";

import { Callout } from "@beckharrisdesign/mvds";
import type { SaveResult } from "@/lib/exec-function/client-store";

/**
 * Says where the result actually landed.
 *
 * A local-only save is reported plainly rather than shown as success: a result
 * sitting in one browser's storage is one cleared cache away from gone, and the
 * person needs to know that now, not when the history looks short later.
 */
export default function SaveNotice({ result }: { result: SaveResult | null }) {
  if (!result) return null;

  if (result.tier === "server") {
    return (
      <p className="text-sm text-muted-foreground">Saved to your history.</p>
    );
  }

  return (
    <Callout>
      <strong className="font-medium">Saved on this device only.</strong>{" "}
      {result.reason}. This result will not show up in your history on another
      device.
    </Callout>
  );
}
