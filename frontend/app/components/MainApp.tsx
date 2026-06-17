"use client";

import { useState, useCallback, useRef } from "react";
import type { PredictionResult, Mode } from "@/app/types/prediction";
import { predictImage } from "@/app/lib/predictionClient";
import UploadCard from "./UploadCard";
import CameraCard from "./CameraCard";
import ResultsCard from "./ResultsCard";
import DogMascot, { type MascotState } from "./DogMascot";

export default function MainApp() {
  const [mode, setMode] = useState<Mode>("upload");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [inputHovered, setInputHovered] = useState(false);
  const [celebrateKey, setCelebrateKey] = useState(0);
  const resultsRef = useRef<HTMLDivElement>(null);

  /* Bump celebrateKey once for a confident, unambiguous match. */
  const maybeCelebrate = useCallback((prediction: PredictionResult) => {
    if (prediction.confidence === "high" && !prediction.mixed_breed_likely) {
      setCelebrateKey((k) => k + 1);
    }
  }, []);

  /* ── Upload mode: user picks a file and taps Dogtify ── */
  const handlePredict = useCallback(async (file: File) => {
    setIsLoading(true);
    setResult(null);
    setInputHovered(false);
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 120);
    try {
      const prediction = await predictImage(file);
      setResult(prediction);
      maybeCelebrate(prediction);
    } finally {
      setIsLoading(false);
    }
  }, [maybeCelebrate]);

  /* ── Live camera mode: CameraCard reports results directly ── */
  const handleLiveResult = useCallback((result: PredictionResult) => {
    setResult(result);
  }, []);

  const handleLiveLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  /* Fired once, the instant a live scan locks onto a confident match. */
  const handleLiveLocked = useCallback((result: PredictionResult) => {
    maybeCelebrate(result);
  }, [maybeCelebrate]);

  /* ── Mode toggle — reset state so the UI starts fresh ── */
  const switchMode = useCallback((next: Mode) => {
    setMode(next);
    setResult(null);
    setIsLoading(false);
    setInputHovered(false);
  }, []);

  /*
   * Derive Scout's state from the app state machine.
   * Priority: loading > low-confidence > results > hover > idle
   */
  const mascotState: MascotState = isLoading
    ? "loading"
    : result?.confidence === "low"
    ? "lowConfidence"
    : result !== null
    ? "results"
    : inputHovered
    ? "hover"
    : "idle";

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      {/* Mode toggle */}
      <div className="flex justify-center mb-4 sm:mb-5">
        <div
          className="bg-cream-dark p-1 rounded-2xl inline-flex gap-1"
          role="tablist"
          aria-label="Input mode"
        >
          <ModeButton
            active={mode === "upload"}
            onClick={() => switchMode("upload")}
            emoji="📸"
            label="Upload Your Pup"
            shortLabel="Upload"
          />
          <ModeButton
            active={mode === "camera"}
            onClick={() => switchMode("camera")}
            emoji="📷"
            label="Live Pup Scan"
            shortLabel="Camera"
          />
        </div>
      </div>

      {/* Scout mascot strip */}
      <DogMascot state={mascotState} className="mb-2" />

      {/* Card grid — single column on mobile, side-by-side on lg */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 items-start">
        {/*
         * Input card wrapper — hover here drives Scout into "hover" state.
         * Only takes effect when Scout is otherwise idle.
         */}
        <div
          key={mode}
          onMouseEnter={() => setInputHovered(true)}
          onMouseLeave={() => setInputHovered(false)}
          className="animate-fade-in-up"
        >
          {mode === "upload" ? (
            <UploadCard onPredict={handlePredict} isLoading={isLoading} />
          ) : (
            <CameraCard
              onResult={handleLiveResult}
              onLoadingChange={handleLiveLoading}
              onLocked={handleLiveLocked}
            />
          )}
        </div>

        <div ref={resultsRef}>
          <ResultsCard result={result} isLoading={isLoading} celebrateKey={celebrateKey} />
        </div>
      </div>
    </main>
  );
}

/* ── Mode toggle button ─────────────────────────────────────────────────── */

function ModeButton({
  active,
  onClick,
  emoji,
  label,
  shortLabel,
}: {
  active: boolean;
  onClick: () => void;
  emoji: string;
  label: string;
  shortLabel: string;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`px-4 sm:px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-2 focus-visible:outline-caramel-500 ${
        active
          ? "bg-white text-paw-700 shadow-sm shadow-paw-700/10"
          : "text-warm-gray hover:text-paw-700"
      }`}
    >
      <span className="mr-1.5" aria-hidden="true">
        {emoji}
      </span>
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">{shortLabel}</span>
    </button>
  );
}
