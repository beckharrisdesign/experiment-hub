"use client";

import { Badge, Button, Callout, Card, CardContent, CardDescription, CardHeader, CardTitle, Grid, Inline, Stack } from "@beckharrisdesign/mvds";
import { byRoom, sellList, undecided, type Session, type SessionItem } from "../../lib/estate-sale-planner/session";

interface ListsProps {
  session: Session;
  fromFixture: boolean;
  onOverride: (itemId: string, decision: "keep" | "toss") => void;
  onStartSorting: () => void;
}

const confidenceVariant: Record<SessionItem["confidence"], "default" | "muted" | "outline"> = {
  high: "default",
  medium: "outline",
  low: "muted",
};

/**
 * Screen 3 — two lists. Sell items are image-first cards on the MVDS ramp:
 * the crop the model saw, then the name (h4), the band and confidence as
 * badges, the reason (small), the room as a caption eyebrow. Keep / Toss is a
 * scannable list of single-line rows with a small thumbnail each.
 */
export default function Lists({ session, fromFixture, onOverride, onStartSorting }: ListsProps) {
  const sell = sellList(session);
  const rest = byRoom(undecided(session));

  return (
    <Stack gap={40}>
      {fromFixture && (
        <Callout>Demo mode: no vision key is configured, so this is a sample house, not yours.</Callout>
      )}

      <Stack gap={16}>
        <Stack gap={4}>
          <p className="text-caption uppercase tracking-wider text-muted-foreground">Sell</p>
          <h1 className="text-h2 text-foreground">Might be worth something</h1>
        </Stack>
        {sell.length === 0 ? (
          <p className="text-body-lg text-muted-foreground">
            Nothing stood out. That happens, and it doesn&apos;t mean nothing is worth keeping.
          </p>
        ) : (
          <Grid cols={{ base: 1, md: 2 }} gap={16}>
            {sell.map((item) => (
              <Card key={item.id} className="shadow-lg ring-foreground/15">
                {item.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image} alt={item.name} className="aspect-[4/3] w-full object-cover" />
                )}
                <CardHeader>
                  <p className="text-caption uppercase tracking-wider text-muted-foreground">{item.room}</p>
                  <CardTitle>{item.name}</CardTitle>
                  <Inline gap={8} align="center">
                    <Badge variant="success">{item.band}</Badge>
                    <Badge variant={confidenceVariant[item.confidence]}>{item.confidence} confidence</Badge>
                  </Inline>
                  <CardDescription>{item.reason}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Inline gap={8}>
                    <Button size="sm" variant="outline" onClick={() => onOverride(item.id, "keep")}>
                      Keep instead
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onOverride(item.id, "toss")}>
                      Toss instead
                    </Button>
                  </Inline>
                </CardContent>
              </Card>
            ))}
          </Grid>
        )}
      </Stack>

      <Stack gap={24}>
        <Stack gap={4}>
          <p className="text-caption uppercase tracking-wider text-muted-foreground">Keep or toss</p>
          <h2 className="text-h2 text-foreground">Everything else</h2>
        </Stack>
        {rest.map(({ room, items }) => (
          <Stack key={room} gap={8}>
            <h3 className="text-caption uppercase tracking-wider text-muted-foreground">{room}</h3>
            <ul className="divide-y divide-border">
              {items.map((item) => (
                <li key={item.id} className="flex items-center gap-3 py-2">
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image} alt="" className="size-10 shrink-0 rounded-md object-cover ring-1 ring-foreground/10" />
                  ) : (
                    <span className="size-10 shrink-0 rounded-md bg-muted" aria-hidden />
                  )}
                  <span className="text-body text-foreground">{item.name}</span>
                </li>
              ))}
            </ul>
          </Stack>
        ))}
      </Stack>

      <div className="flex justify-center">
        <Button size="lg" onClick={onStartSorting}>
          Start sorting, one at a time
        </Button>
      </div>
    </Stack>
  );
}
