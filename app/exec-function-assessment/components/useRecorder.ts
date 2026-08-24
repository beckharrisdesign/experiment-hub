"use client";

import { useCallback, useEffect, useState } from "react";
import {
  captureAccessKey,
  saveSession,
  type SaveResult,
} from "@/lib/exec-function/client-store";
import { dayKeyFor } from "@/lib/exec-function/schedule";
import type { StoredSession } from "@/lib/exec-function/sessions";

/**
 * Writes a finished session to the log.
 *
 * The calendar day comes from the browser's own timezone rather than the
 * server's schedule setting: the day a session belongs to is the day the person
 * taking it was living in, and that is the device in their hand.
 */
export function useRecorder() {
  const [result, setResult] = useState<SaveResult | null>(null);
  const [saving, setSaving] = useState(false);

  // The daily link carries the access key; grab it before any save runs.
  useEffect(() => {
    captureAccessKey();
  }, []);

  const record = useCallback(
    async (session: Omit<StoredSession, "id" | "timestamp" | "dayKey">) => {
      setSaving(true);
      const now = new Date();
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const saved = await saveSession({
        ...session,
        timestamp: now.toISOString(),
        dayKey: dayKeyFor(now, timeZone),
      });
      setResult(saved);
      setSaving(false);
      return saved;
    },
    [],
  );

  return { record, result, saving };
}
