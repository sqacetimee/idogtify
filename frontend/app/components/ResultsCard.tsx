"use client";

import { useEffect, useRef, useState } from "react";
import type { PredictionResult } from "@/app/types/prediction";
import { getBreedLabel, getBreedNick } from "@/app/lib/breedNames";
import BreedBar from "./BreedBar";
import ConfidenceMeter from "./ConfidenceMeter";
import ConfettiBurst from "./ConfettiBurst";

const LOADING_MESSAGES = [
  "Dogtifying your photo…",
  "Sniffing out the breed…",
  "Fetching predictions…",
  "Consulting the paw-racle…",
];

/* Ghost bars shown in the empty state to preview what results look like */
const GHOST_WIDTHS = [72, 50, 28];

type Props = {
  result: PredictionResult | null;
  isLoading: boolean;
  /* Incremented by the parent to trigger a one-shot confetti celebration. */
  celebrateKey?: number;
};

export default function ResultsCard({ result, isLoading, celebrateKey = 0 }: Props) {
  const [msgIdx, setMsgIdx] = useState(0);
  const [msgVisible, setMsgVisible] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [shareStatus, setShareStatus] = useState<"idle" | "copied">("idle");
  const [canShare, setCanShare] = useState(false);
  const prevCelebrateRef = useRef(celebrateKey);

  /* Feature-detect Web Share / Clipboard after mount to avoid hydration mismatch. */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only capability check, must run post-mount to match SSR markup
    setCanShare(!!(navigator.share || navigator.clipboard));
  }, []);

  /* Fire a one-shot confetti burst when the parent bumps celebrateKey. */
  useEffect(() => {
    if (celebrateKey === prevCelebrateRef.current) return;
    prevCelebrateRef.current = celebrateKey;
    setShowConfetti(true);
    const timer = setTimeout(() => setShowConfetti(false), 1400);
    return () => clearTimeout(timer);
  }, [celebrateKey]);

  useEffect(() => {
    if (!isLoading) return;
    const interval = setInterval(() => {
      setMsgVisible(false);
      setTimeout(() => {
        setMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length);
        setMsgVisible(true);
      }, 280);
    }, 1500);
    return () => {
      clearInterval(interval);
      setMsgIdx(0);
      setMsgVisible(true);
    };
  }, [isLoading]);

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl p-6 shadow-card border border-cream-dark flex flex-col items-center justify-center min-h-72 text-center transition-transform duration-300 hover:-translate-y-1">
        <span
          className="text-5xl mb-5 block animate-paw-pulse select-none"
          aria-hidden="true"
        >
          🐾
        </span>
        <p
          className="text-paw-700 font-semibold text-base mb-5 transition-opacity duration-300"
          style={{ opacity: msgVisible ? 1 : 0 }}
        >
          {LOADING_MESSAGES[msgIdx]}
        </p>
        <div className="flex gap-2.5" aria-label="Loading">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2.5 h-2.5 rounded-full bg-caramel-500 block animate-bounce-dot"
              style={{ animationDelay: `${i * 0.18}s` }}
            />
          ))}
        </div>
      </div>
    );
  }

  /* ── Empty ── */
  if (!result) {
    return (
      <div className="bg-white rounded-3xl p-6 shadow-card border border-cream-dark flex flex-col items-center justify-center min-h-72 text-center transition-transform duration-300 hover:-translate-y-1">
        {/* Icon */}
        <div
          className="w-16 h-16 rounded-2xl bg-caramel-100 flex items-center justify-center mb-4 shadow-sm"
          aria-hidden="true"
        >
          <span className="text-3xl select-none">🐾</span>
        </div>

        <h3 className="text-paw-900 font-bold text-base mb-1.5">
          No pup detected yet
        </h3>
        <p className="text-warm-gray text-sm max-w-50 leading-relaxed">
          Upload a photo or use the camera to see breed predictions.
        </p>

        {/* Ghost breed bars — visual hint at what results look like */}
        <div
          className="mt-6 w-full max-w-55 space-y-2.5"
          aria-hidden="true"
        >
          <p className="text-[10px] font-bold text-warm-gray-light uppercase tracking-widest mb-3">
            Results appear here
          </p>
          {GHOST_WIDTHS.map((w, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <div className="h-2.5 bg-cream-dark rounded-full flex-1 overflow-hidden">
                <div
                  className="h-full bg-cream-dark/60 rounded-full"
                  style={{ width: `${w}%` }}
                />
              </div>
              <div className="w-6 h-2 bg-cream-dark rounded shrink-0" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── Results ── */
  const isLowConfidence = result.confidence === "low";
  const topPrediction = result.predictions[0];
  const topLabel = topPrediction ? getBreedLabel(topPrediction.breed) : "";
  const topNick = topPrediction ? getBreedNick(topPrediction.breed) : undefined;
  const topPct = topPrediction ? Math.round(topPrediction.probability * 100) : 0;
  const isDemo = result.model_version.includes("mock");

  const handleShare = async () => {
    if (!topPrediction) return;
    const text = `My dog is ${topPct}% ${topLabel}${
      topNick ? ` (${topNick})` : ""
    }! 🐾 via iDogtify`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ text, title: "iDogtify result" });
        return;
      } catch {
        /* user cancelled, or Web Share unsupported — fall back to clipboard */
      }
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
        setShareStatus("copied");
        setTimeout(() => setShareStatus("idle"), 2000);
      } catch {
        /* clipboard unavailable — nothing more we can do */
      }
    }
  };

  return (
    <div className="relative bg-white rounded-3xl p-6 shadow-card border border-cream-dark animate-fade-in-up transition-transform duration-300 hover:-translate-y-1">
      {showConfetti && <ConfettiBurst />}

      {/* Screen-reader announcement of the result */}
      <p className="sr-only" aria-live="polite">
        Top match: {topLabel}, {topPct}% confidence
        {result.mixed_breed_likely ? ", mixed breed likely" : ""}.
      </p>

      {/* Header */}
      <div className="mb-5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-paw-900 font-bold text-lg flex items-center gap-2">
            <span aria-hidden="true">🏆</span>
            Breed Match
          </h2>
          <span
            className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border ${
              result.mixed_breed_likely
                ? "bg-purple-50 text-purple-700 border-purple-200"
                : "bg-caramel-100 text-paw-700 border-caramel-300"
            }`}
          >
            {result.mixed_breed_likely ? "✦ Mixed-breed magic" : "✦ Purebred vibes"}
          </span>
        </div>

        {isDemo && (
          <p className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] font-semibold text-warm-gray bg-cream rounded-full px-3 py-1 border border-cream-dark">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block shrink-0" />
            Demo data — backend offline, showing a sample prediction
          </p>
        )}
      </div>

      {/* Low-confidence warning */}
      {isLowConfidence && (
        <div className="mb-4 bg-orange-50 border border-orange-200 rounded-2xl p-3.5 flex items-start gap-2.5">
          <span className="text-base mt-0.5" aria-hidden="true">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-orange-800">
              iDogtify isn&apos;t quite sure
            </p>
            <p className="text-xs text-orange-700 mt-0.5 leading-relaxed">
              Try a clearer photo of your dog&apos;s face and body for better
              results.
            </p>
          </div>
        </div>
      )}

      {/* Section label */}
      <p className="text-[10px] font-bold text-warm-gray uppercase tracking-widest mb-1">
        {result.mixed_breed_likely ? "Paw-sible breed mix" : "Top breed matches"}
      </p>

      {/* Breed probability bars */}
      <div className="flex flex-col gap-1">
        {result.predictions.map((pred, i) => (
          <BreedBar
            key={pred.breed}
            breed={pred.breed}
            probability={pred.probability}
            rank={i}
          />
        ))}
      </div>

      {/* Breed spotlight — shown when top prediction has metadata */}
      {result.predictions[0]?.metadata && (
        <BreedSpotlight
          breed={result.predictions[0].breed}
          meta={result.predictions[0].metadata}
        />
      )}

      {/* Confidence + note */}
      <div className="mt-5 pt-4 border-t border-cream-dark">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <ConfidenceMeter
            confidence={result.confidence}
            probability={topPrediction?.probability}
          />
          {canShare && (
            <button
              onClick={handleShare}
              className="text-xs font-semibold text-paw-700 bg-caramel-100 hover:bg-caramel-200 rounded-xl px-3 py-2 transition-colors flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-caramel-500"
            >
              {shareStatus === "copied" ? "✅ Copied!" : "🔗 Share"}
            </button>
          )}
        </div>
        <p className="text-[11px] text-warm-gray mt-2 leading-relaxed">
          Our AI identifies breed-defining features to match your dog against a large breed database.
        </p>
      </div>

      {/* Metadata footer */}
      <div className="mt-4 flex items-center justify-between">
        <span className="text-[11px] text-warm-gray-light font-medium">
          ⚡ {result.inference_time_ms}ms inference
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-warm-gray-light font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
          {result.model_version}
        </span>
      </div>
    </div>
  );
}

/* ── Breed spotlight ─────────────────────────────────────────────────────── */

import type { BreedMetadata } from "@/app/types/prediction";

function BreedSpotlight({
  breed,
  meta,
}: {
  breed: string;
  meta: BreedMetadata;
}) {
  const stats = [
    meta.size     && { label: "Size",     value: meta.size },
    meta.origin   && { label: "Origin",   value: meta.origin },
    meta.lifespan && { label: "Lifespan", value: meta.lifespan },
    meta.energy_level && { label: "Energy", value: meta.energy_level },
  ].filter(Boolean) as { label: string; value: string }[];

  const traits = meta.temperament?.split(",").map((t) => t.trim()).slice(0, 4) ?? [];

  return (
    <div className="mt-5 rounded-2xl bg-caramel-100/60 border border-caramel-200/80 p-4">
      <p className="text-[10px] font-bold text-paw-600 uppercase tracking-widest mb-2">
        About the {getBreedLabel(breed)}
      </p>

      {meta.description && (
        <p className="text-xs text-paw-800 leading-relaxed mb-3">
          {meta.description}
        </p>
      )}

      {/* Temperament tags */}
      {traits.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {traits.map((t) => (
            <span
              key={t}
              className="text-[10px] font-semibold bg-white/80 text-paw-700 border border-caramel-300 rounded-full px-2.5 py-0.5"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Stats row */}
      {stats.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {stats.map(({ label, value }) => (
            <div key={label} className="bg-white/70 rounded-xl px-2.5 py-1.5 text-center">
              <p className="text-[9px] font-bold text-warm-gray uppercase tracking-wider">{label}</p>
              <p className="text-[11px] font-semibold text-paw-800 mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Fun fact */}
      {meta.fun_fact && (
        <p className="mt-3 text-[11px] text-warm-gray leading-relaxed border-t border-caramel-200/60 pt-2.5">
          <span className="font-semibold text-paw-700">Did you know? </span>
          {meta.fun_fact}
        </p>
      )}
    </div>
  );
}
