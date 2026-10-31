"use client";

import { useId, useRef, useState } from "react";
import { Button, cn } from "@beckharrisdesign/mvds";
import { track } from "../../lib/estate-sale-planner/analytics";
import { COMPS } from "../../lib/estate-sale-planner/config";
import {
  DEFAULT_PROFILE,
  loadProfile,
  lookupChoiceLabel,
  saveProfile,
  type LookupMinBand,
  type Profile,
} from "../../lib/estate-sale-planner/profile";

function Glyph({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={d} />
    </svg>
  );
}

/**
 * The menu slot in the upper right of every planner page (esp-header-affordance; founder,
 * 2026-10-28: "a placeholder hamburger in the upper right for when I have account/persona style
 * activities"). It opens an empty "Account & profile" panel; Katy cut its body copy in Figma
 * round 02.1, so it holds a heading, Close and settings — no explanatory copy. A native <dialog>
 * gives focus trapping, Escape and the backdrop without a dependency — MVDS has no Dialog yet
 * (design D4).
 *
 * First setting (review queue #59; founder, 2026-10-31: "Tokenize that choice - and put it in my
 * profile"): the sold-price lookup threshold, a single-select segmented control in the same
 * pattern as the item screen's destination toggle (DestinationToggle "segmented").
 */
export default function MenuPlaceholder() {
  const dialog = useRef<HTMLDialogElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const lookupId = useId();
  const close = () => dialog.current?.close();
  // The default renders on the server; the device's saved choice is read each time the menu opens.
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const radios = useRef<Array<HTMLButtonElement | null>>([]);
  const choices = COMPS.minBandChoices;
  const current = choices.indexOf(profile.lookupMinBand);

  const choose = (band: LookupMinBand) => {
    if (band === profile.lookupMinBand) return;
    const next = { ...profile, lookupMinBand: band };
    setProfile(next);
    saveProfile(next);
    track("esp_lookup_threshold_set", { band });
  };
  const move = (step: number) => {
    const i = (current + step + choices.length) % choices.length;
    choose(choices[i]);
    radios.current[i]?.focus();
  };

  return (
    <>
      <Button
        ref={button}
        variant="secondary"
        size="icon"
        className="shrink-0"
        aria-label="Menu"
        aria-haspopup="dialog"
        onClick={() => {
          setProfile(loadProfile());
          dialog.current?.showModal();
          track("esp_menu_open");
        }}
      >
        <Glyph d="M4 7h16M4 12h16M4 17h16" />
      </Button>
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        onClose={() => button.current?.focus()}
        // A click that lands on the <dialog> itself is on its backdrop; the panel is its child.
        onClick={(e) => e.target === e.currentTarget && close()}
        className="fixed top-[4.25rem] right-3 left-auto m-0 w-[min(20rem,calc(100vw-1.5rem))] rounded-xl border border-border bg-card p-0 text-foreground shadow-xl backdrop:bg-black/40"
      >
        <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-4">
          <h2 id={titleId} className="text-body font-semibold">
            Account &amp; profile
          </h2>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close"
            onClick={close}
          >
            <Glyph d="M6 6l12 12M18 6L6 18" />
          </Button>
        </div>
        <div className="px-4 pb-4">
          <span id={lookupId} className="mb-2 block text-small text-muted-foreground">
            Look up sold prices for
          </span>
          <div
            role="radiogroup"
            aria-labelledby={lookupId}
            className="grid w-full grid-cols-3 gap-1 rounded-lg border border-border bg-muted p-1"
          >
            {choices.map((band, i) => {
              const checked = band === profile.lookupMinBand;
              return (
                <button
                  key={band}
                  ref={(el) => {
                    radios.current[i] = el;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  tabIndex={checked ? 0 : -1}
                  onClick={() => choose(band)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                      e.preventDefault();
                      move(1);
                    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                      e.preventDefault();
                      move(-1);
                    }
                  }}
                  className={cn(
                    "h-11 rounded-md text-small font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    checked ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {lookupChoiceLabel(band)}
                </button>
              );
            })}
          </div>
        </div>
      </dialog>
    </>
  );
}
