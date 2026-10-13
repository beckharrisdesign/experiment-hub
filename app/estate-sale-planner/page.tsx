"use client";

import { useCallback, useEffect, useState } from "react";
import { Container, Section } from "@beckharrisdesign/mvds";
import Capture from "./Capture";
import FrameGrid from "./FrameGrid";
import Lists from "./Lists";
import Swipe from "./Swipe";
import Exit from "./Exit";
import { framesFromPhotos, framesFromVideo, isVideo, type CapturedFrame, type CaptureProgress } from "../../lib/estate-sale-planner/capture";
import type { FlagResult } from "../../lib/estate-sale-planner/flag";
import { decide, newSession, sortFinished, undo, type Session } from "../../lib/estate-sale-planner/session";
import { itemThumbnail } from "../../lib/estate-sale-planner/thumbs";
import { loadSession, saveSession } from "../../lib/estate-sale-planner/storage";
import { track } from "../../lib/estate-sale-planner/analytics";

type Step = "capture" | "frames" | "lists" | "swipe" | "exit";

/**
 * The one route. A linear step machine: capture → frames → lists → swipe →
 * exit. A session already in sessionStorage resumes at the lists (or the
 * exit, if the sort was finished) so a reload mid-sort is not a restart.
 */
export default function EstateSalePlannerPage() {
  const [step, setStep] = useState<Step>("capture");
  const [frames, setFrames] = useState<CapturedFrame[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<CaptureProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [fromFixture, setFromFixture] = useState(false);

  useEffect(() => {
    track("esp_start");
    const existing = loadSession();
    if (existing) {
      setSession(existing);
      setStep(sortFinished(existing) ? "exit" : "lists");
    }
  }, []);

  const update = useCallback((next: Session) => {
    setSession(next);
    saveSession(next);
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
      // "What it thinks it found": crop each item's frame to its box on the
      // device. The fixture's frame indices belong to a sample house, so they
      // wrap onto whatever frames the user actually sent.
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

  const onDecide = useCallback(
    (itemId: string, decision: "keep" | "toss") => {
      if (!session) return;
      const item = session.items.find((i) => i.id === itemId);
      if (item?.flagged) track("esp_sell_override", { decision });
      const next = decide(session, itemId, decision);
      update(next);
      if (step === "swipe" && sortFinished(next)) {
        track("esp_swipe_complete", { items: next.items.length });
        setStep("exit");
      }
    },
    [session, step, update],
  );

  const onUndo = useCallback(() => {
    if (session) update(undo(session));
  }, [session, update]);

  const reset = useCallback(() => {
    saveSession(null);
    setSession(null);
    setFrames([]);
    setStep("capture");
  }, []);

  return (
    <Section bg="background" py={24}>
      <Container size="md">
        {step === "capture" && <Capture busy={busy} progress={progress} error={error} onFiles={onFiles} />}
        {step === "frames" && <FrameGrid frames={frames} sending={busy} onSend={onSend} onBack={reset} />}
        {step === "lists" && session && (
          <Lists
            session={session}
            fromFixture={fromFixture}
            onOverride={onDecide}
            onStartSorting={() => setStep(sortFinished(session) ? "exit" : "swipe")}
          />
        )}
        {step === "swipe" && session && <Swipe session={session} onDecide={onDecide} onUndo={onUndo} />}
        {step === "exit" && session && <Exit session={session} />}
      </Container>
    </Section>
  );
}
