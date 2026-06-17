"use client";

import { useEffect, useState } from "react";
import type { Prediction } from "@/app/types/prediction";
import { getBreedLabel, getBreedNick } from "@/app/lib/breedNames";

type Props = Prediction & { rank: number };

export default function BreedBar({ breed, probability, rank }: Props) {
  const [width, setWidth] = useState(0);
  const pct = Math.round(probability * 100);
  const isTop = rank === 0;
  const label = getBreedLabel(breed);
  const nick = getBreedNick(breed);

  useEffect(() => {
    const timer = setTimeout(() => setWidth(pct), 80 + rank * 130);
    return () => clearTimeout(timer);
  }, [pct, rank]);

  return (
    <div
      className={`rounded-xl px-3 py-2.5 -mx-3 transition-colors ${
        isTop ? "bg-caramel-100/60" : "opacity-80"
      }`}
    >
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {isTop && (
            <span className="shrink-0 text-[10px] font-bold bg-caramel-500 text-white rounded-full px-2 py-0.5 tracking-wide uppercase">
              Top
            </span>
          )}
          <span
            className={`text-sm truncate ${
              isTop
                ? "font-semibold text-paw-900"
                : "font-medium text-paw-800"
            }`}
          >
            {label}
          </span>
          {nick && (
            <span className="shrink-0 text-xs text-warm-gray font-medium hidden sm:inline">
              · {nick}
            </span>
          )}
        </div>
        <span
          className={`shrink-0 ml-2 text-sm font-bold ${
            isTop ? "text-paw-700" : "text-paw-500"
          }`}
        >
          {pct}%
        </span>
      </div>

      <div className="h-3 bg-cream-dark rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${width}%`,
            background: isTop
              ? "linear-gradient(to right, #d4956a, #7c4a1e)"
              : "linear-gradient(to right, #ebbf98, #c4845a)",
          }}
        />
      </div>
    </div>
  );
}
