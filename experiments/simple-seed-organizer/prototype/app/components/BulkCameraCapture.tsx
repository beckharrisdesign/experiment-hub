"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface BulkCameraCaptureProps {
  /** Called once per seed packet with front photo (required) and optional back photo. */
  onCapturePair: (front: File, back?: File) => void;
  onDone: () => void;
}

type CameraState = "initializing" | "ready" | "error";
type PhotoSide = "front" | "back";

export function BulkCameraCapture({
  onCapturePair,
  onDone,
}: BulkCameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraState, setCameraState] = useState<CameraState>("initializing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [flashVisible, setFlashVisible] = useState(false);

  // Packet pairing state
  const [packetCount, setPacketCount] = useState(0);
  const [currentSide, setCurrentSide] = useState<PhotoSide>("front");
  const [pendingFront, setPendingFront] = useState<File | null>(null);
  const [pendingFrontUrl, setPendingFrontUrl] = useState<string | null>(null);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraState("ready");
      } catch (error) {
        setCameraState("error");
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "I couldn't open your camera. Check permissions and try again.",
        );
      }
    };
    startCamera();
    return () => {
      isMounted = false;
      stopStream();
    };
  }, [stopStream]);

  // Revoke object URL on unmount or when it changes
  useEffect(() => {
    return () => {
      if (pendingFrontUrl) URL.revokeObjectURL(pendingFrontUrl);
    };
  }, [pendingFrontUrl]);

  const captureFrame = useCallback(
    async (side: PhotoSide): Promise<File | null> => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.videoWidth === 0) return null;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      return new Promise<File | null>((resolve) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(null);
              return;
            }
            resolve(
              new File([blob], `bulk-${side}-${Date.now()}.jpg`, {
                type: "image/jpeg",
              }),
            );
          },
          "image/jpeg",
          0.9,
        );
      });
    },
    [],
  );

  const handleCapture = useCallback(async () => {
    if (isCapturing || cameraState !== "ready") return;
    setIsCapturing(true);
    try {
      const file = await captureFrame(currentSide);
      if (!file) {
        setErrorMessage("I couldn't capture that frame. Try again.");
        return;
      }

      // Flash feedback
      setFlashVisible(true);
      setTimeout(() => setFlashVisible(false), 150);

      if (currentSide === "front") {
        // Revoke previous pending URL if any
        if (pendingFrontUrl) URL.revokeObjectURL(pendingFrontUrl);
        setPendingFront(file);
        setPendingFrontUrl(URL.createObjectURL(file));
        setCurrentSide("back");
      } else {
        // Back photo captured — complete the packet
        const front = pendingFront;
        setPendingFront(null);
        setPendingFrontUrl(null);
        setCurrentSide("front");
        setPacketCount((c) => c + 1);
        if (front) onCapturePair(front, file);
      }
    } catch {
      setErrorMessage("I couldn't capture that photo. Try again.");
    } finally {
      setIsCapturing(false);
    }
  }, [
    isCapturing,
    cameraState,
    currentSide,
    pendingFront,
    pendingFrontUrl,
    captureFrame,
    onCapturePair,
  ]);

  const handleSkipBack = useCallback(() => {
    if (!pendingFront) return;
    const front = pendingFront;
    if (pendingFrontUrl) URL.revokeObjectURL(pendingFrontUrl);
    setPendingFront(null);
    setPendingFrontUrl(null);
    setCurrentSide("front");
    setPacketCount((c) => c + 1);
    onCapturePair(front, undefined);
  }, [pendingFront, pendingFrontUrl, onCapturePair]);

  const handleDone = useCallback(() => {
    // Flush any pending front before closing
    if (pendingFront) {
      const front = pendingFront;
      if (pendingFrontUrl) URL.revokeObjectURL(pendingFrontUrl);
      setPendingFront(null);
      setPendingFrontUrl(null);
      setPacketCount((c) => c + 1);
      onCapturePair(front, undefined);
    }
    onDone();
  }, [pendingFront, pendingFrontUrl, onCapturePair, onDone]);

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div>
          <p className="text-sm text-white/70">Bulk photographing</p>
          <p className="text-xs text-white/50">
            {packetCount} packet{packetCount !== 1 ? "s" : ""} captured
          </p>
        </div>
        <button
          onClick={handleDone}
          className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-sm"
        >
          Done
        </button>
      </div>

      {/* Viewfinder */}
      <div className="relative flex-1 bg-black">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
        />
        <div className="pointer-events-none absolute inset-0 border-[3px] border-white/30 m-6 rounded-2xl" />

        {/* Shutter flash */}
        <div
          className={`pointer-events-none absolute inset-0 bg-white transition-opacity duration-75 ${
            flashVisible ? "opacity-60" : "opacity-0"
          }`}
        />

        {/* Front thumbnail (shown while waiting for back) */}
        {pendingFrontUrl && (
          <div className="absolute top-10 right-10 w-16 h-16 rounded-lg overflow-hidden border-2 border-blue-400 shadow-lg">
            <img
              src={pendingFrontUrl}
              alt="Front"
              className="w-full h-full object-cover"
            />
            <span className="absolute bottom-0 left-0 right-0 text-center text-[9px] font-bold bg-blue-500/80 text-white py-0.5">
              FRONT
            </span>
          </div>
        )}

        {cameraState === "initializing" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-white/80">Opening camera...</p>
          </div>
        )}
        {cameraState === "error" && (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
            <div className="bg-black/70 border border-white/20 rounded-lg p-4">
              <p className="text-sm text-white/90 mb-3">
                {errorMessage || "Camera unavailable."}
              </p>
              <button
                onClick={onDone}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-sm"
              >
                Back to import
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="px-6 pb-8 pt-4 flex flex-col items-center gap-4">
        {/* Side indicator + skip */}
        <div className="flex items-center gap-2">
          <span
            className={`px-4 py-1.5 rounded-full text-sm font-semibold ${
              currentSide === "front"
                ? "bg-blue-500 text-white"
                : "bg-orange-500 text-white"
            }`}
          >
            {currentSide === "front" ? "Front photo" : "Back photo"}
          </span>
          {currentSide === "back" && (
            <button
              onClick={handleSkipBack}
              className="px-4 py-1.5 rounded-full text-sm font-medium bg-white/10 hover:bg-white/20 text-white/70 transition-colors"
            >
              Skip back →
            </button>
          )}
        </div>

        {/* Shutter button */}
        <button
          onClick={handleCapture}
          disabled={cameraState !== "ready" || isCapturing}
          aria-label={`Capture ${currentSide} photo`}
          className={`relative w-20 h-20 rounded-full border-4 border-white disabled:opacity-50 disabled:cursor-not-allowed transition-transform active:scale-95 ${
            currentSide === "front" ? "bg-blue-500/30" : "bg-orange-500/30"
          }`}
        >
          <span className="sr-only">Capture {currentSide}</span>
          <span
            className={`absolute top-1.5 right-1.5 w-3 h-3 rounded-full border-2 border-black/30 ${
              currentSide === "front" ? "bg-blue-400" : "bg-orange-400"
            }`}
          />
        </button>

        <p className="text-xs text-white/40">
          {currentSide === "front"
            ? "Aim at the front of the packet"
            : "Now capture the back, or skip →"}
        </p>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
