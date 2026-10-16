"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Callout, Stack } from "@beckharrisdesign/mvds";
import { DONATE_PICKUP, HAUL_AWAY } from "../../lib/estate-sale-planner/config";
import { donateList, keepList, sellList, type Session } from "../../lib/estate-sale-planner/session";
import { track } from "../../lib/estate-sale-planner/analytics";

interface ExitProps {
  session: Session;
  onFilmAnother: () => void;
  onNewWalkthrough: () => void;
}

/**
 * Screen 5 — the exits. One CTA on its own line, centered (founder rule): a
 * pickup for the Donate list, the counted route. The sell list's own exit
 * (print, or the paid Sell Sheet) is the secondary button. Junk haul is a
 * small link for the pile no charity will take — there is no Toss list.
 */
export default function Exit({ session, onFilmAnother, onNewWalkthrough }: ExitProps) {
  const [noCoverage, setNoCoverage] = useState(false);
  const donate = donateList(session).length;
  const keep = keepList(session).length;
  const sell = sellList(session).length;

  const exitHref = (kind: "donate" | "haul", via: "tel" | "web") =>
    `/estate-sale-planner/api/exit?kind=${kind}&session=${encodeURIComponent(session.id)}&count=${kind === "donate" ? donate : 0}&fallback=${noCoverage ? 1 : 0}&via=${via}`;

  return (
    <Stack gap={24}>
      <Stack gap={8}>
        <h1 className="text-h1 text-foreground">Sorted.</h1>
        <p className="max-w-prose text-body-lg text-muted-foreground">
          {keep} to keep, {sell} that might be worth selling, {donate} to donate.
        </p>
      </Stack>

      <div className="flex justify-center">
        <Button size="lg" asChild>
          <a
            href={exitHref("donate", "tel")}
            onClick={() => track("esp_exit_tap", { kind: "donate", count: donate, fallback: noCoverage, via: "tel" })}
            data-analytics-event="esp_exit_tap"
          >
            {noCoverage
              ? `Schedule a Salvation Army pickup for ${donate} ${donate === 1 ? "item" : "items"}`
              : `Call ${DONATE_PICKUP.name} to pick up ${donate} ${donate === 1 ? "item" : "items"}`}
          </a>
        </Button>
      </div>

      <Stack gap={4} align="center">
        {!noCoverage && (
          <a
            className="text-small text-muted-foreground underline"
            href={exitHref("donate", "web")}
            onClick={() => track("esp_exit_tap", { kind: "donate", count: donate, fallback: false, via: "web" })}
          >
            Schedule online instead
          </a>
        )}
        <button type="button" className="text-small text-muted-foreground underline" onClick={() => setNoCoverage((v) => !v)}>
          {noCoverage ? `Actually, ${DONATE_PICKUP.name} does cover me` : "They don't cover my area"}
        </button>
      </Stack>

      <div className="flex justify-center">
        <Button variant="outline" size="lg" asChild>
          <Link href="/estate-sale-planner/summary" onClick={() => track("esp_summary_print")}>
            Save or print the sell list
          </Link>
        </Button>
      </div>

      <Callout>
        These links carry a placeholder referral code. No deal with {DONATE_PICKUP.name} exists yet; the tap is counted so we know whether one is worth making.
      </Callout>

      <p className="text-center text-small text-muted-foreground">
        Still a pile that is only trash?{" "}
        <a
          className="underline"
          href={exitHref("haul", "web")}
          onClick={() => track("esp_exit_tap", { kind: "haul", count: 0, fallback: false, via: "web" })}
        >
          Haul the rest away with {HAUL_AWAY.name}
        </a>
      </p>

      <Callout>This walkthrough is saved on this device under Earlier walkthroughs. The Sell Sheet is the copy you can send to someone else.</Callout>

      <Stack gap={8} align="center">
        <Button variant="outline" onClick={onFilmAnother}>
          Film another room
        </Button>
        <button type="button" className="text-small text-muted-foreground underline" onClick={onNewWalkthrough}>
          Start a new walkthrough
        </button>
      </Stack>
    </Stack>
  );
}
