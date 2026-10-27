/**
 * Item correction (sold-comps spec: item-correction; design D2, D3, D14).
 *
 * Founder, 2026-10-27: "what if the image is of three separate items? what if
 * the user needs to split out the image or adjust what we've determined is the
 * subject of the image?" — and later: "submit a chat message within each
 * listing page - to adjust the data on that page only".
 *
 * Pure reducers over a Session, like session.ts. Every correction confirms the
 * items it produces and marks them `rereadPending`; the caller crops the new
 * picture, runs the re-read, and folds the answer back with `applyReread` (or
 * `failReread`). Ids are derived, never the model's text.
 */
import type { Box } from "./flag";
import type { RefineResponse } from "./refine";
import { DESTINATIONS, type Destination, type ItemMessage, type MessageFields, type Session, type SessionItem } from "./session";

const CORRECTED = { confirmed: true, rereadPending: true } as const;

function replaceAt(s: Session, index: number, removeIds: string[], insert: SessionItem[]): Session {
  const kept = s.items.filter((i) => !removeIds.includes(i.id));
  const at = Math.min(index, kept.length);
  return {
    ...s,
    items: [...kept.slice(0, at), ...insert, ...kept.slice(at)],
    history: s.history.filter((m) => !removeIds.includes(m.id)),
  };
}

function clearFailed<T extends SessionItem>(item: T): T {
  const { rereadFailed: _f, ...rest } = item;
  return rest as T;
}

/** Looks right. */
export function confirmItem(s: Session, itemId: string): Session {
  return { ...s, items: s.items.map((i) => (i.id === itemId ? { ...i, confirmed: true } : i)) };
}

/** The box was dragged to fit; `image` is the new crop. */
export function adjustBox(s: Session, itemId: string, box: Box, image?: string): Session {
  return {
    ...s,
    items: s.items.map((i) => (i.id === itemId ? clearFailed({ ...i, box, ...(image ? { image } : {}), ...CORRECTED }) : i)),
  };
}

/** The re-read after a correction landed. A band the family set stays theirs. */
export function applyReread(s: Session, itemId: string, r: RefineResponse): Session {
  return {
    ...s,
    items: s.items.map((i) => {
      if (i.id !== itemId) return i;
      const familyBand = i.bandSource === "family";
      return clearFailed({
        ...i,
        name: r.name,
        reason: r.reason,
        confidence: r.confidence,
        markReading: r.markReading,
        ...(familyBand ? {} : { band: r.band }),
        refined: true,
        rereadPending: false,
      });
    }),
  };
}

/** The re-read failed: the new box and picture stay, the old read stays, and the item says so. */
export function failReread(s: Session, itemId: string): Session {
  return { ...s, items: s.items.map((i) => (i.id === itemId ? { ...i, rereadPending: false, rereadFailed: true } : i)) };
}

/** One item becomes one per box. Each part starts with the old read, numbered, until its own read lands. */
export function splitItem(s: Session, itemId: string, boxes: Box[], images: Array<string | undefined> = []): Session {
  const index = s.items.findIndex((i) => i.id === itemId);
  if (index === -1 || boxes.length === 0) return s;
  const old = s.items[index];
  const parts = boxes.map((box, n) => {
    const { messages: _m, lot: _l, rereadFailed: _f, ...carry } = old;
    return { ...carry, id: `${old.id}_s${n + 1}`, name: `${old.name} (${n + 1} of ${boxes.length})`, box, ...(images[n] ? { image: images[n] } : {}), ...CORRECTED };
  });
  return replaceAt(s, index, [itemId], parts);
}

export interface DrawnItem {
  photoId?: string;
  frame: number;
  box: Box;
  image?: string;
  destination?: Destination;
}

/** A box drawn around something the model missed becomes a new item, with a picture, added by the family. */
export function addFromPhoto(s: Session, drawn: DrawnItem, now = Date.now()): Session {
  const item: SessionItem = {
    id: `${s.id}_add_${now.toString(36)}`,
    name: "New item",
    room: "Unplaced",
    flagged: false,
    band: "$1–$5",
    reason: "Drawn in by you; reading it now.",
    confidence: "low",
    frame: drawn.frame,
    box: drawn.box,
    userAdded: true,
    ...(drawn.photoId ? { photoId: drawn.photoId } : {}),
    ...(drawn.image ? { image: drawn.image } : {}),
    ...(drawn.destination ? { destination: drawn.destination } : {}),
    ...CORRECTED,
  };
  return { ...s, items: [...s.items, item] };
}

/** The smallest box around every part. */
export function boundingBox(boxes: Box[]): Box {
  const x = Math.min(...boxes.map((b) => b.x));
  const y = Math.min(...boxes.map((b) => b.y));
  const right = Math.max(...boxes.map((b) => b.x + b.w));
  const bottom = Math.max(...boxes.map((b) => b.y + b.h));
  const r = (n: number) => Math.round(n * 1e6) / 1e6;
  return { x: r(x), y: r(y), w: r(right - x), h: r(bottom - y) };
}

/** Sell beats Donate beats Keep: merging never quietly drops something the family meant to sell. */
function mostSpecific(items: SessionItem[]): Destination | undefined {
  return DESTINATIONS.find((d) => items.some((i) => i.destination === d));
}

function combine(s: Session, ids: string[], suffix: "m" | "lot", image?: string): { s: Session; index: number; first: SessionItem; parts: SessionItem[]; merged: SessionItem } | null {
  const parts = s.items.filter((i) => ids.includes(i.id));
  if (parts.length < 2) return null;
  const index = s.items.findIndex((i) => i.id === parts[0].id);
  const first = parts[0];
  const boxes = parts.map((p) => p.box).filter((b): b is Box => b !== null);
  const destination = mostSpecific(parts);
  const { messages: _m, lot: _l, rereadFailed: _f, destination: _d, ...carry } = first;
  const merged: SessionItem = {
    ...carry,
    id: `${first.id}_${suffix}`,
    box: boxes.length === parts.length ? boundingBox(boxes) : null,
    ...(destination ? { destination } : {}),
    ...(image ? { image } : {}),
    ...CORRECTED,
  };
  return { s, index, first, parts, merged };
}

/** Several items are one object (a lamp and its shade). */
export function mergeItems(s: Session, ids: string[], image?: string): Session {
  const c = combine(s, ids, "m", image);
  if (!c) return s;
  return replaceAt(s, c.index, ids, [c.merged]);
}

/** Several items sell together as a set. The parts are kept so the lot can be split back. */
export function markLot(s: Session, ids: string[], image?: string): Session {
  const c = combine(s, ids, "lot", image);
  if (!c) return s;
  const lot: SessionItem = { ...c.merged, name: `Lot of ${c.parts.length}`, lot: { parts: c.parts.map((p) => ({ box: p.box, name: p.name })) } };
  return replaceAt(s, c.index, ids, [lot]);
}

/** A lot back into its parts, each confirmed and re-read. */
export function splitLot(s: Session, lotId: string, images: Array<string | undefined> = []): Session {
  const index = s.items.findIndex((i) => i.id === lotId);
  const lot = s.items[index];
  if (!lot?.lot) return s;
  const { lot: parts, messages: _m, rereadFailed: _f, ...carry } = lot;
  const items = parts.parts.map((p, n) => ({ ...carry, id: `${lotId}_p${n + 1}`, name: p.name, box: p.box, ...(images[n] ? { image: images[n] } : {}), ...CORRECTED }));
  return replaceAt(s, index, [lotId], items);
}

const fields = (i: SessionItem): MessageFields => ({ name: i.name, band: i.band, reason: i.reason });

/**
 * A message from the family, already read: only this item changes. It confirms the item,
 * keeps the words on the note (the Sell Sheet and later re-reads see them), and records
 * before/after so Undo can restore it. The band stays the model's estimate (`guess`), so a
 * sold-price check can still confirm it or pull it back.
 */
export function applyMessage(s: Session, itemId: string, text: string, r: RefineResponse, now = new Date()): Session {
  return {
    ...s,
    items: s.items.map((i) => {
      if (i.id !== itemId) return i;
      const after: MessageFields = { name: r.name, band: r.band, reason: r.reason };
      const message: ItemMessage = { text: text.trim(), at: now.toISOString(), before: fields(i), after };
      const note = [i.note?.trim(), text.trim()].filter(Boolean).join("\n");
      return clearFailed({ ...i, ...after, confidence: r.confidence, markReading: r.markReading, bandSource: "guess" as const, confirmed: true, note, messages: [...(i.messages ?? []), message] });
    }),
  };
}

/** Undo one message: the fields it changed go back. The message stays in the thread, marked undone. */
export function undoMessage(s: Session, itemId: string, index: number): Session {
  return {
    ...s,
    items: s.items.map((i) => {
      if (i.id !== itemId) return i;
      const m = i.messages?.[index];
      if (!m || m.undone) return i;
      return { ...i, ...m.before, messages: i.messages!.map((x, n) => (n === index ? { ...x, undone: true } : x)) };
    }),
  };
}
