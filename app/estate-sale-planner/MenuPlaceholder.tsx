"use client";

import { useId, useRef } from "react";
import { Button } from "@beckharrisdesign/mvds";
import { track } from "../../lib/estate-sale-planner/analytics";

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
 * round 02.1, so it holds a heading and Close only. A native <dialog> gives focus trapping,
 * Escape and the backdrop without a dependency — MVDS has no Dialog yet (design D4).
 */
export default function MenuPlaceholder() {
  const dialog = useRef<HTMLDialogElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const close = () => dialog.current?.close();

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
      </dialog>
    </>
  );
}
