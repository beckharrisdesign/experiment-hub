"use client";

import { Fragment, useRef, useState } from "react";
import Link from "next/link";
import { Badge, Button, Callout, Field, Grid, GridItem, Inline, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Stack, Textarea } from "@beckharrisdesign/mvds";
import { BANDS } from "../../lib/estate-sale-planner/flag";
import { paths } from "../../lib/estate-sale-planner/routes";
import type { ItemPatch, SessionItem } from "../../lib/estate-sale-planner/session";
import ButtonGroup from "./ButtonGroup";

interface ItemDetailProps {
  item: SessionItem;
  saleId: string;
  /** A message for this item is being read. */
  refining: boolean;
  onUpdate: (itemId: string, patch: ItemPatch) => void;
  onRemove: (itemId: string) => void;
  onConfirm: (itemId: string) => void;
  onMessage: (itemId: string, text: string) => Promise<boolean>;
  onUndoMessage: (itemId: string, index: number) => void;
  onAddPhoto: (itemId: string, file: File) => Promise<boolean>;
}

/**
 * The item screen (sold-comps design, Figma round 17). Top to bottom: name and price on one
 * row, both Heading 2, price top-right (D15, D17); the photo, with the photo check directly
 * under it (D19); the reason and band line; "Adjust this item" by message (D14); Correct it;
 * remove. The destination toggle lives in the sticky header (D16, D21). One image per item —
 * detail shots left the screen (founder: "sticking to single image per item for now").
 *
 * Desktop: the name and price run full width, then the photo takes 5 of 12 columns.
 */
export default function ItemDetail({ item, saleId, refining, onUpdate, onRemove, onConfirm, onMessage, onUndoMessage, onAddPhoto }: ItemDetailProps) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const photoHref = paths.photo(saleId, item.id);
  const bandOptions: string[] = (BANDS as readonly string[]).includes(item.band) ? [...BANDS] : [item.band, ...BANDS];

  return (
    <Stack gap={32}>
      {/* Remove sits top right as a secondary button (founder, 2026-10-27: the old text link at the
          bottom "looks like text, like an error message"). */}
      <Stack gap={16}>
        <ButtonGroup>
          <Button variant="secondary" size="sm" onClick={() => setConfirmRemove(true)} disabled={confirmRemove}>
            Remove item
          </Button>
        </ButtonGroup>
        {confirmRemove && (
          <Callout>
            <Stack gap={8}>
              <span>Remove &ldquo;{item.name}&rdquo; from this sale? Use this for things that aren&apos;t real: a reflection, a duplicate. It can&apos;t be undone.</span>
              <ButtonGroup>
                <Button variant="secondary" size="sm" onClick={() => setConfirmRemove(false)}>
                  Keep it listed
                </Button>
                <Button variant="destructive" size="sm" onClick={() => onRemove(item.id)}>
                  Remove it
                </Button>
              </ButtonGroup>
            </Stack>
          </Callout>
        )}
      </Stack>
      <div className="flex items-start justify-between gap-4">
        <h1 className="min-w-0 break-words text-h2 text-foreground">{item.name}</h1>
        <p className="shrink-0 whitespace-nowrap text-h2 text-success" aria-label={`Value band ${item.band}`}>
          {item.band}
        </p>
      </div>

      <Grid cols={{ base: 1, lg: 12 }} gap={32}>
        <GridItem span={{ base: 1, lg: 5 }}>
          <Stack gap={16}>
            {item.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.image} alt={item.name} className="aspect-[4/3] w-full rounded-lg bg-muted object-contain ring-1 ring-foreground/15" />
            ) : (
              <NoPhoto onFile={(file) => onAddPhoto(item.id, file)} />
            )}
            <PhotoStatus item={item} photoHref={photoHref} onConfirm={onConfirm} />
          </Stack>
        </GridItem>

        <GridItem span={{ base: 1, lg: 7 }}>
          <Stack gap={40}>
            <Stack gap={8}>
              {item.bandSource === "family" && <p className="text-small text-foreground">Set by you</p>}
              <p className="text-body text-muted-foreground">{item.reason}</p>
            </Stack>

            <AdjustByMessage item={item} busy={refining} onMessage={onMessage} onUndo={onUndoMessage} />

            <Stack gap={24}>
              <p className="text-caption uppercase text-muted-foreground">Correct it</p>
              <Field label="What is it?" help="If the model called it wrong, rename it here.">
                <Input value={item.name} maxLength={80} onChange={(e) => onUpdate(item.id, { name: e.target.value })} />
              </Field>
              <Field label="Value band" help="A rough resale band, not an appraisal. Change it if you know better.">
                <Select value={item.band} onValueChange={(v) => onUpdate(item.id, { band: v as SessionItem["band"] })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {bandOptions.map((b) => (
                      <SelectItem key={b} value={b} disabled={!(BANDS as readonly string[]).includes(b)}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </Stack>

          </Stack>
        </GridItem>
      </Grid>
    </Stack>
  );
}

/** An item with no picture (typed in by the family): say so, and offer one. Not a grey box with controls that lead nowhere. */
function NoPhoto({ onFile }: { onFile: (file: File) => void }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border bg-muted/40 p-4 text-center">
      <p className="text-small text-muted-foreground">No photo yet</p>
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
      <Button variant="secondary" onClick={() => input.current?.click()}>
        Add a photo
      </Button>
    </div>
  );
}

/**
 * Directly under the photo: the check while unconfirmed, the confirmed state after (D19). The
 * photo actions only show when there is a kept original to fix.
 */
function PhotoStatus({ item, photoHref, onConfirm }: { item: SessionItem; photoHref: string; onConfirm: (id: string) => void }) {
  const hasPhoto = Boolean(item.photoId);
  return (
    <Stack gap={8}>
      {item.rereadPending && <p className="text-small text-muted-foreground">Reading the new picture…</p>}
      {item.rereadFailed && <p className="text-small text-muted-foreground">Not re-read yet.</p>}
      {item.confirmed ? (
        <Inline gap={8} justify="between" align="center">
          <Inline gap={8} align="center">
            <span className="text-small text-muted-foreground">✓ Confirmed</span>
            {item.lot && <Badge variant="outline">Lot of {item.lot.parts.length}</Badge>}
          </Inline>
          {hasPhoto && (
            <Button variant="secondary" asChild>
              <Link href={photoHref}>Source photo</Link>
            </Button>
          )}
        </Inline>
      ) : (
        <ButtonGroup>
          {hasPhoto && (
            <Button variant="secondary" asChild>
              <Link href={photoHref}>Fix this photo</Link>
            </Button>
          )}
          <Button onClick={() => onConfirm(item.id)}>Looks right</Button>
        </ButtonGroup>
      )}
    </Stack>
  );
}

/** "Adjust this item" (D14): the family's words change this item only, with undo. */
function AdjustByMessage({ item, busy, onMessage, onUndo }: { item: SessionItem; busy: boolean; onMessage: ItemDetailProps["onMessage"]; onUndo: ItemDetailProps["onUndoMessage"] }) {
  const [text, setText] = useState("");
  const [failed, setFailed] = useState(false);
  const send = async () => {
    setFailed(false);
    const ok = await onMessage(item.id, text);
    if (ok) setText("");
    else setFailed(true);
  };
  return (
    <Stack gap={24}>
      <Stack gap={8}>
        <p className="text-caption uppercase text-muted-foreground">Adjust this item</p>
        <p className="text-small text-muted-foreground">Tell it what you know, in your own words. Only this item changes, and you can undo it.</p>
      </Stack>
      {(item.messages ?? []).map((m, i) => (
        <Fragment key={`${m.at}-${i}`}>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-caption uppercase text-muted-foreground">You</p>
            <p className="text-small text-foreground">{m.text}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <Stack gap={8}>
              <p className="text-caption uppercase text-muted-foreground">{m.undone ? "Undone" : "Updated this item"}</p>
              {m.before.name !== m.after.name && (
                <p className="text-small text-foreground">
                  Name: {m.before.name} → {m.after.name}
                </p>
              )}
              {m.before.band !== m.after.band && (
                <p className="text-small text-foreground">
                  Band: {m.before.band} → {m.after.band}
                </p>
              )}
              {m.before.name === m.after.name && m.before.band === m.after.band && <p className="text-small text-foreground">Updated the reason.</p>}
              {!m.undone && (
                <ButtonGroup>
                  <Button variant="secondary" onClick={() => onUndo(item.id, i)}>
                    Undo
                  </Button>
                </ButtonGroup>
              )}
            </Stack>
          </div>
        </Fragment>
      ))}
      <Textarea
        aria-label="Message about this item"
        value={text}
        maxLength={500}
        rows={3}
        placeholder={'e.g. "This is actually a vintage Hermès" or "Set of 6, not one"'}
        onChange={(e) => setText(e.target.value)}
      />
      {failed && <p className="text-small text-destructive">Couldn&apos;t update it. Try again.</p>}
      <ButtonGroup>
        <Button onClick={send} disabled={busy || !text.trim()}>
          {busy ? "Reading…" : "Send"}
        </Button>
      </ButtonGroup>
    </Stack>
  );
}
