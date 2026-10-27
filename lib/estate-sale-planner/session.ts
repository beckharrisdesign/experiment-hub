/**
 * Session state — where every item is headed, and undo. A pure reducer so the
 * surfaces are testable and every item provably ends in exactly one of Keep,
 * Sell, or Donate (spec: walkthrough-triage). There is no Toss: the founder's
 * instruction is that those three are the options and the user can toggle
 * between them per item, any time.
 */

import type { Box, FlaggedItem } from "./flag";
import type { RefineResponse } from "./refine";

export type Destination = "keep" | "sell" | "donate";
/** Display order everywhere — toggles, sections, counts, tallies (founder, 2026-10-27: "Sell, Donate, Keep"). */
export const DESTINATIONS: readonly Destination[] = ["sell", "donate", "keep"] as const;

export interface SessionItem extends FlaggedItem {
  /** Stable id for lists and analytics; never the model's text. */
  id: string;
  /** Where it is headed. Model-flagged items start at "sell"; the rest start undecided. */
  destination?: Destination;
  /** Small JPEG data URL cropped from the kept frame — what the model saw. */
  image?: string;
  /** Detail shots the user added (a seam, a stamp), as small data URLs. */
  details?: string[];
  /** What the model read off the details — a stamp, a maker's mark, a label. */
  markReading?: string | null;
  /** True once a detail-shot re-read updated name / band / reason / confidence. */
  refined?: boolean;
  /** What the family knows — who bought it, where, when. Sent with a re-read; printed on the sheet. */
  note?: string;
  /** Added by the user, not seen by the model. */
  userAdded?: boolean;
  /** "<saleId>/<photoIndex>" — the 1600 px original in the device photo store (sold-comps D1). Absent: no original. */
  photoId?: string;
  /** Present when this item is a set sold together; keeps the parts so it can be split back. */
  lot?: { parts: Array<{ box: Box | null; name: string }> };
  /** The family checked the subject: by correcting it or with Looks right. Gates the price lookup. */
  confirmed?: boolean;
  /** Where the band came from. Absent reads as the model's estimate. */
  bandSource?: "guess" | "comps" | "family";
  /** A correction was saved and its re-read has not landed yet. */
  rereadPending?: boolean;
  /** The last re-read after a correction failed; the item says it has not been re-read. */
  rereadFailed?: boolean;
  /** "Adjust this item" messages, oldest first (sold-comps D14). */
  messages?: ItemMessage[];
}

/** What a message changed, so Undo can put it back. */
export type MessageFields = Pick<SessionItem, "name" | "band" | "reason">;

export interface ItemMessage {
  text: string;
  at: string;
  before: MessageFields;
  after: MessageFields;
  undone?: boolean;
}

/** The fields the user may edit directly; the destination has its own verb. */
export type ItemPatch = Partial<Pick<SessionItem, "name" | "room" | "band" | "reason" | "confidence" | "note">>;

export interface Move {
  id: string;
  from?: Destination;
  to?: Destination;
}

export interface Session {
  id: string;
  createdAt: string;
  /** "Mom's house" — optional; history and the summary show it when set. */
  name?: string;
  items: SessionItem[];
  /** Every destination change, oldest first — the undo stack. */
  history: Move[];
  /** How many capture passes built this walkthrough (rooms added over days). */
  passes?: number;
}

function placeItems(prefix: string, items: FlaggedItem[], images: Array<string | undefined>): SessionItem[] {
  return items.map((item, i) => ({
    ...item,
    id: `${prefix}_${i}`,
    ...(item.flagged ? { destination: "sell" as const } : {}),
    ...(images[i] ? { image: images[i] } : {}),
  }));
}

export function newSession(
  items: FlaggedItem[],
  now = new Date(),
  images: Array<string | undefined> = [],
  name?: string,
): Session {
  const id = `esp_${now.getTime().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const trimmed = name?.trim().slice(0, 60);
  return {
    id,
    createdAt: now.toISOString(),
    ...(trimmed ? { name: trimmed } : {}),
    items: placeItems(id, items, images),
    history: [],
    passes: 1,
  };
}

/**
 * A second (third, …) room joins the same walkthrough: new items append,
 * flagged ones start at Sell, nothing already sorted moves. Ids carry the
 * pass number so they never collide with the first pass.
 */
export function appendItems(s: Session, items: FlaggedItem[], images: Array<string | undefined> = []): Session {
  const pass = (s.passes ?? 1) + 1;
  return {
    ...s,
    items: [...s.items, ...placeItems(`${s.id}_p${pass}`, items, images)],
    passes: pass,
  };
}

export function renameSession(s: Session, name: string): Session {
  const trimmed = name.trim().slice(0, 60);
  if ((s.name ?? "") === trimmed) return s;
  const { name: _old, ...rest } = s;
  return trimmed ? { ...rest, name: trimmed } : rest;
}

export interface KnownItem {
  name: string;
  room: string;
}

/** What the model is told is already listed, so re-walking a room adds the lamp it missed, not a second sofa. */
export const knownItems = (s: Session): KnownItem[] => s.items.map(({ name, room }) => ({ name, room }));

export const sellList = (s: Session) => s.items.filter((i) => i.destination === "sell");
export const keepList = (s: Session) => s.items.filter((i) => i.destination === "keep");
export const donateList = (s: Session) => s.items.filter((i) => i.destination === "donate");
export const undecided = (s: Session) => s.items.filter((i) => !i.destination);
/** Model-flagged items the user moved off Sell — the flag-acceptance signal. */
export const overrides = (s: Session) => s.items.filter((i) => i.flagged && i.destination && i.destination !== "sell");

/** Toggle an item to a destination. Same destination is a no-op; anything else is undoable. */
export function setDestination(s: Session, itemId: string, to: Destination): Session {
  const item = s.items.find((i) => i.id === itemId);
  if (!item || item.destination === to) return s;
  return {
    ...s,
    items: s.items.map((i) => (i.id === itemId ? { ...i, destination: to } : i)),
    history: [...s.history, { id: itemId, from: item.destination, to }],
  };
}

export function undo(s: Session): Session {
  const last = s.history[s.history.length - 1];
  if (!last) return s;
  return {
    ...s,
    items: s.items.map((i) => (i.id === last.id ? { ...i, destination: last.from } : i)),
    history: s.history.slice(0, -1),
  };
}

/** True when nothing is left to decide — the exit screen's condition. */
export const sortFinished = (s: Session) => undecided(s).length === 0;

/** A detail shot lands on the item before any re-read, so it survives a failed request. */
export function attachDetail(s: Session, itemId: string, thumb: string): Session {
  return {
    ...s,
    items: s.items.map((i) => (i.id === itemId ? { ...i, details: [...(i.details ?? []), thumb] } : i)),
  };
}

/** Fold a re-read into the item. The destination is the user's and is never touched. */
export function applyRefinement(s: Session, itemId: string, r: RefineResponse): Session {
  return {
    ...s,
    items: s.items.map((i) =>
      i.id === itemId
        ? { ...i, name: r.name, band: r.band, reason: r.reason, confidence: r.confidence, markReading: r.markReading, refined: true }
        : i,
    ),
  };
}

/**
 * Edit an item in place — correcting a wrong recognition is a rename plus, often, a band.
 * A band the family picks is theirs (`bandSource: "family"`): re-reads and comps never
 * overwrite it. Editing never un-confirms an item.
 */
export function updateItem(s: Session, itemId: string, patch: ItemPatch): Session {
  const item = s.items.find((i) => i.id === itemId);
  if (!item) return s;
  const familyBand = patch.band !== undefined && patch.band !== item.band;
  return { ...s, items: s.items.map((i) => (i.id === itemId ? { ...i, ...patch, ...(familyBand ? { bandSource: "family" as const } : {}) } : i)) };
}

/** Remove an item that is not real (a reflection, a duplicate, a wrong call). Its history goes too. */
export function removeItem(s: Session, itemId: string): Session {
  if (!s.items.some((i) => i.id === itemId)) return s;
  return { ...s, items: s.items.filter((i) => i.id !== itemId), history: s.history.filter((m) => m.id !== itemId) };
}

export interface NewItemInput {
  name: string;
  /** Rooms left the UI (sold-comps D12); kept so the data and the model prompt are unchanged. */
  room?: string;
  destination?: Destination;
  image?: string;
}

/** Add something the model missed. It starts with an honest "no read" band. */
export function addItem(s: Session, input: NewItemInput): Session {
  const id = `${s.id}_u${s.items.length}_${Math.random().toString(36).slice(2, 6)}`;
  const item: SessionItem = {
    id,
    name: input.name.trim().slice(0, 80) || "Untitled item",
    room: input.room?.trim().slice(0, 40) || "Unplaced",
    flagged: false,
    band: "$1–$5",
    reason: "Added by you; the model hasn't seen it. Add a photo and it reads it for a value.",
    confidence: "low",
    frame: 0,
    box: null,
    userAdded: true,
    // The family named it, so the subject is theirs: confirmed from the start.
    confirmed: true,
    ...(input.destination ? { destination: input.destination } : {}),
    ...(input.image ? { image: input.image } : {}),
  };
  return {
    ...s,
    items: [...s.items, item],
    history: input.destination ? [...s.history, { id, to: input.destination }] : s.history,
  };
}

/** Rooms in first-seen order, for the list grouping. */
export function byRoom(items: SessionItem[]): Array<{ room: string; items: SessionItem[] }> {
  const groups = new Map<string, SessionItem[]>();
  for (const item of items) {
    const room = item.room || "Unplaced";
    if (!groups.has(room)) groups.set(room, []);
    groups.get(room)!.push(item);
  }
  return [...groups.entries()].map(([room, items]) => ({ room, items }));
}
