"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Grid, GridItem, Inline, Stack } from "@beckharrisdesign/mvds";
import { framesFromPhotos, type CapturedFrame, type CaptureProgress } from "../../lib/estate-sale-planner/capture";
import { paths } from "../../lib/estate-sale-planner/routes";
import type { Session } from "../../lib/estate-sale-planner/session";
import Capture from "./Capture";
import PhotoGrid from "./PhotoGrid";
import { useSaleStore } from "./(app)/store";

interface CaptureFlowProps {
  /** Present → add photos to this sale; absent → start a new one. */
  sale?: Session;
}

/**
 * Camera → confirm grid → the sale's Sort screen, where the vision pass shows as it runs. The tab bar stays
 * (founder, 2026-10-27: sticky "on all views"); Cancel goes back to where you
 * were. On success the router lands on the sale and the shell's notice says
 * what was added.
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

  // Send and go: the pass runs in the background and the sale's Sort screen shows the photos
  // being read (founder, 2026-10-27: "Drop directly to the processing list and let us either
  // watch them get processed or move around to manage other things").
  const onSend = useCallback(() => {
    const id = store.startPass(photos, { append, name });
    store.setNotice(null);
    setPhotos([]);
    router.replace(paths.sort(id));
  }, [store, photos, append, name, router]);

  const cancelHref = sale ? paths.sale(sale.id) : paths.home();

  if (photos.length > 0) {
    return (
      <Column>
        <PhotoGrid
          photos={photos}
          saleName={sale ? sale.name || "Untitled sale" : name}
          sending={busy}
          onSend={onSend}
          onRemove={(id) => setPhotos((ps) => ps.filter((p) => p.id !== id))}
          onBack={() => setPhotos([])}
        />
      </Column>
    );
  }

  return (
    <Column>
      <Stack gap={32}>
        <Capture
          busy={busy}
          progress={progress}
          error={error}
          onFiles={onFiles}
          mode={append ? "append" : "new"}
          saleName={sale?.name}
          name={name}
          onName={append ? undefined : setName}
          onStartEmpty={append ? undefined : () => router.replace(paths.sale(store.createSale(name)))}
        />
        <Inline gap={8} justify="center">
          <Button variant="ghost" disabled={busy} onClick={() => router.push(cancelHref)}>
            Cancel
          </Button>
        </Inline>
      </Stack>
    </Column>
  );
}

/** The camera flow is a form, so on desktop it stays one centered column: 8 of 12, from column 3. */
function Column({ children }: { children: React.ReactNode }) {
  return (
    <Grid cols={{ base: 1, lg: 12 }}>
      <GridItem span={{ base: 1, lg: 8 }} start={{ lg: 3 }}>
        {children}
      </GridItem>
    </Grid>
  );
}
