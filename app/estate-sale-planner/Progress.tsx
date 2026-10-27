"use client";

import Link from "next/link";
import { Button, Stack } from "@beckharrisdesign/mvds";
import { paths } from "../../lib/estate-sale-planner/routes";
import { undecided, type Session } from "../../lib/estate-sale-planner/session";
import ValueTally from "./ValueTally";

interface ProgressProps {
  session: Session;
}

/**
 * Progress (round 05a; was Finish) — where the sale stands: how much is left to
 * sort and what each pile might be worth. The exits that lived here (donation
 * pickup, print / Sell Sheet, junk haul) are out until the CTA design pass
 * (founder, 2026-10-27: "Take it out for now. I will do a full design pass on
 * the CTA elements"). The camera and Home are in the tab bar.
 */
export default function Progress({ session }: ProgressProps) {
  const left = undecided(session).length;

  return (
    <Stack gap={40}>
      <Stack gap={16}>
        <h1 className="text-h1 text-foreground">{left > 0 ? `${left} still to sort` : "Sorted"}</h1>
        {left > 0 && (
          <div>
            <Button variant="outline" asChild>
              <Link href={paths.sort(session.id)}>Sort the rest</Link>
            </Button>
          </div>
        )}
      </Stack>

      <ValueTally session={session} />
    </Stack>
  );
}
