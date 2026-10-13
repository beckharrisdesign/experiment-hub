"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Callout, Container, Section, Stack } from "@beckharrisdesign/mvds";
import Capture from "./Capture";
import FrameGrid from "./FrameGrid";
import Lists from "./Lists";
import Swipe from "./Swipe";
import Exit from "./Exit";
import ItemDetail from "./ItemDetail";
import BottomNav, { type NavTab } from "./BottomNav";
import History from "./History";
import { detailFromPhoto, framesFromPhotos, framesFromVideo, isVideo, type CapturedFrame, type CaptureProgress } from "../../lib/estate-sale-planner/capture";
import type { FlagResult, FrameInput } from "../../lib/estate-sale-planner/flag";
import type { RefineResult } from "../../lib/estate-sale-planner/refine";
import {
  addItem,
  applyRefinement,
  attachDetail,
  newSession,
  removeItem,
  setDestination,
  sortFinished,
  undecided,
  undo,
  updateItem,
  type Destination,
  type ItemPatch,
  type NewItemInput,
  type Session,
} from "../../lib/estate-sale-planner/session";
import { itemThumbnail } from "../../lib/estate-sale-planner/thumbs";
import { deleteSaved, listHistory, loadSession, openSaved, saveSession, type HistoryEntry } from "../../lib/estate-sale-planner/storage";
import { track } from "../../lib/estate-sale-planner/analytics";

type Step = "capture" | "frames" | "lists" | "sort" | "exit";

/**
 * The one route. Capture → frames is linear; once a walkthrough exists the
 * phone gets a tab bar (Lists · Sort · Finish) and any item opens full-screen
 * for editing, detail shots, and removal — the mobile list → detail push.
 * A session in sessionStorage resumes; earlier walkthroughs on this device
 * are listed on the capture screen.
 */
export default function EstateSalePlannerPage() {
  const [step, setStep] = useState<Step>("capture");
  const [frames, setFrames] = useState<CapturedFrame[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<CaptureProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [fromFixture, setFromFixture] = useState(false);
  const [openItem, setOpenItem] = useState<string | null>(null);
  const [refining, setRefining] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  /** Full-resolution detail shots for this tab only; thumbs are what persist. */
  const detailData = useRef(new Map<string, FrameInput[]>());

  useEffect(() => {
    track("esp_start");
    const existing = loadSession();
    if (existing) {
      setSession(existing);
      setStep(sortFinished(existing) ? "exit" : "lists");
    }
    setHistory(listHistory());
  }, []);

  const update = useCallback((next: Session) => {
    setSession(next);
    saveSession(next);
    setHistory(listHistory());
  }, []);

  const onFiles = useCallback(async (files: File[]) => {
    setError(null);
    setBusy(true);
    setProgress(null);
    try {
      const video = files.find(isVideo);
      const captured = video
        ? await framesFromVideo(video, setProgress)
        : await framesFromPhotos(files.filter((f) => f.type.startsWith("image/")), setProgress);
      if (captured.length === 0) throw new Error("No frames came out of that. Try a video or a few photos.");
      setFrames(captured);
      setStep("frames");
    } catch (e: any) {
      setError(e.message ?? "Something went wrong reading that file.");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }, []);

  const onSend = useCallback(async () => {
    setBusy(true);
    setError(null);
    track("esp_frames_confirmed", { frames: frames.length });
    try {
      const res = await fetch("/estate-sale-planner/api/flag", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ frames: frames.map((f) => ({ data: f.data, at: f.at })) }),
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
      update(newSession(json.items, new Date(), images));
      setFrames([]);
      setStep("lists");
    } catch (e: any) {
      setError(e.message ?? "The vision pass didn't come back.");
      setStep("capture");
    } finally {
      setBusy(false);
    }
  }, [frames, update]);

  const onDestination = useCallback(
    (itemId: string, to: Destination) => {
      if (!session) return;
      const item = session.items.find((i) => i.id === itemId);
      if (!item || item.destination === to) return;
      track("esp_destination_set", { to, from: item.destination ?? "none", suggested: item.flagged });
      if (item.flagged && to !== "sell") track("esp_sell_override", { decision: to });
      const next = setDestination(session, itemId, to);
      update(next);
      if (step === "sort" && sortFinished(next)) {
        track("esp_swipe_complete", { items: next.items.length });
        setStep("exit");
      }
    },
    [session, step, update],
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
        setSession((latest) => {
          const base = latest ?? current;
          const next = applyRefinement(base, itemId, json);
          saveSession(next);
          return next;
        });
      } catch (e: any) {
        setNotice(e.message ?? "The re-read didn't come back.");
      } finally {
        setRefining(null);
      }
    },
    [],
  );

  const onDetail = useCallback(
    async (itemId: string, file: File) => {
      if (!session) return;
      try {
        const shot = await detailFromPhoto(file);
        const existing = detailData.current.get(itemId) ?? [];
        detailData.current.set(itemId, [...existing, { data: shot.data, at: existing.length }]);
        track("esp_detail_added", { count: existing.length + 1 });
        const next = attachDetail(session, itemId, shot.thumb);
        update(next);
        await reread(next, itemId);
      } catch (e: any) {
        setNotice(e.message ?? "That photo couldn't be read.");
      }
    },
    [session, update, reread],
  );

  const onReread = useCallback((itemId: string) => session && reread(session, itemId), [session, reread]);

  const onUpdate = useCallback((itemId: string, patch: ItemPatch) => session && update(updateItem(session, itemId, patch)), [session, update]);

  const onRemove = useCallback(
    (itemId: string) => {
      if (!session) return;
      detailData.current.delete(itemId);
      update(removeItem(session, itemId));
      setOpenItem(null);
    },
    [session, update],
  );

  const onAdd = useCallback((input: NewItemInput) => session && update(addItem(session, input)), [session, update]);

  const onUndo = useCallback(() => session && update(undo(session)), [session, update]);

  const onTab = useCallback((tab: NavTab) => {
    setOpenItem(null);
    setStep(tab);
  }, []);

  const onOpenSaved = useCallback((id: string) => {
    const saved = openSaved(id);
    if (!saved) return;
    setSession(saved);
    setFromFixture(false);
    setStep(sortFinished(saved) ? "exit" : "lists");
  }, []);

  const onDeleteSaved = useCallback(
    (id: string) => {
      deleteSaved(id);
      setHistory(listHistory());
      if (session?.id === id) {
        setSession(null);
        setStep("capture");
      }
    },
    [session],
  );

  const reset = useCallback(() => {
    saveSession(null);
    setSession(null);
    setFrames([]);
    setOpenItem(null);
    setStep("capture");
  }, []);

  const current = openItem && session ? session.items.find((i) => i.id === openItem) : undefined;
  const hasNav = Boolean(session) && (step === "lists" || step === "sort" || step === "exit");

  return (
    <Section bg="background" py={24} className={hasNav ? "pb-24" : undefined}>
      <Container size="md">
        <Stack gap={16}>
          {notice && (step === "lists" || step === "sort" || step === "exit") && (
            <Callout>
              <span>{notice}</span>{" "}
              <button type="button" className="underline" onClick={() => setNotice(null)}>
                Dismiss
              </button>
            </Callout>
          )}
          {step === "capture" && (
            <Stack gap={40}>
              <Capture busy={busy} progress={progress} error={error} onFiles={onFiles} />
              <History entries={history} onOpen={onOpenSaved} onDelete={onDeleteSaved} />
            </Stack>
          )}
          {step === "frames" && <FrameGrid frames={frames} sending={busy} onSend={onSend} onBack={reset} />}
          {current && session ? (
            <ItemDetail
              item={current}
              refining={refining === current.id}
              onBack={() => setOpenItem(null)}
              onDestination={onDestination}
              onUpdate={onUpdate}
              onDetail={onDetail}
              onReread={onReread}
              onRemove={onRemove}
            />
          ) : (
            <>
              {step === "lists" && session && (
                <Lists
                  session={session}
                  fromFixture={fromFixture}
                  onDestination={onDestination}
                  onOpen={setOpenItem}
                  onAdd={onAdd}
                  onStartSorting={() => setStep("sort")}
                />
              )}
              {step === "sort" && session && <Swipe session={session} onDestination={onDestination} onOpen={setOpenItem} onUndo={onUndo} />}
              {step === "exit" && session && <Exit session={session} />}
            </>
          )}
        </Stack>
      </Container>
      {hasNav && session && !current && <BottomNav active={step as NavTab} left={undecided(session).length} onChange={onTab} />}
    </Section>
  );
}
