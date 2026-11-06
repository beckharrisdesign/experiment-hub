"use client";

import { useState } from "react";
import { Button } from "@beckharrisdesign/mvds";
import type { CompsCheck } from "../../lib/estate-sale-planner/comps/check";
import { formatRange, formatStamp } from "../../lib/estate-sale-planner/comps/item";
import type { SoldListing } from "../../lib/estate-sale-planner/comps/provider";
import { COMPS } from "../../lib/estate-sale-planner/config";
import ButtonGroup from "./ButtonGroup";

const PROVIDER_LABEL: Record<string, string> = { compsapi: "CompsAPI (eBay sold)" };

interface SoldPriceCheckProps {
  check: CompsCheck;
}

/**
 * The saved sold-price check (sold-comps design D23, D25, Figma round 20): when it ran, and on
 * request what it was given, what it did, what came back and its sources. Read from the database,
 * so opening an item costs nothing. A check names the item as it was then, which may differ from
 * today's name. It never set a price, so it doesn't report one.
 */
export default function SoldPriceCheck({ check }: SoldPriceCheckProps) {
  const [open, setOpen] = useState(false);
  const [allMatches, setAllMatches] = useState(false);
  const [showLeftOut, setShowLeftOut] = useState(false);
  const { given } = check;
  const shown = allMatches ? check.matches : check.matches.slice(0, COMPS.citeListings);
  const hidden = check.matches.length - shown.length;

  return (
    <section aria-label="Sold-price check" className="space-y-4 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-small font-normal text-foreground">Sold-price check</h2>
          <p className="text-small text-muted-foreground">Checked {formatStamp(check.at)}</p>
        </div>
        <Button className="shrink-0" variant="secondary" size="sm" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? "Hide details" : "Show details"}
        </Button>
      </div>

      {open && (
        <>
      <Rows
        title="What it was given"
        rows={[
          ["Item", given.name],
          ["Mark or label", given.markReading?.trim() || "None"],
          ["Your note", given.note?.trim() || "None"],
          ["Sold as a set", given.lotCount && given.lotCount > 1 ? `Yes, ${given.lotCount} pieces` : "No"],
          ["Price before the check", given.priceBefore],
        ]}
      />

      <Rows
        title="What it did"
        rows={[
          ...(check.tried && check.tried.length > 1
            ? ([["Searches tried", check.tried.map((t) => `${t.query} (${t.found} found)`).join("; ")]] as Array<[string, string]>)
            : []),
          ["Search used", check.query],
          ["Search model", check.queryModel ?? (check.queryReused ? "Reused from an earlier check" : "None")],
          ["Listings from", `${PROVIDER_LABEL[check.provider] ?? check.provider}, pulled ${formatStamp(check.listingsAt)}`],
          ["Listings found", String(check.found)],
          ["Listings checked", String(check.checked)],
          ["Check model", check.readModel ?? "None"],
        ]}
      />

      <Rows
        title="What came back"
        rows={[
          ["Matched", `${check.matched} of ${check.checked}`],
          ...(check.reason ? ([["Reason", check.reason]] as Array<[string, string]>) : []),
          ...(check.rangeCents ? ([["Middle price range", formatRange(check.rangeCents)]] as Array<[string, string]>) : []),
        ]}
      />

      <div className="space-y-2">
        <h3 className="text-caption font-normal uppercase text-muted-foreground">Sources ({check.matched} matched)</h3>
        <Listings listings={shown} />
        {showLeftOut && check.leftOut.length > 0 && (
          <>
            <h3 className="pt-2 text-caption font-normal uppercase text-muted-foreground">Left out ({check.leftOut.length})</h3>
            <Listings listings={check.leftOut} />
          </>
        )}
        {(hidden > 0 || (check.leftOut.length > 0 && !showLeftOut)) && (
          <ButtonGroup>
            {hidden > 0 && (
              <Button variant="secondary" size="sm" onClick={() => setAllMatches(true)}>
                Show all {check.matches.length}
              </Button>
            )}
            {check.leftOut.length > 0 && !showLeftOut && (
              <Button variant="secondary" size="sm" onClick={() => setShowLeftOut(true)}>
                Show the {check.leftOut.length} left out
              </Button>
            )}
          </ButtonGroup>
        )}
      </div>
        </>
      )}
    </section>
  );
}

function Rows({ title, rows }: { title: string; rows: Array<[string, string]> }) {
  return (
    <div className="space-y-2">
      <h3 className="text-caption font-normal uppercase text-muted-foreground">{title}</h3>
      <dl className="space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex gap-4">
            <dt className="w-32 shrink-0 text-small text-muted-foreground">{label}</dt>
            <dd className="min-w-0 break-words text-small text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Listings({ listings }: { listings: SoldListing[] }) {
  if (listings.length === 0) return null;
  return (
    <ul className="space-y-2 text-small">
      {listings.map((l) => (
        <li key={l.url} className="flex items-center gap-2 pointer-coarse:min-h-11">
          <a href={l.url} target="_blank" rel="noopener noreferrer" className="min-w-0 truncate text-foreground underline underline-offset-2">
            {l.title}
          </a>
          <span className="shrink-0 text-muted-foreground">
            ${Math.round(l.priceCents / 100).toLocaleString("en-US")}
            {l.soldAt ? ` · ${new Date(l.soldAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}
