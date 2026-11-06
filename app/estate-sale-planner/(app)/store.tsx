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
  setLocation,
  setDestination,
  undo,
  updateItem,
  type Destination,
  type ItemPatch,
  type NewItemInput,
  type Session,
} from "../../../lib/estate-sale-planner/session";
import { itemThumbnail } from "../../../lib/estate-sale-planner/thumbs";
import { addFromPhoto, adjustBox, applyMessage, applyReread, failReread, markLot, mergeItems, splitItem, splitLot, undoMessage } from "../../../lib/estate-sale-planner/correction";
import { cropFromPhoto } from "../../../lib/estate-sale-planner/crops";
import { itemPhotoKey, photoKey, putPhotos } from "../../../lib/estate-sale-planner/photos";
import { deleteSaved, listHistory, loadSession, openSaved, readSaved, saveCopy, saveSession, type HistoryEntry } from "../../../lib/estate-sale-planner/storage";
import { cloud, fetchServerSale, fetchServerSales, queueFirstUpload, type ServerSale } from "../../../lib/estate-sale-planner/cloud";
import { mergeHistory } from "../../../lib/estate-sale-planner/sale-summary";
import { track } from "../../../lib/estate-sale-planner/analytics";
import type { CompsCheck } from "../../../lib/estate-sale-planner/comps/check";
import { applyComps, compsKey, gateBand, isEligible, lotCount } from "../../../lib/estate-sale-planner/comps/item";
import type { CompsSummary } from "../../../lib/estate-sale-planner/comps/summary";
import { loadProfile } from "../../../lib/estate-sale-planner/profile";

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
  /** The sale in context — the one open in sessionStorage, reopened from the device after the app is closed. */
  session: Session | null;
  /** Every sale on this device or on the server for it, newest first (esp-server-sales D5). */
  history: HistoryEntry[];
  /** The last vision pass came from the fixture (no key) — the lists say so. */
  fromFixture: boolean;
  notice: string | null;
  setNotice: (n: string | null) => void;
  /** Item id whose detail shot is being re-read, if any. */
  refining: string | null;
  /** Make `id` the sale in context (from sessionStorage or the device's saved copies). False when it is not on this device. */
  open: (id: string) => boolean;
  /** Fetch a sale the phone no longer has from the server, keep it on the phone and open it (esp-server-sales D5). False when it isn't there either. */
  openFromServer: (id: string, signal?: AbortSignal) => Promise<boolean>;
  update: (next: Session) => void;
  /** Photo passes still being read, across sales. */
  pending: PendingPass[];
  /**
   * Send photos to the vision pass and return at once with the sale they join: `append` adds to
   * the sale in context, else a new (empty) sale is made first. The items land when the pass comes
   * back, whichever screen — or sale — the family is on by then.
   */
  startPass: (frames: CapturedFrame[], opts: { append: boolean; name?: string; location?: string }) => string;
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
  /** The sale's details: its title and city or ZIP. */
  onDetails: (details: { name: string; location: string }) => void;
  deleteSale: (id: string) => void;
  /** Re-read a corrected crop again after the last try failed. */
  onRetryReread: (itemId: string) => void;
  /** Corrections on the source photo (sold-comps spec: item-correction). Each saves at once, then crops and re-reads every new or changed item in the background
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
  createSale: (name?: string, location?: string) => string;
  /** A photo for an item that has none (one the family typed in): kept like a walkthrough photo, then read. */
  onAddPhoto: (itemId: string, file: File) => Promise<boolean>;
  /** Items whose sold-price check is in flight ("Checking sold prices…"). */
  checkingComps: string[];
  /** Saved checks loaded so far, by `checkKey`; null means this item has none. */
  compsChecks: Record<string, CompsCheck | null>;
  /** The item screen opened: load its saved check. No lookup runs (sold-comps D23). */
  onOpenItem: (saleId: string, itemId: string) => void;
  /** The item screen's button: one sold-price check. */
  onCheckComps: (saleId: string, itemId: string) => Promise<void>;
}

export const checkKey = (saleId: string, itemId: string) => `${saleId}/${itemId}`;

const SaleContext = createContext<SaleStore | null>(null);

/** The version this phone holds for a sale: an unsent one, else the last sent or received. */
function localVersionOf(id: string): number | undefined {
  const q = cloud();
  return q ? (q.snapshot().sales[id] ?? q.knownVersion(id)) : undefined;
}

/** The originals a sale's items point at, for the upload queue. */
function photoKeysOf(session: Session): string[] {
  return [...new Set(session.items.flatMap((i) => (i.photoId ? [i.photoId] : [])))];
}

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
  const [checkingComps, setCheckingComps] = useState<string[]>([]);
  const [compsChecks, setCompsChecks] = useState<Record<string, CompsCheck | null>>({});
  /** The server's Home rows from the last refresh; merged into `history` every time it's set. */
  const serverRows = useRef<ServerSale[]>([]);
  /**
   * A sale saved without thumbnails (too big for one request) gets them cut again from its
   * originals, in the background. Not re-sent: the server copy is the same sale.
   */
  const restoreThumbs = useRef((id: string, session: Session) => {
    const missing = session.items.filter((i) => !i.image && i.photoId);
    if (!missing.length) return;
    void (async () => {
      const thumbs = new Map<string, string>();
      for (const item of missing) {
        const crop = await cropFromPhoto(item.photoId!, item.box ?? null).catch(() => null);
        if (crop) thumbs.set(item.id, crop.thumb);
      }
      if (!thumbs.size) return;
      const base = latest.current?.id === id ? latest.current : readSaved(id);
      if (!base) return;
      const withThumbs = { ...base, items: base.items.map((i) => (thumbs.has(i.id) && !i.image ? { ...i, image: thumbs.get(i.id) } : i)) };
      if (latest.current?.id === id) {
        latest.current = withThumbs;
        setSession(withThumbs);
        saveSession(withThumbs);
      } else {
        saveCopy(withThumbs);
      }
    })();
  });
  const refreshHistory = useCallback(() => setHistory(mergeHistory(listHistory(), serverRows.current, localVersionOf)), []);

  useEffect(() => {
    track("esp_start");
    const existing = loadSession();
    latest.current = existing;
    setSession(existing);
    setHistory(listHistory());
    setReady(true);
    // Ask the browser not to evict the device copies under storage pressure; best effort, no prompt.
    void navigator.storage?.persist?.().catch(() => {});

    // The server is the copy of record (esp-server-sales D5, D7): send what this phone had before
    // this version, then fold the server's sales into Home.
    const q = cloud();
    const stop = q?.start(window);
    void queueFirstUpload(photoKeysOf).then((n) => {
      if (n) track("esp_server_first_upload", { sales: n });
    });
    void (async () => {
      const server = await fetchServerSales();
      if (!server || !q) return;
      serverRows.current = server;
      for (const row of server) {
        // The phone's copy is older than the server's: replace it (an unsent edit is newer still, and stays).
        const known = q.knownVersion(row.id) ?? 0;
        if (row.version > known && readSaved(row.id) && !q.snapshot().sales[row.id]) {
          const fresh = await fetchServerSale(row.id);
          // An edit made while this was loading is newer still: keep it.
          if (!fresh || q.snapshot().sales[row.id]) continue;
          q.noteServerVersion(row.id, fresh.version);
          if (latest.current?.id === row.id) {
            // The sale on screen is older than the server's: replace it, or the next edit would be
            // made on stale data and overwrite the newer copy.
            latest.current = fresh.session;
            setSession(fresh.session);
            saveSession(fresh.session);
          } else {
            saveCopy(fresh.session);
          }
          restoreThumbs.current(row.id, fresh.session);
        } else if (row.version > known) {
          q.noteServerVersion(row.id, row.version);
        }
      }
      // On the phone but not on the server (saved while it couldn't be reached): send it.
      const onServer = new Set(server.map((r) => r.id));
      for (const e of listHistory()) if (!onServer.has(e.id) && q.knownVersion(e.id) === undefined) q.markDirty(e.id);
      setHistory(mergeHistory(listHistory(), server, localVersionOf));
    })();
    return () => stop?.();
  }, []);

  const update = useCallback((next: Session) => {
    latest.current = next;
    setSession(next);
    saveSession(next);
    cloud()?.markDirty(next.id);
    refreshHistory();
  }, [refreshHistory]);

  const open = useCallback((id: string) => {
    if (latest.current?.id === id) return true;
    const saved = openSaved(id);
    if (!saved) return false;
    latest.current = saved;
    setSession(saved);
    setFromFixture(false);
    return true;
  }, []);

  const openFromServer = useCallback(async (id: string, signal?: AbortSignal) => {
    const fresh = await fetchServerSale(id);
    // The screen that asked has gone (navigated away): don't touch the sale in context.
    if (!fresh || signal?.aborted) return false;
    cloud()?.noteServerVersion(id, fresh.version);
    saveCopy(fresh.session);
    if (!open(id)) {
      // The phone couldn't keep a copy (storage full or blocked): work from memory this visit.
      latest.current = fresh.session;
      setSession(fresh.session);
      setFromFixture(false);
    }
    refreshHistory();
    restoreThumbs.current(id, fresh.session);
    return true;
  }, [open, refreshHistory]);

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
      cloud()?.markDirty(next.id);
      refreshHistory();
      return next;
    },
    [update, refreshHistory],
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
            saleId,
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
          const kept = frames.flatMap((f) => (f.original ? [{ frame: f.at, blob: f.original }] : []));
          void putPhotos(saleId, pass, kept).then((evicted) => {
            if (evicted.length) track("esp_photos_evicted", { sales: evicted.length });
            cloud()?.queuePhotos(saleId, kept.map((k) => photoKey(saleId, pass, k.frame)));
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
    (name?: string, location?: string) => {
      const next = setLocation(newSession([], new Date(), [], name), location ?? "");
      update(next);
      track("esp_new_walkthrough", { empty: true });
      if (name?.trim()) track("esp_walkthrough_named");
      return next.id;
    },
    [update],
  );

  const startPass = useCallback(
    (frames: CapturedFrame[], opts: { append: boolean; name?: string; location?: string }) => {
      const appending = Boolean(opts.append && latest.current);
      const saleId = appending ? latest.current!.id : createSale(opts.name, opts.location);
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
            saleId: current.id,
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

  const onDetails = useCallback(
    ({ name, location }: { name: string; location: string }) => {
      if (!latest.current) return;
      update(setLocation(renameSession(latest.current, name), location));
      if (name.trim()) track("esp_walkthrough_named");
    },
    [update],
  );

  const deleteSale = useCallback((id: string) => {
    deleteSaved(id);
    cloud()?.queueDelete(id);
    serverRows.current = serverRows.current.filter((r) => r.id !== id);
    refreshHistory();
    if (latest.current?.id === id) {
      latest.current = null;
      setSession(null);
    }
  }, [refreshHistory]);

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
            saleId: latest.current?.id,
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
            saleId: latest.current?.id,
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
        cloud()?.queuePhotos(current.id, [photoId]);
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

  // ---- Sold-price checks (sold-comps design D23): only ever from the item screen's button ----

  const checksInFlight = useRef(new Set<string>());
  const checksLoaded = useRef(new Set<string>());

  const onOpenItem = useCallback((saleId: string, itemId: string) => {
    const at = checkKey(saleId, itemId);
    if (checksLoaded.current.has(at)) return;
    checksLoaded.current.add(at);
    void (async () => {
      try {
        const res = await fetch(`/estate-sale-planner/api/comps?saleId=${encodeURIComponent(saleId)}&itemId=${encodeURIComponent(itemId)}`);
        const json = (await res.json()) as { success?: true; check?: CompsCheck | null };
        if (!res.ok || !json.success) throw new Error("no check");
        // A check that landed while this loaded is newer: keep it.
        setCompsChecks((all) => (all[at] ? all : { ...all, [at]: json.check ?? null }));
      } catch {
        // Try again next time it opens. The server still holds the limit either way.
        checksLoaded.current.delete(at);
      }
    })();
  }, []);

  const onCheckComps = useCallback(
    async (saleId: string, itemId: string) => {
      const sale = latest.current?.id === saleId ? latest.current : readSaved(saleId);
      const item = sale?.items.find((i) => i.id === itemId);
      const minBand = loadProfile().lookupMinBand;
      const at = checkKey(saleId, itemId);
      if (!item || item.rereadPending || !isEligible(item, minBand) || checksInFlight.current.has(at)) return;
      checksInFlight.current.add(at);
      const key = compsKey(item);
      setCheckingComps((ids) => [...ids, itemId]);
      let summary: CompsSummary = { status: "error" };
      try {
        const res = await fetch("/estate-sale-planner/api/comps", {
          method: "POST",
          headers: { "content-type": "application/json" },
          signal: AbortSignal.timeout(60_000),
          body: JSON.stringify({
            item: { name: item.name, band: gateBand(item), priceBefore: item.band, destination: item.destination, markReading: item.markReading ?? undefined, note: item.note, lotCount: lotCount(item) },
            minBand,
            saleId,
            itemId,
          }),
        });
        const json = (await res.json()) as (CompsSummary & { success: true; check?: CompsCheck; nextCheckAt?: string }) | { error: string };
        if (res.ok && "success" in json) {
          const { success: _success, check, nextCheckAt: _next, ...rest } = json;
          summary = rest;
          if (check) {
            checksLoaded.current.add(at);
            setCompsChecks((all) => ({ ...all, [at]: check }));
          }
        }
      } catch {
        // Stays an error: the item keeps its band and the button offers another try.
      } finally {
        checksInFlight.current.delete(at);
        setCheckingComps((ids) => ids.filter((id) => id !== itemId));
      }
      track("esp_comps_result", { status: summary.status, cached: summary.cached, matched: summary.matched });
      applyTo(saleId, (s) => applyComps(s, itemId, key, summary));
    },
    [applyTo],
  );

  const value = useMemo<SaleStore>(
    () => ({ ready, session, history, fromFixture, notice, setNotice, refining, open, openFromServer, update, pending, startPass, retryPass, dismissPass, onDestination, onDetail, onReread, onUpdate, onRemove, onAdd, onUndo, onDetails, deleteSale, onRetryReread, onAdjust, onSplit, onAddFromPhoto, onMerge, onLot, onSplitLot, onMessage, onUndoMessage, onAddPhoto, createSale, checkingComps, compsChecks, onOpenItem, onCheckComps }),
    [ready, session, history, fromFixture, notice, refining, open, openFromServer, update, pending, startPass, retryPass, dismissPass, onDestination, onDetail, onReread, onUpdate, onRemove, onAdd, onUndo, onDetails, deleteSale, onRetryReread, onAdjust, onSplit, onAddFromPhoto, onMerge, onLot, onSplitLot, onMessage, onUndoMessage, onAddPhoto, createSale, checkingComps, compsChecks, onOpenItem, onCheckComps],
  );

  return <SaleContext.Provider value={value}>{children}</SaleContext.Provider>;
}

export function useSaleStore(): SaleStore {
  const store = useContext(SaleContext);
  if (!store) throw new Error("useSaleStore must be used inside SaleProvider");
  return store;
}

export type SaleState = { status: "loading" } | { status: "missing" } | { status: "ready"; session: Session };

/** The sale a `/sales/[id]` screen is about: opened from the device, or else the server, if it is not already in context. */
export function useSale(id: string): SaleState {
  const store = useSaleStore();
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    if (!store.ready) return;
    setMissing(false);
    if (store.session?.id === id || store.open(id)) return;
    // Not on the phone: the server may still have it (esp-server-sales D5). Loading until it answers.
    const request = new AbortController();
    void store.openFromServer(id, request.signal).then((found) => {
      if (!request.signal.aborted && !found) setMissing(true);
    });
    return () => request.abort();
  }, [store.ready, store.session?.id, id, store.open, store.openFromServer, store]);
  if (store.ready && store.session?.id === id) return { status: "ready", session: store.session };
  if (store.ready && missing) return { status: "missing" };
  return { status: "loading" };
}
