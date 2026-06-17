"use client";

import { useMemo } from "react";

/* Warm-palette colours for the burst — paws + sparkles */
const COLORS = ["#D4956A", "#E0A97C", "#7C4A1E", "#B8784A", "#8B7FE8"];
const VARIANTS = [1, 2, 3, 4] as const;

type Piece = {
  left: number;
  delay: number;
  size: number;
  color: string;
  variant: (typeof VARIANTS)[number];
  isSparkle: boolean;
};

function makePieces(count: number): Piece[] {
  return Array.from({ length: count }, () => ({
    left: 4 + Math.random() * 92,
    delay: Math.random() * 0.25,
    size: 10 + Math.random() * 8,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    variant: VARIANTS[Math.floor(Math.random() * VARIANTS.length)],
    isSparkle: Math.random() < 0.35,
  }));
}

/*
 * Brief celebratory burst of paw prints + sparkles, shown over a confident
 * result. Purely decorative — hidden entirely under prefers-reduced-motion.
 */
export default function ConfettiBurst() {
  const pieces = useMemo(() => makePieces(16), []);

  return (
    <div
      className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none motion-reduce:hidden"
      aria-hidden="true"
    >
      {pieces.map((p, i) =>
        p.isSparkle ? (
          <span
            key={i}
            className={`absolute font-bold confetti-piece-${p.variant}`}
            style={{
              left: `${p.left}%`,
              top: "6%",
              color: p.color,
              fontSize: p.size,
              animationDelay: `${p.delay}s`,
            }}
          >
            ✦
          </span>
        ) : (
          <svg
            key={i}
            viewBox="0 0 100 100"
            fill="currentColor"
            className={`absolute confetti-piece-${p.variant}`}
            style={{
              left: `${p.left}%`,
              top: "6%",
              color: p.color,
              width: p.size,
              height: p.size,
              animationDelay: `${p.delay}s`,
            }}
          >
            <ellipse cx="50" cy="67" rx="22" ry="18" />
            <ellipse cx="23" cy="44" rx="10" ry="13" />
            <ellipse cx="39" cy="30" rx="10" ry="13" />
            <ellipse cx="61" cy="30" rx="10" ry="13" />
            <ellipse cx="77" cy="44" rx="10" ry="13" />
          </svg>
        )
      )}
    </div>
  );
}
