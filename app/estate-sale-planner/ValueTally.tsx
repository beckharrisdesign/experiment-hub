"use client";

import { Card, CardDescription, CardHeader, CardTitle, Grid, Stack } from "@beckharrisdesign/mvds";
import type { Session } from "../../lib/estate-sale-planner/session";
import { formatTally, tallies } from "../../lib/estate-sale-planner/tally";

const PILES = [
  { key: "sell", label: "Possible sales" },
  { key: "donate", label: "Donation value" },
  { key: "keep", label: "Value kept" },
] as const;

/**
 * What each pile might be worth, summed from the value bands. Stacks on a phone,
 * three across from `sm` up. Unsorted items are left out and said so, so the
 * three numbers always add up to the piles you can see.
 */
export default function ValueTally({ session }: { session: Session }) {
  const t = tallies(session);
  return (
    <section aria-label="What each pile might be worth">
      <Stack gap={16}>
        <Grid cols={{ base: 1, sm: 3 }} gap={16}>
          {PILES.map(({ key, label }) => (
            <Card key={key} size="sm">
              <CardHeader>
                <CardDescription>{label}</CardDescription>
                <CardTitle className="text-h3 text-foreground">{formatTally(t[key])}</CardTitle>
                <p className="text-caption text-muted-foreground">
                  {t[key].count} {t[key].count === 1 ? "item" : "items"}
                </p>
              </CardHeader>
            </Card>
          ))}
        </Grid>
      </Stack>
    </section>
  );
}
