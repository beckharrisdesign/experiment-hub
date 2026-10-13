"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Callout, Stack } from "@beckharrisdesign/mvds";
import { HAUL_AWAY } from "../../lib/estate-sale-planner/config";
import { keepList, sellList, tossList, type Session } from "../../lib/estate-sale-planner/session";
import { track } from "../../lib/estate-sale-planner/analytics";

interface ExitProps {
  session: Session;
}

/**
 * Screen 5 — the exit. One CTA on its own line, centered (founder rule). The
 * link is the counted route, which records the tap and then redirects; the
 * placeholder referral is explained in plain language until a deal exists.
 */
export default function Exit({ session }: ExitProps) {
  const [noCoverage, setNoCoverage] = useState(false);
  const toss = tossList(session).length;
  const keep = keepList(session).length;
  const sell = sellList(session).length;

  const exitHref = (via: "tel" | "web") =>
    `/estate-sale-planner/api/exit?session=${encodeURIComponent(session.id)}&count=${toss}&fallback=${noCoverage ? 1 : 0}&via=${via}`;

  return (
    <Stack gap={24}>
      <Stack gap={8}>
        <h1 className="text-3xl font-semibold text-foreground">Sorted.</h1>
        <p className="max-w-prose text-muted-foreground">
          {toss} to toss, {keep} to keep, {sell} that might be worth selling.
        </p>
      </Stack>

      <div className="flex justify-center">
        <Button size="lg" asChild>
          <a
            href={exitHref("tel")}
            onClick={() => track("esp_exit_tap", { count: toss, fallback: noCoverage, via: "tel" })}
            data-analytics-event="esp_exit_tap"
          >
            {noCoverage ? `Find a hauler for the ${toss} toss items` : `Call ${HAUL_AWAY.name} for the ${toss} toss items`}
          </a>
        </Button>
      </div>

      <Stack gap={4} align="center">
        {!noCoverage && (
          <a
            className="text-sm text-muted-foreground underline"
            href={exitHref("web")}
            onClick={() => track("esp_exit_tap", { count: toss, fallback: false, via: "web" })}
          >
            Book online instead
          </a>
        )}
        <button
          type="button"
          className="text-sm text-muted-foreground underline"
          onClick={() => setNoCoverage((v) => !v)}
        >
          {noCoverage ? `Actually, ${HAUL_AWAY.name} does cover me` : "They don't cover my area"}
        </button>
      </Stack>

      <Callout>
        This link carries a placeholder referral code. No deal with {HAUL_AWAY.name} exists yet;
        the tap is counted so we know whether one is worth making.
      </Callout>

      <div className="flex justify-center">
        <Button variant="outline" asChild>
          <Link href="/estate-sale-planner/summary" onClick={() => track("esp_summary_print")}>
            Print or save the sell list
          </Link>
        </Button>
      </div>

      <Callout>Closing this tab loses the session. Print the sell list if you want to keep it.</Callout>
    </Stack>
  );
}
