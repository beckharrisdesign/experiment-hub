"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Grid, GridItem, Stack } from "@beckharrisdesign/mvds";
import type { Box } from "../../lib/estate-sale-planner/flag";
import { photoUrl } from "../../lib/estate-sale-planner/crops";
import { paths } from "../../lib/estate-sale-planner/routes";
import type { Session, SessionItem } from "../../lib/estate-sale-planner/session";
import BoxEditor, { type EditorBox } from "./BoxEditor";
import ButtonGroup from "./ButtonGroup";
import { useSaleStore } from "./(app)/store";

type Mode = "view" | "adjust" | "split" | "add" | "select";
const WHOLE: Box = { x: 0, y: 0, w: 1, h: 1 };

const HINTS: Record<Mode, string> = {
  view: "This item is outlined. Faint boxes are other items from this photo; tap one to switch. Nothing around something you can see? Use Add.",
  adjust: "Drag the box or its corners until it fits the object. Saving re-reads the new crop.",
  split: "Draw one box around each object. Each becomes its own item, read on its own.",
  add: "Draw a box around what was missed. It's read and added to this sale, marked as added by you.",
  select: "Tap the items that go together. Merge them into one, or mark them as a lot that sells together.",
};

/**
 * The source photo (sold-comps spec: item-correction; Figma round 17 source-photo frames).
 * The whole original with this item outlined and the photo's other items faint. One mode at a
 * time — view, adjust, split, add, select — each with its own button group (D13). Every save
 * confirms what it produces and re-reads it in the background; the screen follows the item,
 * or goes to Items when the item no longer exists.
 */
export default function SourcePhoto({ session, item }: { session: Session; item: SessionItem }) {
  const store = useSaleStore();
  const router = useRouter();
  const [loaded, setLoaded] = useState<{ photoId: string; url: string | null } | null>(null);
  // null: no original on this device; undefined: still loading.
  const src = !item.photoId ? null : loaded?.photoId === item.photoId ? loaded.url : undefined;
  const [mode, setMode] = useState<Mode>("view");
  const [edit, setEdit] = useState<Box>(item.box ?? WHOLE);
  const [drawn, setDrawn] = useState<Box[]>([]);
  const [picked, setPicked] = useState<string[]>([item.id]);

  useEffect(() => {
    let url: string | null = null;
    let live = true;
    const photoId = item.photoId;
    if (!photoId) return;
    void photoUrl(photoId).then((u) => {
      url = u;
      if (live) setLoaded({ photoId, url: u });
      else if (u) URL.revokeObjectURL(u);
    });
    return () => {
      live = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [item.photoId]);

  const siblings = useMemo(() => session.items.filter((i) => i.photoId && i.photoId === item.photoId && i.id !== item.id && i.box), [session.items, item.photoId, item.id]);

  const reset = (next: Mode) => {
    setMode(next);
    setEdit(item.box ?? WHOLE);
    setDrawn([]);
    setPicked([item.id]);
  };

  const boxes: EditorBox[] = (() => {
    const others = siblings.map((s) => ({ id: s.id, label: s.name, box: s.box!, state: "faint" as const }));
    switch (mode) {
      case "view":
        return [...others, { id: item.id, label: item.name, box: item.box ?? WHOLE, state: "selected" }];
      case "adjust":
        return [...others, { id: item.id, label: item.name, box: edit, state: "editing" }];
      case "split":
        return [{ id: item.id, label: item.name, box: item.box ?? WHOLE, state: "faint" }, ...drawn.map((b, n) => ({ id: `d${n}`, label: String(n + 1), box: b, state: "selected" as const }))];
      case "add":
        return [...others, { id: item.id, label: item.name, box: item.box ?? WHOLE, state: "faint" }, ...drawn.map((b, n) => ({ id: `d${n}`, label: "New item", box: b, state: "selected" as const }))];
      case "select":
        return [...others, { id: item.id, label: item.name, box: item.box ?? WHOLE, state: "faint" as const }].map((b) => (picked.includes(b.id) ? { ...b, state: "picked" as const } : b));
    }
  })();

  const go = (ids: string[], fallback = paths.sale(session.id)) => router.replace(ids[0] ? paths.item(session.id, ids[0]) : fallback);

  if (src === null) {
    return (
      <Stack gap={16}>
        <h1 className="text-h2 text-foreground">Photo no longer on this device</h1>
        <p className="text-body text-muted-foreground">
          The original was cleared to make room, or this item was added by hand. You can still rename it, change its value, move it or remove it.
        </p>
        <div>
          <Button variant="secondary" asChild>
            <Link href={paths.item(session.id, item.id)}>Back to the item</Link>
          </Button>
        </div>
      </Stack>
    );
  }

  const photoNumber = item.photoId?.split("/").slice(-1)[0];
  const actions = (() => {
    switch (mode) {
      case "view":
        return (
          <ButtonGroup>
            <Button variant="secondary" onClick={() => reset("adjust")}>
              Adjust
            </Button>
            <Button variant="secondary" onClick={() => reset("split")}>
              Split
            </Button>
            <Button variant="secondary" onClick={() => reset("add")}>
              Add
            </Button>
            <Button variant="secondary" onClick={() => reset("select")}>
              Select
            </Button>
            {item.lot && (
              <Button variant="secondary" onClick={() => go(store.onSplitLot(item.id))}>
                Split lot
              </Button>
            )}
            <Button
              onClick={() => {
                store.onConfirm(item.id);
                router.push(paths.item(session.id, item.id));
              }}
            >
              Looks right
            </Button>
          </ButtonGroup>
        );
      case "adjust":
        return (
          <ButtonGroup>
            <Button variant="secondary" onClick={() => reset("view")}>
              Cancel
            </Button>
            <Button onClick={() => go(store.onAdjust(item.id, edit))}>Save</Button>
          </ButtonGroup>
        );
      case "split":
        return (
          <ButtonGroup>
            <Button variant="secondary" onClick={() => reset("view")}>
              Cancel
            </Button>
            <Button disabled={drawn.length < 2} onClick={() => (store.onSplit(item.id, drawn), router.replace(paths.sale(session.id)))}>
              {drawn.length < 2 ? "Draw at least 2" : `Save ${drawn.length} items`}
            </Button>
          </ButtonGroup>
        );
      case "add":
        return (
          <ButtonGroup>
            <Button variant="secondary" onClick={() => reset("view")}>
              Cancel
            </Button>
            <Button disabled={drawn.length === 0} onClick={() => go(store.onAddFromPhoto({ photoId: item.photoId, frame: item.frame, box: drawn[drawn.length - 1], destination: item.destination }))}>
              Save
            </Button>
          </ButtonGroup>
        );
      case "select":
        return (
          <ButtonGroup>
            <Button variant="secondary" onClick={() => reset("view")}>
              Cancel
            </Button>
            <Button variant="secondary" disabled={picked.length < 2} onClick={() => go(store.onLot(picked))}>
              Mark as a lot
            </Button>
            <Button disabled={picked.length < 2} onClick={() => go(store.onMerge(picked))}>
              Merge into one
            </Button>
          </ButtonGroup>
        );
    }
  })();

  const editor = src ? (
    <BoxEditor
      src={src}
      alt={`The photo ${item.name} came from`}
      boxes={boxes}
      onTap={
        mode === "view"
          ? (id) => id !== item.id && router.push(paths.photo(session.id, id))
          : mode === "select"
            ? (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
            : undefined
      }
      onEdit={mode === "adjust" ? (_id, b) => setEdit(b) : undefined}
      onDraw={mode === "split" ? (b) => setDrawn((d) => [...d, b]) : mode === "add" ? (b) => setDrawn([b]) : undefined}
    />
  ) : (
    <div className="aspect-[4/3] w-full animate-pulse rounded-lg bg-muted" aria-label="Loading the photo" />
  );

  const panel = (
    <Stack gap={16}>
      <Stack gap={8}>
        {photoNumber !== undefined && <p className="text-caption text-muted-foreground">Photo {Number(photoNumber) + 1}</p>}
        <p className="text-small text-foreground">{mode === "select" && picked.length > 1 ? `${picked.length} selected. ${HINTS.select.split(". ").slice(1).join(". ")}` : HINTS[mode]}</p>
        {mode === "view" && !item.box && <p className="text-small text-muted-foreground">The model didn&apos;t place this one, so the whole photo is the subject. Use Adjust to draw a box.</p>}
      </Stack>
      {actions}
    </Stack>
  );

  return (
    <Grid cols={{ base: 1, lg: 12 }} gap={32}>
      <GridItem span={{ base: 1, lg: 8 }}>{editor}</GridItem>
      <GridItem span={{ base: 1, lg: 4 }}>{panel}</GridItem>
    </Grid>
  );
}
