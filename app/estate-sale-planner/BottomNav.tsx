"use client";

import { Button } from "@beckharrisdesign/mvds";

export type NavTab = "lists" | "sort" | "exit";

interface BottomNavProps {
  active: NavTab;
  left: number;
  onChange: (tab: NavTab) => void;
}

/**
 * The phone's tab bar, once a walkthrough exists: Lists (everything, by
 * destination), Sort (the undecided pile, one at a time), Finish (the exits).
 * Fixed to the bottom on MVDS's `z-float` utility (not `Layer`, which is a
 * full-viewport `inset-0` overlay and would swallow every tap on the page —
 * found by the Playwright pass); the page pads for it.
 */
export default function BottomNav({ active, left, onChange }: BottomNavProps) {
  const tabs: Array<{ id: NavTab; label: string }> = [
    { id: "lists", label: "Lists" },
    { id: "sort", label: left > 0 ? `Sort · ${left}` : "Sorted" },
    { id: "exit", label: "Finish" },
  ];
  return (
    <div className="fixed inset-x-0 bottom-0 z-float border-t border-border bg-background/95 backdrop-blur print:hidden">
      <nav aria-label="Walkthrough" className="mx-auto flex max-w-md items-center justify-around gap-2 px-4 py-2">
        {tabs.map((t) => (
          <Button
            key={t.id}
            variant={active === t.id ? "default" : "ghost"}
            size="sm"
            aria-current={active === t.id ? "page" : undefined}
            disabled={t.id === "sort" && left === 0 && active !== "sort"}
            onClick={() => onChange(t.id)}
          >
            {t.label}
          </Button>
        ))}
      </nav>
    </div>
  );
}
