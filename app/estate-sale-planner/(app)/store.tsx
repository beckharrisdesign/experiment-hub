"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { CapturedFrame } from "../../../lib/estate-sale-planner/capture";
import { detailFromPhoto, itemPhotoFromFile } from "../../../lib/estate-sale-planner/capture";
import type { Box, FlagResult, FrameInput } from "../../../lib/estate-sale-planner/flag";
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
import { addFromPhoto, adjustBox, applyMessage, applyReread, confirmItem, failReread, markLot, mergeItems, splitItem, splitLot, undoMessage } from "../../../lib/estate-sale-planner/correction";
import { cropFromPhoto } from "../../../lib/estate-sale-planner/crops";
import { itemPhotoKey, photoKey, putPhotos } from "../../../lib/estate-sale-planner/photos";
import { deleteSaved, listHistory, loadSession, openSaved, readSaved, saveCopy, saveSession, type HistoryEntry } from "../../../lib/estate-sale-planner/storage";
import { track } from "../../../lib/estate-sale-planner/analytics";

/** Photos sent to the vision pass that have not come back yet (or came back with an error). */
export interface PendingPass {
  id: string;
  saleId: string;
  previews: string[];
  /** Set when the pass failed; the photos stay so it can be tried again. */
  error?: string;
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
  /** Photo passes still being read, across sales. */
  pending: PendingPass[];
  /**
   * Send photos to the vision pass and return at once with the sale they join: `append` adds to
   * the sale in context, else a new (empty) sale is made first. The items land when the pass comes
   * back, whichever screen — or sale — the family is on by then.
   */
  startPass: (frames: CapturedFrame[], opts: { append: boolean; name?: string }) => string;
  retryPass: (passId: string) => void;
  dismissPass: (passId: string) => void;
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
  /** Looks right. */
  onConfirm: (itemId: string) => void;
  /** Re-read a corrected crop again after the last try failed. */
  onRetryReread: (itemId: string) => void;
  /** Corrections on the source photo (sold-comps spec: item-correction). Each confirms what it
   * produces, saves at once, then crops and re-reads every new or changed item in the background
   * (three at a time). They return the ids that now exist, so the screen can follow. */
  onAdjust: (itemId: string, box: Box) => string[];
  onSplit: (itemId: string, boxes: Box[]) => string[];
  onAddFromPhoto: (from: { photoId?: string; frame: number; box: Box; destination?: Destination }) => string[];
  onMerge: (ids: string[]) => string[];
  onLot: (ids: string[]) => string[];
  onSplitLot: (lotId: string) => string[];
  /** "Adjust this item". Resolves false when the message couldn't be applied (the screen keeps it). */
  onMessage: (itemId: string, text: string) => Promise<boolean>;
  onUndoMessage: (itemId: string, index: number) => void;
  /** A new, empty sale (no photos yet). Returns its id. */
  createSale: (name?: string) => string;
  /** A photo for an item that has none (one the family typed in): kept like a walkthrough photo, then read. */
  onAddPhoto: (itemId: string, file: File) => Promise<boolean>;
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
  const [pending, setPending] = useState<PendingPass[]>([]);
  /** The photos behind each pending pass, kept for a retry. */
  const passFrames = useRef(new Map<string, CapturedFrame[]>());
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

  /** Change a sale whether or not it is the one in context: a pass can outlive the screen that started it. */
  const applyTo = useCallback(
    (saleId: string, fn: (s: Session) => Session): Session | null => {
      if (latest.current?.id === saleId) {
        const next = fn(latest.current);
        update(next);
        return next;
      }
      const saved = readSaved(saleId);
      if (!saved) return null;
      const next = fn(saved);
      saveCopy(next);
      setHistory(listHistory());
      return next;
    },
    [update],
  );

  const runPass = useCallback(
    async (passId: string, saleId: string, frames: CapturedFrame[]) => {
      try {
        const base = latest.current?.id === saleId ? latest.current : readSaved(saleId);
        if (!base) throw new Error("That sale isn't on this device any more.");
        const res = await fetch("/estate-sale-planner/api/flag", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            frames: frames.map((f) => ({ data: f.data, at: f.at })),
            // Always sent: what is already listed (empty on a first pass). The
            // model is told not to repeat it; demo mode grows the house from it.
            known: knownItems(base),
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
        // Keep the 1600 px originals on the device and point each new item at its photo (sold-comps D1).
        // The pass number is read when the items land, so two passes in flight never share one.
        const hasOriginals = frames.some((f) => f.original);
        let pass = 1;
        const next = applyTo(saleId, (s) => {
          pass = (s.passes ?? 1) + 1;
          const from = s.items.length;
          const appended = appendItems(s, json.items, images);
          return hasOriginals ? { ...appended, items: appended.items.map((it, idx) => (idx >= from ? { ...it, photoId: photoKey(s.id, pass, it.frame % frames.length) } : it)) } : appended;
        });
        if (!next) throw new Error("That sale isn't on this device any more.");
        if (hasOriginals) {
          void putPhotos(saleId, pass, frames.flatMap((f) => (f.original ? [{ frame: f.at, blob: f.original }] : []))).then((evicted) => {
            if (evicted.length) track("esp_photos_evicted", { sales: evicted.length });
          });
        }
        track("esp_room_appended", { items: json.items.length, pass: next.passes ?? 0 });
        passFrames.current.delete(passId);
        setPending((ps) => ps.filter((p) => p.id !== passId));
        setNotice(
          json.items.length === 0
            ? "Nothing new in those photos. Everything the model saw is already listed."
            : `Added ${json.items.length} ${json.items.length === 1 ? "item" : "items"} from those photos.`,
        );
      } catch (e: any) {
        setPending((ps) => ps.map((p) => (p.id === passId ? { ...p, error: e?.message ?? "The vision pass didn't come back." } : p)));
      }
    },
    [applyTo],
  );

  const createSale = useCallback(
    (name?: string) => {
      const next = newSession([], new Date(), [], name);
      update(next);
      track("esp_new_walkthrough", { empty: true });
      if (name?.trim()) track("esp_walkthrough_named");
      return next.id;
    },
    [update],
  );

  const startPass = useCallback(
    (frames: CapturedFrame[], opts: { append: boolean; name?: string }) => {
      const appending = Boolean(opts.append && latest.current);
      const saleId = appending ? latest.current!.id : createSale(opts.name);
      track("esp_frames_confirmed", { frames: frames.length, appending });
      const passId = `pass_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      passFrames.current.set(passId, frames);
      setPending((ps) => [...ps, { id: passId, saleId, previews: frames.map((f) => f.preview) }]);
      void runPass(passId, saleId, frames);
      return saleId;
    },
    [createSale, runPass],
  );

  const retryPass = useCallback(
    (passId: string) => {
      const pass = pending.find((p) => p.id === passId);
      const frames = passFrames.current.get(passId);
      if (!pass || !frames) return;
      setPending((ps) => ps.map((p) => (p.id === passId ? { id: p.id, saleId: p.saleId, previews: p.previews } : p)));
      void runPass(passId, pass.saleId, frames);
    },
    [pending, runPass],
  );

  const dismissPass = useCallback((passId: string) => {
    passFrames.current.delete(passId);
    setPending((ps) => ps.filter((p) => p.id !== passId));
  }, []);

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

  // ---- Corrections (sold-comps spec: item-correction) -------------------------------------

  const rereadCorrected = useCallback(
    async (itemId: string) => {
      const item = latest.current?.items.find((i) => i.id === itemId);
      if (!item) return;
      const patch = (fn: (s: Session) => Session) => latest.current && update(fn(latest.current));
      let crop = null;
      try {
        crop = item.photoId ? await cropFromPhoto(item.photoId, item.box) : null;
      } catch {
        crop = null;
      }
      if (!crop) return patch((s) => failReread(s, itemId));
      patch((s) => ({ ...s, items: s.items.map((i) => (i.id === itemId ? { ...i, image: crop.thumb } : i)) }));
      try {
        // A re-read takes ~20 s; past the route's own 60 s limit it isn't coming back, so say so
        // rather than spin forever.
        const res = await fetch("/estate-sale-planner/api/refine", {
          method: "POST",
          headers: { "content-type": "application/json" },
          signal: AbortSignal.timeout(75_000),
          body: JSON.stringify({
            item: { name: item.name, room: item.room ?? "", band: item.band, reason: item.reason, confidence: item.confidence },
            details: [{ data: crop.data, at: 0 }],
            context: item.note,
            reframed: true,
          }),
        });
        const json = (await res.json()) as (RefineResult & { success: true }) | { error: string };
        if (!res.ok || "error" in json) throw new Error("error" in json ? json.error : `HTTP ${res.status}`);
        if (json.source === "fixture") {
          setNotice("Demo mode: the new picture is kept, but no vision key is configured, so nothing was re-read.");
          return patch((s) => ({ ...s, items: s.items.map((i) => (i.id === itemId ? { ...i, rereadPending: false } : i)) }));
        }
        patch((s) => applyReread(s, itemId, json));
      } catch {
        patch((s) => failReread(s, itemId));
      }
    },
    [update],
  );

  /** At most three re-reads in flight; a split into six queues the rest (design D3). */
  const queue = useRef<string[]>([]);
  const running = useRef(0);
  const inFlight = useRef(new Set<string>());
  const pump = useCallback(
    function run() {
      while (running.current < 3 && queue.current.length > 0) {
        const id = queue.current.shift()!;
        running.current += 1;
        inFlight.current.add(id);
        void rereadCorrected(id).finally(() => {
          inFlight.current.delete(id);
          running.current -= 1;
          run();
        });
      }
    },
    [rereadCorrected],
  );

  // "Reading the new crop…" is saved with the item, but the queue lives in this tab. After a
  // reload (a phone often reloads a tab you come back to) pick up any read that was cut off,
  // instead of leaving it spinning forever (founder, 2026-10-27: "I adjusted the crop but
  // nothing happened").
  useEffect(() => {
    const stuck = (session?.items ?? []).filter((i) => i.rereadPending && !inFlight.current.has(i.id) && !queue.current.includes(i.id));
    if (stuck.length === 0) return;
    queue.current.push(...stuck.map((i) => i.id));
    pump();
    // Only when the sale in context changes (load, open); a live correction queues its own reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id, pump]);

  const correct = useCallback(
    (next: Session, ids: string[], kind: string): string[] => {
      update(next);
      track("esp_item_corrected", { kind, items: ids.length });
      queue.current.push(...ids);
      pump();
      return ids;
    },
    [update, pump],
  );

  const onConfirm = useCallback((itemId: string) => {
    if (!latest.current) return;
    update(confirmItem(latest.current, itemId));
    track("esp_item_confirmed", { via: "looks_right" });
  }, [update]);

  const onRetryReread = useCallback(
    (itemId: string) => {
      if (!latest.current) return;
      update({ ...latest.current, items: latest.current.items.map((i) => (i.id === itemId ? { ...i, rereadFailed: false, rereadPending: true } : i)) });
      track("esp_item_reread_retry", {});
      queue.current.push(itemId);
      pump();
    },
    [update, pump],
  );

  const onAdjust = useCallback((itemId: string, box: Box) => (latest.current ? correct(adjustBox(latest.current, itemId, box), [itemId], "adjust") : []), [correct]);

  const onSplit = useCallback(
    (itemId: string, boxes: Box[]) => (latest.current ? correct(splitItem(latest.current, itemId, boxes), boxes.map((_, n) => `${itemId}_s${n + 1}`), "split") : []),
    [correct],
  );

  const onAddFromPhoto = useCallback(
    (from: { photoId?: string; frame: number; box: Box; destination?: Destination }) => {
      if (!latest.current) return [];
      const next = addFromPhoto(latest.current, from);
      return correct(next, [next.items[next.items.length - 1].id], "add");
    },
    [correct],
  );

  const combineAs = useCallback(
    (ids: string[], suffix: "m" | "lot") => {
      const current = latest.current;
      const first = current?.items.find((i) => ids.includes(i.id));
      if (!current || !first || ids.length < 2) return [];
      const next = suffix === "m" ? mergeItems(current, ids) : markLot(current, ids);
      return correct(next, [`${first.id}_${suffix}`], suffix === "m" ? "merge" : "lot");
    },
    [correct],
  );
  const onMerge = useCallback((ids: string[]) => combineAs(ids, "m"), [combineAs]);
  const onLot = useCallback((ids: string[]) => combineAs(ids, "lot"), [combineAs]);

  const onSplitLot = useCallback(
    (lotId: string) => {
      const lot = latest.current?.items.find((i) => i.id === lotId)?.lot;
      if (!latest.current || !lot) return [];
      return correct(splitLot(latest.current, lotId), lot.parts.map((_, n) => `${lotId}_p${n + 1}`), "split_lot");
    },
    [correct],
  );

  const onMessage = useCallback(
    async (itemId: string, text: string) => {
      const item = latest.current?.items.find((i) => i.id === itemId);
      if (!item || !text.trim()) return false;
      let data: string | undefined;
      try {
        data = item.photoId ? (await cropFromPhoto(item.photoId, item.box))?.data : undefined;
      } catch {
        data = undefined;
      }
      if (!data && item.image?.startsWith("data:")) data = item.image.split(",")[1];
      setRefining(itemId);
      try {
        const res = await fetch("/estate-sale-planner/api/refine", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            item: { name: item.name, room: item.room, band: item.band, reason: item.reason, confidence: item.confidence },
            details: data ? [{ data, at: 0 }] : [],
            message: text.trim(),
          }),
        });
        const json = (await res.json()) as (RefineResult & { success: true }) | { error: string };
        if (!res.ok || "error" in json) throw new Error("error" in json ? json.error : `HTTP ${res.status}`);
        if (json.source === "fixture") {
          setNotice("Demo mode: no vision key is configured, so the message wasn't read.");
          return false;
        }
        if (latest.current) update(applyMessage(latest.current, itemId, text, json));
        track("esp_item_message", { withPhoto: Boolean(data) });
        return true;
      } catch {
        return false;
      } finally {
        setRefining(null);
      }
    },
    [update],
  );


  const onAddPhoto = useCallback(
    async (itemId: string, file: File) => {
      const current = latest.current;
      if (!current) return false;
      try {
        const { original, thumb } = await itemPhotoFromFile(file);
        const photoId = itemPhotoKey(current.id, itemId);
        await putPhotos(current.id, 0, [{ frame: 0, blob: original, id: photoId }]);
        const base = latest.current ?? current;
        const withPhoto: Session = { ...base, items: base.items.map((i) => (i.id === itemId ? { ...i, photoId, image: thumb } : i)) };
        correct(adjustBox(withPhoto, itemId, { x: 0, y: 0, w: 1, h: 1 }, thumb), [itemId], "add_photo");
        return true;
      } catch (e: any) {
        setNotice(e.message ?? "That photo couldn't be read.");
        return false;
      }
    },
    [correct],
  );

  const onUndoMessage = useCallback((itemId: string, index: number) => {
    if (latest.current) update(undoMessage(latest.current, itemId, index));
  }, [update]);

  const value = useMemo<SaleStore>(
    () => ({ ready, session, history, fromFixture, notice, setNotice, refining, open, update, pending, startPass, retryPass, dismissPass, onDestination, onDetail, onReread, onUpdate, onRemove, onAdd, onUndo, onRename, deleteSale, onConfirm, onRetryReread, onAdjust, onSplit, onAddFromPhoto, onMerge, onLot, onSplitLot, onMessage, onUndoMessage, onAddPhoto, createSale }),
    [ready, session, history, fromFixture, notice, refining, open, update, pending, startPass, retryPass, dismissPass, onDestination, onDetail, onReread, onUpdate, onRemove, onAdd, onUndo, onRename, deleteSale, onConfirm, onRetryReread, onAdjust, onSplit, onAddFromPhoto, onMerge, onLot, onSplitLot, onMessage, onUndoMessage, onAddPhoto, createSale],
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
