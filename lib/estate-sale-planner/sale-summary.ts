/**
 * A sale's Home row (round 03), worked out from the sale itself. Pure, so the device
 * (`storage.ts`) and the server (`/api/sales`, esp-server-sales D4) build the same row.
 */
import { donateList, keepList, sellList, undecided, type Session } from "./session";
import { tallies, type Tally } from "./tally";

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

export function pileTallies(session: Session): NonNullable<HistoryEntry["tallies"]> {
  const { sell, donate, keep } = tallies(session);
  return { sell, donate, keep };
}
