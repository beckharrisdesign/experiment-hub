"use client";

import { useRef, useState } from "react";
import { Badge, Button, Callout, Field, Grid, GridItem, Inline, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Stack, Textarea } from "@beckharrisdesign/mvds";
import { DETAIL_SHOT } from "../../lib/estate-sale-planner/config";
import { BANDS } from "../../lib/estate-sale-planner/flag";
import type { Destination, ItemPatch, SessionItem } from "../../lib/estate-sale-planner/session";
import DestinationToggle from "./DestinationToggle";
import { confidenceVariant } from "./ItemCard";

interface ItemDetailProps {
  item: SessionItem;
  refining: boolean;
  onDestination: (itemId: string, to: Destination) => void;
  onUpdate: (itemId: string, patch: ItemPatch) => void;
  onDetail: (itemId: string, file: File) => void;
  onReread: (itemId: string) => void;
  onRemove: (itemId: string) => void;
}

/**
 * The item screen — its own URL since round 05a; Back is in the top bar. Everything about one object
 * is editable here: where it is headed, what it is called (correcting a wrong
 * recognition is a rename), the band, what the family knows, and detail shots
 * that trigger a re-read. Remove is for things that are not real: a
 * reflection, a duplicate, a call the model got wrong. Edits save as you type.
 */
export default function ItemDetail({ item, refining, onDestination, onUpdate, onDetail, onReread, onRemove }: ItemDetailProps) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const detailCount = item.details?.length ?? 0;
  const canAddDetail = detailCount < DETAIL_SHOT.maxPerItem;

  // Phone: photo above the details. Desktop: photo 5 of 12 columns, details 7.
  return (
    <Grid cols={{ base: 1, lg: 12 }} gap={32}>
      <GridItem span={{ base: 1, lg: 5 }}>
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image} alt={item.name} className="aspect-[4/3] w-full rounded-lg object-cover ring-1 ring-foreground/15" />
        ) : (
          <div className="aspect-[4/3] w-full rounded-lg bg-muted" aria-hidden />
        )}
      </GridItem>

      <GridItem span={{ base: 1, lg: 7 }}>
        <Stack gap={24}>
          <Stack gap={8}>
            <p className="text-caption uppercase text-muted-foreground">{item.room}</p>
            <h1 className="text-h2 text-foreground">{item.name}</h1>
            <Inline gap={8} align="center">
              <Badge variant="success">{item.band}</Badge>
              <Badge variant={confidenceVariant[item.confidence]}>{item.confidence} confidence</Badge>
              {item.refined && <Badge variant="outline">re-read</Badge>}
              {item.userAdded && <Badge variant="neutral">added by you</Badge>}
            </Inline>
            <p className="text-body text-muted-foreground">{item.reason}</p>
            {item.markReading && <p className="text-small text-foreground">Mark reads: {item.markReading}</p>}
          </Stack>

          <Stack gap={8}>
            <p className="text-caption uppercase text-muted-foreground">Where is it headed?</p>
            <DestinationToggle size="default" value={item.destination} onChange={(to) => onDestination(item.id, to)} />
          </Stack>

          <Stack gap={16}>
            <p className="text-caption uppercase text-muted-foreground">Take a closer look</p>
            <p className="text-small text-muted-foreground">
              A seam, a stamp on the bottom, a label, a signature. Each shot goes back to the model with what you know, and the read updates.
            </p>
            {detailCount > 0 && (
              <Inline gap={8}>
                {item.details!.map((d, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={d} alt={`Detail ${i + 1}`} className="size-20 rounded-md object-cover ring-1 ring-foreground/10" />
                ))}
              </Inline>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onDetail(item.id, file);
                e.target.value = "";
              }}
            />
            <Inline gap={8}>
              <Button variant="outline" disabled={!canAddDetail || refining} onClick={() => fileRef.current?.click()}>
                {refining ? "Reading…" : canAddDetail ? "Add a detail photo" : `${DETAIL_SHOT.maxPerItem} is the limit`}
              </Button>
              {detailCount > 0 && (
                <Button variant="ghost" disabled={refining} onClick={() => onReread(item.id)}>
                  Re-read with what I know
                </Button>
              )}
            </Inline>
          </Stack>

          <Stack gap={16}>
            <p className="text-caption uppercase text-muted-foreground">Correct it</p>
            <Field label="What is it?" help="If the model called it wrong, rename it here.">
              <Input value={item.name} maxLength={80} onChange={(e) => onUpdate(item.id, { name: e.target.value })} />
            </Field>
            <Field label="Room">
              <Input value={item.room} maxLength={40} onChange={(e) => onUpdate(item.id, { room: e.target.value })} />
            </Field>
            <Field label="Value band" help="A rough resale band, not an appraisal. Change it if you know better.">
              <Select value={item.band} onValueChange={(v) => onUpdate(item.id, { band: v as SessionItem["band"] })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BANDS.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="What the family knows" help="Who bought it, where, when, anything on the receipt. Goes with the next re-read and onto the sell sheet.">
              <Textarea value={item.note ?? ""} maxLength={500} rows={3} onChange={(e) => onUpdate(item.id, { note: e.target.value })} />
            </Field>
          </Stack>

          <Stack gap={8}>
            {confirmRemove ? (
              <Callout>
                <Stack gap={8}>
                  <span>Remove &ldquo;{item.name}&rdquo; from this sale? This cannot be undone.</span>
                  <Inline gap={8}>
                    <Button variant="destructive" size="sm" onClick={() => onRemove(item.id)}>
                      Remove it
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setConfirmRemove(false)}>
                      Keep it listed
                    </Button>
                  </Inline>
                </Stack>
              </Callout>
            ) : (
              <Button variant="ghost" size="sm" className="self-start text-destructive" onClick={() => setConfirmRemove(true)}>
                Not a real item — remove it
              </Button>
            )}
          </Stack>
        </Stack>
      </GridItem>
    </Grid>
  );
}
