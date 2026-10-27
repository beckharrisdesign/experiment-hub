"use client";

import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Inline } from "@beckharrisdesign/mvds";
import type { Destination, SessionItem } from "../../lib/estate-sale-planner/session";
import DestinationToggle from "./DestinationToggle";

export const confidenceVariant: Record<SessionItem["confidence"], "default" | "muted" | "outline"> = {
  high: "default",
  medium: "outline",
  low: "muted",
};

interface ItemCardProps {
  item: SessionItem;
  onDestination: (itemId: string, to: Destination) => void;
  onOpen: (itemId: string) => void;
}

/**
 * The found-item card: the crop the model saw, name, band + confidence, reason — then the
 * full-width sell / donate / keep toggle, the same control as the item screen. The whole card
 * above the toggle opens the item (founder, 2026-10-27: "make the whole card linkable to that
 * page"), so there is no Details button; the toggle stays its own control so a tap on it never
 * navigates.
 */
export default function ItemCard({ item, onDestination, onOpen }: ItemCardProps) {
  return (
    <Card className={`shadow-lg ring-foreground/15 transition-shadow hover:ring-foreground/30 ${item.image ? "pt-0" : ""}`}>
      <button
        type="button"
        onClick={() => onOpen(item.id)}
        aria-label={`Open ${item.name}`}
        className="flex flex-col gap-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
      {item.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.image} alt="" className="aspect-[4/3] w-full bg-muted object-contain" />
      )}
      <CardHeader className="w-full">
        <CardTitle>{item.name}</CardTitle>
        <Inline gap={8} align="center">
          <Badge variant="success">{item.band}</Badge>
          <Badge variant={confidenceVariant[item.confidence]}>{item.confidence} confidence</Badge>
          {item.refined && <Badge variant="outline">re-read</Badge>}
        </Inline>
        <CardDescription>{item.reason}</CardDescription>
        {item.markReading && <p className="text-small text-foreground">Mark reads: {item.markReading}</p>}
        {item.details?.length ? (
          <Inline gap={8}>
            {item.details.map((d, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={d} alt={`Detail ${i + 1}`} className="size-12 rounded-md object-cover ring-1 ring-foreground/10" />
            ))}
          </Inline>
        ) : null}
      </CardHeader>
      </button>
      <CardContent>
        <DestinationToggle variant="segmented" value={item.destination} onChange={(to) => onDestination(item.id, to)} />
      </CardContent>
    </Card>
  );
}

interface ItemRowProps {
  item: SessionItem;
  onDestination: (itemId: string, to: Destination) => void;
  onOpen: (itemId: string) => void;
}

/**
 * The compact row for the Still-to-sort / Donate / Keep lists: thumb, name, value, toggle. Tap the
 * name for details. The value shows on every row (founder, 2026-10-27: "I still want values on the
 * donation rows") — a donation has a value too.
 */
export function ItemRow({ item, onDestination, onOpen }: ItemRowProps) {
  return (
    <li className="flex flex-wrap items-center gap-4 py-4">
      <button type="button" className="flex min-w-0 flex-1 items-center gap-4 text-left" onClick={() => onOpen(item.id)}>
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image} alt="" className="size-10 shrink-0 rounded-md object-cover ring-1 ring-foreground/10" />
        ) : (
          <span className="size-10 shrink-0 rounded-md bg-muted" aria-hidden />
        )}
        <span className="min-w-0 flex-1 truncate text-body text-foreground">{item.name}</span>
        <span className="shrink-0 whitespace-nowrap text-body font-medium text-success">{item.band}</span>
      </button>
      <DestinationToggle value={item.destination} onChange={(to) => onDestination(item.id, to)} />
    </li>
  );
}
