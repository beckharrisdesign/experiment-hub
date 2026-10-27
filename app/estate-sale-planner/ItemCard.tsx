"use client";

import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Inline } from "@beckharrisdesign/mvds";
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
 * The found-item card (round 02.1 visual): the crop the model saw, room
 * eyebrow, name, band + confidence, reason, any detail shots — then the
 * sell / donate / keep toggle and a Details button that opens the item.
 */
export default function ItemCard({ item, onDestination, onOpen }: ItemCardProps) {
  return (
    <Card className="shadow-lg ring-foreground/15">
      {item.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.image} alt={item.name} className="aspect-[4/3] w-full object-cover" />
      )}
      <CardHeader>
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
      <CardContent>
        <Inline gap={8} align="center" justify="between" className="flex-wrap">
          <DestinationToggle value={item.destination} onChange={(to) => onDestination(item.id, to)} />
          <Button size="sm" variant="ghost" onClick={() => onOpen(item.id)}>
            Details
          </Button>
        </Inline>
      </CardContent>
    </Card>
  );
}

interface ItemRowProps {
  item: SessionItem;
  onDestination: (itemId: string, to: Destination) => void;
  onOpen: (itemId: string) => void;
}

/** The compact row for the Still-to-sort / Donate / Keep lists: thumb, name, toggle. Tap the name for details. */
export function ItemRow({ item, onDestination, onOpen }: ItemRowProps) {
  return (
    <li className="flex flex-wrap items-center gap-4 py-2">
      <button type="button" className="flex min-w-0 flex-1 items-center gap-4 text-left" onClick={() => onOpen(item.id)}>
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image} alt="" className="size-10 shrink-0 rounded-md object-cover ring-1 ring-foreground/10" />
        ) : (
          <span className="size-10 shrink-0 rounded-md bg-muted" aria-hidden />
        )}
        <span className="truncate text-body text-foreground">{item.name}</span>
      </button>
      <DestinationToggle value={item.destination} onChange={(to) => onDestination(item.id, to)} />
    </li>
  );
}
