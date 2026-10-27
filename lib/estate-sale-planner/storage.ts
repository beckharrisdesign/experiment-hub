/**
 * Where a walkthrough lives on the device (round 03).
 *
 * - The ACTIVE session is in sessionStorage, as before, so a reload mid-sort
 *   resumes.
 * - Every save also lands in localStorage under its own key plus an index, so
 *   the capture screen can list earlier walkthroughs and reopen one. The
 *   paid Sell Sheet is still the only copy that leaves the device.
 *
 * Quota is the only failure that matters: a long walkthrough's thumbnails can
 * exceed it, so every write retries without images before giving up. The
 * in-memory session keeps showing them this tab either way.
 */
import { SESSION_STORAGE_KEY } from "./config";
import { donateList, keepList, sellList, undecided, type Session } from "./session";
import { tallies, type Tally } from "./tally";

const HISTORY_KEY = "esp:history:v1";
const SAVED_PREFIX = "esp:saved:";
/** Earlier walkthroughs kept on the device; the oldest full copy is evicted past this. */
export const HISTORY_LIMIT = 6;

export interface HistoryEntry {
  id: string;
  name?: string;
  createdAt: string;
  updatedAt: string;
  items: number;
  keep: number;
  sell: number;
  donate: number;
  undecided: number;
  /** What each pile might be worth, so Home can show it without opening the sale. Entries saved
   * before this field existed are filled in from the saved copy on read. */
  tallies?: { sell: Tally; donate: Tally; keep: Tally };
}

function slim(session: Session): Session {
  return { ...session, items: session.items.map(({ image: _image, details: _details, ...rest }) => rest) };
}

function writeWithFallback(storage: Storage, key: string, session: Session): void {
  try {
    storage.setItem(key, JSON.stringify(session));
  } catch {
    storage.setItem(key, JSON.stringify(slim(session)));
  }
}

export function loadSession(): Session | null {
  try {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function summarize(session: Session, updatedAt = new Date().toISOString()): HistoryEntry {
  return {
    id: session.id,
    ...(session.name ? { name: session.name } : {}),
    createdAt: session.createdAt,
    updatedAt,
    items: session.items.length,
    keep: keepList(session).length,
    sell: sellList(session).length,
    donate: donateList(session).length,
    undecided: undecided(session).length,
    tallies: pileTallies(session),
  };
}

function pileTallies(session: Session): NonNullable<HistoryEntry["tallies"]> {
  const { sell, donate, keep } = tallies(session);
  return { sell, donate, keep };
}

/** An entry from before tallies were stored: work them out from the saved copy, if it is still here. */
function withTallies(entry: HistoryEntry): HistoryEntry {
  if (entry.tallies) return entry;
  try {
    const raw = window.localStorage.getItem(SAVED_PREFIX + entry.id);
    return raw ? { ...entry, tallies: pileTallies(JSON.parse(raw) as Session) } : entry;
  } catch {
    return entry;
  }
}

export function listHistory(): HistoryEntry[] {
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    const entries = raw ? (JSON.parse(raw) as HistoryEntry[]).map(withTallies) : [];
    return entries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

function writeHistory(entries: HistoryEntry[]): void {
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
}

/** Save the active session, and keep a copy on the device for the history list. */
export function saveSession(session: Session | null): void {
  if (!session) {
    try {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // Nothing to clear.
    }
    return;
  }
  try {
    writeWithFallback(window.sessionStorage, SESSION_STORAGE_KEY, session);
  } catch {
    // Private mode or blocked storage: the in-memory session still works.
  }
  saveCopy(session);
}

/**
 * Keep a sale's device copy and its Home entry current without making it the active one — for a
 * photo pass that comes back after the family has moved on to another sale.
 */
export function saveCopy(session: Session): void {
  try {
    const entries = listHistory().filter((e) => e.id !== session.id);
    entries.unshift(summarize(session));
    for (const evicted of entries.slice(HISTORY_LIMIT)) window.localStorage.removeItem(SAVED_PREFIX + evicted.id);
    writeHistory(entries.slice(0, HISTORY_LIMIT));
    writeWithFallback(window.localStorage, SAVED_PREFIX + session.id, session);
  } catch {
    // History is a convenience; the active session is what matters.
  }
}

/** A sale's device copy, read without opening it. */
export function readSaved(id: string): Session | null {
  try {
    const raw = window.localStorage.getItem(SAVED_PREFIX + id);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

/** Reopen an earlier walkthrough as the active session. */
export function openSaved(id: string): Session | null {
  try {
    const raw = window.localStorage.getItem(SAVED_PREFIX + id);
    if (!raw) return null;
    const session = JSON.parse(raw) as Session;
    writeWithFallback(window.sessionStorage, SESSION_STORAGE_KEY, session);
    return session;
  } catch {
    return null;
  }
}

export function deleteSaved(id: string): void {
  try {
    window.localStorage.removeItem(SAVED_PREFIX + id);
    writeHistory(listHistory().filter((e) => e.id !== id));
    const active = loadSession();
    if (active?.id === id) window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Nothing to do.
  }
}
