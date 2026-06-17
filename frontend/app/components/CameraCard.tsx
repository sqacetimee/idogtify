"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Prediction, PredictionResult } from "@/app/types/prediction";
import { predictImage } from "@/app/lib/predictionClient";

type Props = {
  onResult: (result: PredictionResult) => void;
  onLoadingChange: (isLoading: boolean) => void;
  /* Called once, the instant a confident scan locks in. */
  onLocked?: (result: PredictionResult) => void;
};

const BUFFER_SIZE = 4;
const SCAN_INTERVAL_MS = 850;

/* ── Smoothing ─────────────────────────────────────────────────────────────
 * Averages breed probabilities across the last N frames so the displayed
 * results don't flicker between different mock (or real) outputs.
 */
function smoothPredictions(buffer: PredictionResult[]): PredictionResult {
  if (buffer.length === 1) return buffer[0];

  const accum: Record<string, number> = {};
  for (const result of buffer) {
    for (const p of result.predictions) {
      accum[p.breed] = (accum[p.breed] ?? 0) + p.probability;
    }
  }

  const n = buffer.length;
  const breeds = Object.entries(accum)
    .map(([breed, total]) => ({ breed, probability: total / n }))
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 4)
    .filter((b) => b.probability > 0.02);

  const sum = breeds.reduce((s, b) => s + b.probability, 0);
  const predictions: Prediction[] = breeds.map((b) => ({
    breed: b.breed,
    probability: sum > 0 ? parseFloat((b.probability / sum).toFixed(3)) : 0,
  }));

  const topProb = predictions[0]?.probability ?? 0;
  const latest = buffer[buffer.length - 1];

  return {
    predictions,
    mixed_breed_likely: topProb < 0.7 && predictions.length > 1,
    confidence: topProb >= 0.45 ? "high" : topProb >= 0.3 ? "medium" : "low",
    inference_time_ms: latest.inference_time_ms,
    model_version: latest.model_version,
    explanation: latest.explanation,
  };
}

/* ── Component ─────────────────────────────────────────────────────────── */

export default function CameraCard({ onResult, onLoadingChange, onLocked }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isBusyRef = useRef(false);
  const isPausedRef = useRef(false);
  const predBufferRef = useRef<PredictionResult[]>([]);
  /* Keep callback refs fresh so the interval closure never goes stale. */
  const onResultRef = useRef(onResult);
  const onLoadingChangeRef = useRef(onLoadingChange);
  const onLockedRef = useRef(onLocked);

  const [cameraActive, setCameraActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveCopy, setLiveCopy] = useState("Dogtifying your pup…");

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);
  useEffect(() => {
    onLoadingChangeRef.current = onLoadingChange;
  }, [onLoadingChange]);
  useEffect(() => {
    onLockedRef.current = onLocked;
  }, [onLocked]);

  /* ── Scanning loop ── */

  const stopScanning = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    isBusyRef.current = false;
    onLoadingChangeRef.current(false);
  }, []);

  const startScanning = useCallback(() => {
    stopScanning();

    intervalRef.current = setInterval(async () => {
      /* Guard: skip frame if paused, a request is already in flight, or
         the video isn't ready yet (readyState < HAVE_CURRENT_DATA = 2). */
      if (isPausedRef.current || isBusyRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;

      /* Draw current frame onto hidden canvas */
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.85)
      );
      if (!blob || isPausedRef.current) return;

      isBusyRef.current = true;
      onLoadingChangeRef.current(true);

      try {
        const file = new File([blob], "frame.jpg", { type: "image/jpeg" });
        const result = await predictImage(file, /* fastFallback */ true);

        predBufferRef.current = [
          ...predBufferRef.current.slice(-(BUFFER_SIZE - 1)),
          result,
        ];
        const smoothed = smoothPredictions(predBufferRef.current);
        onResultRef.current(smoothed);

        /* Lock in once we have a confident match — no need to keep scanning.
           "high" locks immediately; "medium" locks once the buffer has
           filled (a few stable frames) so a single noisy frame can't trigger it. */
        const bufferFull = predBufferRef.current.length >= BUFFER_SIZE;
        if (
          smoothed.confidence === "high" ||
          (smoothed.confidence === "medium" && bufferFull)
        ) {
          isBusyRef.current = false;
          onLoadingChangeRef.current(false);
          stopScanning();
          setLocked(true);
          onLockedRef.current?.(smoothed);
          return;
        }

        setLiveCopy(
          smoothed.confidence === "low"
            ? "Try showing your dog's face and body more clearly"
            : "Scout is sniffing out the breed…"
        );
      } catch {
        /* Silently skip frames that fail — the loop will retry next tick. */
      } finally {
        isBusyRef.current = false;
        onLoadingChangeRef.current(false);
      }
    }, SCAN_INTERVAL_MS);
  }, [stopScanning]);

  /* ── Camera lifecycle ── */

  const stopCamera = useCallback(() => {
    stopScanning();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
    setIsPaused(false);
    setLocked(false);
    isPausedRef.current = false;
    predBufferRef.current = [];
  }, [stopScanning]);

  const scanAgain = useCallback(() => {
    predBufferRef.current = [];
    setLocked(false);
    startScanning();
  }, [startScanning]);

  const startCamera = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
      setLiveCopy("Dogtifying your pup…");
      /* Brief warmup so the first frame isn't a black screen */
      setTimeout(startScanning, 600);
    } catch {
      setError(
        "Camera access denied. Please allow camera permissions and try again."
      );
    }
  }, [startScanning]);

  const pauseScanning = useCallback(() => {
    isPausedRef.current = true;
    setIsPaused(true);
    isBusyRef.current = false;
    onLoadingChangeRef.current(false);
  }, []);

  const resumeScanning = useCallback(() => {
    isPausedRef.current = false;
    setIsPaused(false);
    setLiveCopy("Dogtifying your pup…");
  }, []);

  /* Full cleanup on unmount (mode switch, navigation, etc.) */
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      onLoadingChangeRef.current(false);
    };
  }, []);

  /* ── Render ── */

  return (
    <div className="bg-white rounded-3xl p-6 shadow-card border border-cream-dark transition-transform duration-300 hover:-translate-y-1">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <span className="text-xl" aria-hidden="true">📷</span>
        <h2 className="text-paw-900 font-bold text-lg">Live Pup Scan</h2>
      </div>

      {/* Camera viewport */}
      <div
        className={`rounded-2xl overflow-hidden bg-[#1c1410] min-h-52 flex items-center justify-center relative transition-shadow duration-300 ${
          cameraActive && !isPaused
            ? "ring-2 ring-caramel-400/30"
            : ""
        }`}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full max-h-72 object-cover ${cameraActive ? "block" : "hidden"}`}
        />

        {!cameraActive && !error && (
          <div className="text-center py-10 px-6 select-none">
            <span
              className="text-5xl mb-3 block opacity-40"
              aria-hidden="true"
            >
              📷
            </span>
            <p className="text-white/60 text-sm font-medium">Camera off</p>
            <p className="text-white/40 text-xs mt-1">
              Press Start Live Scan below
            </p>
          </div>
        )}

        {error && (
          <div className="text-center py-8 px-6">
            <span className="text-4xl mb-3 block" aria-hidden="true">
              ⚠️
            </span>
            <p className="text-white/80 text-sm leading-relaxed">{error}</p>
          </div>
        )}

        {/* Status badge (top-left) */}
        {cameraActive && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm rounded-full px-2.5 py-1">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                locked
                  ? "bg-green-400"
                  : isPaused
                  ? "bg-yellow-400"
                  : "bg-red-500 animate-pulse"
              }`}
            />
            <span className="text-white text-[11px] font-semibold tracking-wide">
              {locked ? "IDENTIFIED" : isPaused ? "PAUSED" : "LIVE"}
            </span>
          </div>
        )}

        {/* Paused overlay */}
        {isPaused && cameraActive && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center pointer-events-none">
            <div className="bg-black/60 backdrop-blur-sm rounded-2xl px-5 py-3">
              <p className="text-white/90 text-sm font-semibold">
                Scanning paused
              </p>
            </div>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
      </div>

      {/* Live copy */}
      {cameraActive && (
        <p className="mt-3 text-center text-sm text-warm-gray font-medium min-h-5">
          {locked
            ? "Got a clear match! Tap Scan Again to check another dog."
            : isPaused
            ? "Paused — tap Resume to continue scanning"
            : liveCopy}
        </p>
      )}

      {/* Controls */}
      <div className="mt-4 space-y-3">
        {!cameraActive && (
          <button
            onClick={startCamera}
            className="w-full bg-paw-700 text-white rounded-2xl py-3 font-bold text-sm flex items-center justify-center gap-2 hover:bg-paw-800 active:scale-[0.98] transition-all shadow-sm shadow-paw-700/20"
          >
            <span aria-hidden="true">📷</span>
            Start Live Scan
          </button>
        )}

        {cameraActive && (
          <div className="flex gap-3">
            <button
              onClick={stopCamera}
              className="px-4 py-3 rounded-2xl border border-cream-dark text-warm-gray text-sm font-medium hover:bg-cream hover:text-paw-700 active:scale-[0.97] transition-all"
            >
              Stop
            </button>
            {locked ? (
              <button
                onClick={scanAgain}
                className="flex-1 bg-caramel-500 text-white rounded-2xl py-3 font-bold text-sm flex items-center justify-center gap-2 hover:bg-caramel-600 active:scale-[0.98] transition-all shadow-sm shadow-caramel-500/30"
              >
                <span aria-hidden="true">🐾</span>
                Scan Again
              </button>
            ) : isPaused ? (
              <button
                onClick={resumeScanning}
                className="flex-1 bg-caramel-500 text-white rounded-2xl py-3 font-bold text-sm flex items-center justify-center gap-2 hover:bg-caramel-600 active:scale-[0.98] transition-all shadow-sm shadow-caramel-500/30"
              >
                <span aria-hidden="true">▶</span>
                Resume Scanning
              </button>
            ) : (
              <button
                onClick={pauseScanning}
                className="flex-1 bg-paw-700/90 text-white rounded-2xl py-3 font-bold text-sm flex items-center justify-center gap-2 hover:bg-paw-700 active:scale-[0.98] transition-all shadow-sm shadow-paw-700/20"
              >
                <span aria-hidden="true">⏸</span>
                Pause Scanning
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
