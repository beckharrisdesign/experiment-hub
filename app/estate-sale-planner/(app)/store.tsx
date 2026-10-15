"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { CapturedFrame } from "../../../lib/estate-sale-planner/capture";
import { detailFromPhoto } from "../../../lib/estate-sale-planner/capture";
import type { FlagResult, FrameInput } from "../../../lib/estate-sale-planner/flag";
import type { RefineResult } from "../../../lib/estate-sale-planner/refine";
import {
  addItem,
  appendItems,
  applyRefinement,
  attachDetail,
  knownItems,
  newSession,
  removeItem,
  renameSession,
  setDestination,
  undo,
  updateItem,
  type Destination,
  type ItemPatch,
  type NewItemInput,
  type Session,
} from "../../../lib/estate-sale-planner/session";
import { itemThumbnail } from "../../../lib/estate-sale-planner/thumbs";
import { deleteSaved, listHistory, loadSession, openSaved, saveSession, type HistoryEntry } from "../../../lib/estate-sale-planner/storage";
import { track } from "../../../lib/estate-sale-planner/analytics";

export interface FlagOutcome {
  /** The sale the items landed in — new, or the one appended to. */
  id: string;
  added: number;
  source: FlagResult["source"];
}

export interface SaleStore {
  /** False until the device's storage has been read once (first client render). */
  ready: boolean;
  /** The sale in context — the one open in sessionStorage. */
  session: Session | null;
  /** Every sale saved on this device, newest first. */
  history: HistoryEntry[];
  /** The last vision pass came from the fixture (no key) — the lists say so. */
  fromFixture: boolean;
  notice: string | null;
  setNotice: (n: string | null) => void;
  /** Item id whose detail shot is being re-read, if any. */
  refining: string | null;
  /** Make `id` the sale in context (from sessionStorage or the device's saved copies). False when it is not on this device. */
  open: (id: string) => boolean;
  update: (next: Session) => void;
  /** Send photos to the vision pass; `append` adds to the sale in context, else a new sale is made. */
  flag: (frames: CapturedFrame[], opts: { append: boolean; name?: string }) => Promise<FlagOutcome>;
  /** Returns the session after the move so a page can react (the sort page finishes on the last one). */
  onDestination: (itemId: string, to: Destination) => Session | null;
  onDetail: (itemId: string, file: File) => Promise<void>;
  onReread: (itemId: string) => Promise<void>;
  onUpdate: (itemId: string, patch: ItemPatch) => void;
  onRemove: (itemId: string) => void;
  onAdd: (input: NewItemInput) => void;
  onUndo: () => void;
  onRename: (name: string) => void;
  deleteSale: (id: string) => void;
}

const SaleContext = createContext<SaleStore | null>(null);

/**
 * One store for the whole app shell (round 05a). The step machine that used
 * to live in a single page is gone: the URL says which screen you are on,
 * this holds the sale in context plus every handler the screens share, and
 * `saveSession` keeps the device copy current exactly as before.
 */
export function SaleProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [fromFixture, setFromFixture] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [refining, setRefining] = useState<string | null>(null);
  /** Full-resolution detail shots for this tab only; thumbs are what persist. */
  const detailData = useRef(new Map<string, FrameInput[]>());
  /** The latest session for async handlers that outlive a render; every setSession below writes it first. */
  const latest = useRef<Session | null>(null);

  useEffect(() => {
    track("esp_start");
    const existing = loadSession();
    latest.current = existing;
    setSession(existing);
    setHistory(listHistory());
    setReady(true);
  }, []);

  const update = useCallback((next: Session) => {
    latest.current = next;
    setSession(next);
    saveSession(next);
    setHistory(listHistory());
  }, []);

  const open = useCallback((id: string) => {
    if (latest.current?.id === id) return true;
    const saved = openSaved(id);
    if (!saved) return false;
    latest.current = saved;
    setSession(saved);
    setFromFixture(false);
    return true;
  }, []);

  const flag = useCallback(
    async (frames: CapturedFrame[], opts: { append: boolean; name?: string }): Promise<FlagOutcome> => {
      const base = opts.append ? latest.current : null;
      const appending = Boolean(base);
      track("esp_frames_confirmed", { frames: frames.length, appending });
      const res = await fetch("/estate-sale-planner/api/flag", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          frames: frames.map((f) => ({ data: f.data, at: f.at })),
          // Always sent: what is already listed (empty on a first pass). The
          // model is told not to repeat it; demo mode grows the house from it.
          known: base ? knownItems(base) : [],
        }),
      });
      const json = (await res.json()) as (FlagResult & { success: true }) | { error: string };
      if (!res.ok || "error" in json) throw new Error("error" in json ? json.error : `HTTP ${res.status}`);
      track("esp_flags_returned", { items: json.items.length, flagged: json.items.filter((i) => i.flagged).length, source: json.source });
      setFromFixture(json.source === "fixture");
      const images = await Promise.all(
        json.items.map(async (item) => {
          const frame = frames[item.frame % frames.length];
          if (!frame) return undefined;
          try {
            return await itemThumbnail(frame.preview, item.box);
          } catch {
            return undefined;
          }
        }),
      );
      if (base) {
        const next = appendItems(base, json.items, images);
        update(next);
        track("esp_room_appended", { items: json.items.length, pass: next.passes ?? 0 });
        return { id: next.id, added: json.items.length, source: json.source };
      }
      const next = newSession(json.items, new Date(), images, opts.name);
      update(next);
      if (opts.name?.trim()) track("esp_walkthrough_named");
      return { id: next.id, added: json.items.length, source: json.source };
    },
    [update],
  );

  const onDestination = useCallback(
    (itemId: string, to: Destination): Session | null => {
      const current = latest.current;
      if (!current) return null;
      const item = current.items.find((i) => i.id === itemId);
      if (!item || item.destination === to) return current;
      track("esp_destination_set", { to, from: item.destination ?? "none", suggested: item.flagged });
      if (item.flagged && to !== "sell") track("esp_sell_override", { decision: to });
      const next = setDestination(current, itemId, to);
      update(next);
      return next;
    },
    [update],
  );

  const reread = useCallback(
    async (current: Session, itemId: string) => {
      const item = current.items.find((i) => i.id === itemId);
      if (!item) return;
      const details = detailData.current.get(itemId) ?? (item.details ?? []).map((d, i) => ({ data: d.split(",")[1] ?? "", at: i }));
      if (details.length === 0) {
        setNotice("Add a detail photo first.");
        return;
      }
      setRefining(itemId);
      setNotice(null);
      try {
        const res = await fetch("/estate-sale-planner/api/refine", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            item: { name: item.name, room: item.room, band: item.band, reason: item.reason, confidence: item.confidence },
            details,
            context: item.note,
          }),
        });
        const json = (await res.json()) as (RefineResult & { success: true }) | { error: string };
        if (!res.ok || "error" in json) throw new Error("error" in json ? json.error : `HTTP ${res.status}`);
        track("esp_item_refined", { source: json.source, details: details.length });
        if (json.source === "fixture") {
          setNotice("Demo mode: the photo is kept, but no vision key is configured, so nothing was re-read.");
          return;
        }
        const base = latest.current ?? current;
        update(applyRefinement(base, itemId, json));
      } catch (e: any) {
        setNotice(e.message ?? "The re-read didn't come back.");
      } finally {
        setRefining(null);
      }
    },
    [update],
  );

  const onDetail = useCallback(
    async (itemId: string, file: File) => {
      const current = latest.current;
      if (!current) return;
      try {
        const shot = await detailFromPhoto(file);
        const existing = detailData.current.get(itemId) ?? [];
        detailData.current.set(itemId, [...existing, { data: shot.data, at: existing.length }]);
        track("esp_detail_added", { count: existing.length + 1 });
        const next = attachDetail(current, itemId, shot.thumb);
        update(next);
        await reread(next, itemId);
      } catch (e: any) {
        setNotice(e.message ?? "That photo couldn't be read.");
      }
    },
    [update, reread],
  );

  const onReread = useCallback(async (itemId: string) => {
    if (latest.current) await reread(latest.current, itemId);
  }, [reread]);

  const onUpdate = useCallback((itemId: string, patch: ItemPatch) => {
    if (latest.current) update(updateItem(latest.current, itemId, patch));
  }, [update]);

  const onRemove = useCallback((itemId: string) => {
    if (!latest.current) return;
    detailData.current.delete(itemId);
    update(removeItem(latest.current, itemId));
  }, [update]);

  const onAdd = useCallback((input: NewItemInput) => {
    if (latest.current) update(addItem(latest.current, input));
  }, [update]);

  const onUndo = useCallback(() => {
    if (latest.current) update(undo(latest.current));
  }, [update]);

  const onRename = useCallback((name: string) => {
    if (!latest.current) return;
    update(renameSession(latest.current, name));
    if (name.trim()) track("esp_walkthrough_named");
  }, [update]);

  const deleteSale = useCallback((id: string) => {
    deleteSaved(id);
    setHistory(listHistory());
    if (latest.current?.id === id) {
      latest.current = null;
      setSession(null);
    }
  }, []);

  const value = useMemo<SaleStore>(
    () => ({ ready, session, history, fromFixture, notice, setNotice, refining, open, update, flag, onDestination, onDetail, onReread, onUpdate, onRemove, onAdd, onUndo, onRename, deleteSale }),
    [ready, session, history, fromFixture, notice, refining, open, update, flag, onDestination, onDetail, onReread, onUpdate, onRemove, onAdd, onUndo, onRename, deleteSale],
  );

  return <SaleContext.Provider value={value}>{children}</SaleContext.Provider>;
}

export function useSaleStore(): SaleStore {
  const store = useContext(SaleContext);
  if (!store) throw new Error("useSaleStore must be used inside SaleProvider");
  return store;
}

export type SaleState = { status: "loading" } | { status: "missing" } | { status: "ready"; session: Session };

/** The sale a `/sales/[id]` screen is about: opened from the device if it is not already in context. */
export function useSale(id: string): SaleState {
  const store = useSaleStore();
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    if (!store.ready) return;
    if (store.session?.id === id) {
      setMissing(false);
      return;
    }
    setMissing(!store.open(id));
  }, [store.ready, store.session?.id, id, store.open, store]);
  if (store.ready && store.session?.id === id) return { status: "ready", session: store.session };
  if (store.ready && missing) return { status: "missing" };
  return { status: "loading" };
}
