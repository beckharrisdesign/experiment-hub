/**
 * Session state — the lists, the decisions, and undo. A pure reducer so the
 * swipe surface is testable and every item provably ends in exactly one of
 * Sell, Keep, or Toss (spec: walkthrough-triage, "Decide one item at a time").
 */

import type { FlaggedItem } from "./flag";

export type Decision = "keep" | "toss";

export interface SessionItem extends FlaggedItem {
  /** Stable id for lists and analytics; never the model's text. */
  id: string;
  /** Set once the user decides; a Sell item with a decision was overridden. */
  decision?: Decision;
}

export interface Session {
  id: string;
  createdAt: string;
  items: SessionItem[];
  /** Ids of items decided, newest last — the undo stack. */
  decided: string[];
}

export function newSession(items: FlaggedItem[], now = new Date()): Session {
  const id = `esp_${now.getTime().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    createdAt: now.toISOString(),
    items: items.map((item, i) => ({ ...item, id: `${id}_${i}` })),
    decided: [],
  };
}

export const sellList = (s: Session) => s.items.filter((i) => i.flagged && !i.decision);
export const undecided = (s: Session) => s.items.filter((i) => !i.flagged && !i.decision);
export const keepList = (s: Session) => s.items.filter((i) => i.decision === "keep");
export const tossList = (s: Session) => s.items.filter((i) => i.decision === "toss");
/** Sell items the user moved to keep or toss — the flag-acceptance signal. */
export const overrides = (s: Session) => s.items.filter((i) => i.flagged && i.decision);

export function decide(s: Session, itemId: string, decision: Decision): Session {
  const item = s.items.find((i) => i.id === itemId);
  if (!item || item.decision) return s;
  return {
    ...s,
    items: s.items.map((i) => (i.id === itemId ? { ...i, decision } : i)),
    decided: [...s.decided, itemId],
  };
}

export function undo(s: Session): Session {
  const last = s.decided[s.decided.length - 1];
  if (!last) return s;
  return {
    ...s,
    items: s.items.map((i) => (i.id === last ? { ...i, decision: undefined } : i)),
    decided: s.decided.slice(0, -1),
  };
}

/** True when nothing is left to decide — the exit screen's condition. */
export const sortFinished = (s: Session) => undecided(s).length === 0;

/** Rooms in first-seen order, for the Keep / Toss list grouping. */
export function byRoom(items: SessionItem[]): Array<{ room: string; items: SessionItem[] }> {
  const groups = new Map<string, SessionItem[]>();
  for (const item of items) {
    const room = item.room || "Unplaced";
    if (!groups.has(room)) groups.set(room, []);
    groups.get(room)!.push(item);
  }
  return [...groups.entries()].map(([room, items]) => ({ room, items }));
}
