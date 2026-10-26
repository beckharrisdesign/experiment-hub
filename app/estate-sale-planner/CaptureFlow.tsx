"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Inline, Stack } from "@beckharrisdesign/mvds";
import { framesFromPhotos, type CapturedFrame, type CaptureProgress } from "../../lib/estate-sale-planner/capture";
import { paths } from "../../lib/estate-sale-planner/routes";
import type { Session } from "../../lib/estate-sale-planner/session";
import Capture from "./Capture";
import PhotoGrid from "./PhotoGrid";
import { useSaleStore } from "./(app)/store";

interface CaptureFlowProps {
  /** Present → add a room to this sale; absent → start a new one. */
  sale?: Session;
}

/**
 * Camera → confirm grid → vision pass → the sale's Items. Full-screen (the
 * shell hides the tabs here); Cancel goes back to where you were. On success
 * the router lands on the sale and the shell's notice says what was added.
 */
export default function CaptureFlow({ sale }: CaptureFlowProps) {
  const router = useRouter();
  const store = useSaleStore();
  const [photos, setPhotos] = useState<CapturedFrame[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<CaptureProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const append = Boolean(sale);

  const onFiles = useCallback(async (files: File[]) => {
    setError(null);
    setBusy(true);
    setProgress(null);
    try {
      const captured = await framesFromPhotos(files, setProgress);
      if (captured.length === 0) throw new Error("No photos came out of that. Try taking a few.");
      setPhotos(captured);
    } catch (e: any) {
      setError(e.message ?? "Something went wrong reading those photos.");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }, []);

  const onSend = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const outcome = await store.flag(photos, { append, name });
      store.setNotice(
        append
          ? outcome.added === 0
            ? "Nothing new in those photos. Everything the model saw is already listed."
            : `Added ${outcome.added} ${outcome.added === 1 ? "item" : "items"} from that room.`
          : null,
      );
      setPhotos([]);
      router.replace(paths.sale(outcome.id));
    } catch (e: any) {
      setError(e.message ?? "The vision pass didn't come back.");
      setPhotos([]);
    } finally {
      setBusy(false);
    }
  }, [store, photos, append, name, router]);

  const cancelHref = sale ? paths.sale(sale.id) : paths.home();

  if (photos.length > 0) {
    return (
      <PhotoGrid
        photos={photos}
        sending={busy}
        onSend={onSend}
        onRemove={(id) => setPhotos((ps) => ps.filter((p) => p.id !== id))}
        onBack={() => setPhotos([])}
      />
    );
  }

  return (
    <Stack gap={24}>
      <Capture
        busy={busy}
        progress={progress}
        error={error}
        onFiles={onFiles}
        mode={append ? "append" : "new"}
        saleName={sale?.name}
        name={name}
        onName={append ? undefined : setName}
      />
      <Inline gap={8} justify="center">
        <Button variant="ghost" disabled={busy} onClick={() => router.push(cancelHref)}>
          Cancel
        </Button>
      </Inline>
    </Stack>
  );
}
