"use client";

import { Badge, Button, Callout, Card, CardContent, Inline, Stack } from "@beckharrisdesign/mvds";
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
 * Screen 3 — two lists. Sell carries bands, reasons, and a confidence Badge;
 * Keep / Toss is grouped by room. A Sell item can be moved off the list here
 * (the override is the flag-acceptance signal).
 */
export default function Lists({ session, fromFixture, onOverride, onStartSorting }: ListsProps) {
  const sell = sellList(session);
  const rest = byRoom(undecided(session));

  return (
    <Stack gap={32}>
      {fromFixture && (
        <Callout>
          Demo mode: no vision key is configured, so this is a sample house, not yours.
        </Callout>
      )}

      <Stack gap={16}>
        <h1 className="text-3xl font-semibold text-foreground">Might be worth something</h1>
        {sell.length === 0 ? (
          <p className="text-muted-foreground">
            Nothing stood out. That happens, and it doesn&apos;t mean nothing is worth keeping.
          </p>
        ) : (
          <Stack gap={8}>
            {sell.map((item) => (
              <Card key={item.id} size="sm">
                <CardContent>
                  <Stack gap={8}>
                    <Inline gap={8} align="center">
                      <span className="font-medium text-foreground">{item.name}</span>
                      <Badge variant="success">{item.band}</Badge>
                      <Badge variant={confidenceVariant[item.confidence]}>{item.confidence} confidence</Badge>
                    </Inline>
                    <p className="text-sm text-muted-foreground">{item.reason}</p>
                    <p className="text-xs text-muted-foreground">{item.room}</p>
                    <Inline gap={8}>
                      <Button size="sm" variant="outline" onClick={() => onOverride(item.id, "keep")}>
                        Keep instead
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => onOverride(item.id, "toss")}>
                        Toss instead
                      </Button>
                    </Inline>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </Stack>

      <Stack gap={16}>
        <h2 className="text-2xl font-semibold text-foreground">Everything else</h2>
        {rest.map(({ room, items }) => (
          <Stack key={room} gap={4}>
            <h3 className="text-sm font-medium text-muted-foreground">{room}</h3>
            <ul className="list-disc pl-5 text-foreground">
              {items.map((item) => (
                <li key={item.id}>{item.name}</li>
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
