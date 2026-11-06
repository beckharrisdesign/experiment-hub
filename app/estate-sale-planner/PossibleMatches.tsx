"use client";

import { useRef, useState } from "react";
import { Button } from "@beckharrisdesign/mvds";
import type { SoldListing } from "../../lib/estate-sale-planner/comps/provider";

interface PossibleMatchesProps {
  /** Already chosen and ordered: see `possibleMatches`. */
  matches: SoldListing[];
  pickedUrl?: string;
  onPick: (listing: SoldListing) => void;
}

/**
 * Up to five sold listings a check found, to compare with the item's photo (sold-comps design
 * D25, Figma round 20). They're found by text, so they aren't called closest and they don't set
 * a price: picking one does, and tapping it again undoes that. MVDS has no carousel, so this is
 * native horizontal scrolling on MVDS tokens: swipe, trackpad and keyboard all work with no code.
 */
export default function PossibleMatches({ matches, pickedUrl, onPick }: PossibleMatchesProps) {
  const track = useRef<HTMLUListElement>(null);
  const [position, setPosition] = useState(0);
  if (matches.length === 0) return null;

  const onScroll = () => {
    const list = track.current;
    const card = list?.firstElementChild as HTMLElement | null | undefined;
    if (!list || !card) return;
    const step = card.offsetWidth + 16;
    setPosition(Math.min(matches.length - 1, Math.round(list.scrollLeft / step)));
  };

  return (
    <section aria-label="Possible matches" className="min-w-0 space-y-2">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-caption font-normal uppercase text-muted-foreground">Possible matches ({matches.length})</h2>
        {matches.length > 1 && (
          <span className="text-small text-muted-foreground" aria-hidden>
            {position + 1} of {matches.length}
          </span>
        )}
      </div>
      <p className="text-small text-muted-foreground">
        {pickedUrl ? "Picked. Tap it again to undo." : "Compare the photos and pick the one most like yours. Its sale price becomes this item's price."}
      </p>
      <ul
        ref={track}
        onScroll={onScroll}
        tabIndex={0}
        aria-label="Sold listings"
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {matches.map((listing) => (
          <MatchCard key={listing.url} listing={listing} picked={listing.url === pickedUrl} onPick={onPick} />
        ))}
      </ul>
    </section>
  );
}

function MatchCard({ listing, picked, onPick }: { listing: SoldListing; picked: boolean; onPick: (listing: SoldListing) => void }) {
  const [imageFailed, setImageFailed] = useState(false);
  const soldOn = listing.soldAt ? new Date(listing.soldAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null;
  return (
    <li className={`flex w-60 shrink-0 snap-start flex-col overflow-hidden rounded-lg border ${picked ? "border-2 border-primary" : "border-border"}`}>
      {listing.image && !imageFailed ? (
        // Hot-linked from eBay, and allowed by the img-src in next.config.js. It can vanish, so it has a fallback.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={listing.image}
          alt={listing.title}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
          className="aspect-[4/3] w-full bg-muted object-contain"
        />
      ) : (
        <div className="flex aspect-[4/3] w-full items-center justify-center bg-muted text-small text-muted-foreground">No photo</div>
      )}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="line-clamp-2 text-small text-foreground">{listing.title}</p>
        <p className="text-small">
          <span className="text-success">${Math.round(listing.priceCents / 100).toLocaleString("en-US")}</span>
          {soldOn && <span className="text-muted-foreground"> Sold {soldOn}</span>}
        </p>
        <a href={listing.url} target="_blank" rel="noopener noreferrer" className="text-small text-foreground underline underline-offset-2">
          View on eBay
        </a>
        <Button className="mt-auto w-full" variant={picked ? "default" : "secondary"} size="sm" aria-pressed={picked} onClick={() => onPick(listing)}>
          {picked ? "Most likely ✓" : "Most likely"}
        </Button>
      </div>
    </li>
  );
}
