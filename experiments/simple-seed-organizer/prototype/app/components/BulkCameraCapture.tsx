"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface BulkCameraCaptureProps {
  onCapture: (file: File) => void;
  onDone: () => void;
}

type CameraState = "initializing" | "ready" | "error";

export function BulkCameraCapture({ onCapture, onDone }: BulkCameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraState, setCameraState] = useState<CameraState>("initializing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [captureCount, setCaptureCount] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);

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
          video: {
            facingMode: { ideal: "environment" },
          },
          audio: false,
        });

        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
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
            : "I couldn't open your camera. Check permissions and try again."
        );
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      stopStream();
    };
  }, [stopStream]);

  const handleCapture = useCallback(async () => {
    if (isCapturing) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.videoWidth === 0 || video.videoHeight === 0) return;

    setIsCapturing(true);
    try {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Could not capture camera frame.");

      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (result) => {
            if (result) resolve(result);
            else reject(new Error("I couldn't capture that frame. Try again."));
          },
          "image/jpeg",
          0.9
        );
      });

      const file = new File([blob], `bulk-capture-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });

      onCapture(file);
      setCaptureCount((count) => count + 1);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "I couldn't capture that photo. Try again."
      );
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing, onCapture]);

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div>
          <p className="text-sm text-white/70">Bulk photographing</p>
          <p className="text-xs text-white/50">{captureCount} captured this session</p>
        </div>
        <button
          onClick={onDone}
          className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-sm"
        >
          Done
        </button>
      </div>

      <div className="relative flex-1 bg-black">
        <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
        <div className="pointer-events-none absolute inset-0 border-[3px] border-white/30 m-6 rounded-2xl" />

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

      <div className="px-6 pb-8 pt-5 flex items-center justify-center">
        <button
          onClick={handleCapture}
          disabled={cameraState !== "ready" || isCapturing}
          className="w-20 h-20 rounded-full border-4 border-white bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Capture packet photo"
        >
          <span className="sr-only">Capture</span>
        </button>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
