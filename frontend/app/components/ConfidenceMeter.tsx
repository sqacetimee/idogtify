"use client";

type Props = {
  confidence: "high" | "medium" | "low";
  probability?: number;
};

const CONFIG = {
  high: {
    label: "High confidence",
    bars: 3,
    barColor: "bg-green-400",
    textColor: "text-green-700",
    bg: "bg-green-50",
    border: "border-green-200",
  },
  medium: {
    label: "Medium confidence",
    bars: 2,
    barColor: "bg-amber-400",
    textColor: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
  low: {
    label: "Low confidence",
    bars: 1,
    barColor: "bg-orange-400",
    textColor: "text-orange-700",
    bg: "bg-orange-50",
    border: "border-orange-200",
  },
} as const;

export default function ConfidenceMeter({ confidence, probability }: Props) {
  const cfg = CONFIG[confidence];
  const pct = probability !== undefined ? Math.round(probability * 100) : null;

  return (
    <div
      className={`inline-flex items-center gap-2.5 px-3 py-2 rounded-xl border ${cfg.bg} ${cfg.border}`}
    >
      {/* Signal-strength bars */}
      <div className="flex gap-1 items-end h-4" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`w-1.5 rounded-sm ${
              i < cfg.bars ? cfg.barColor : "bg-gray-200"
            }`}
            style={{ height: `${(i + 1) * 33}%` }}
          />
        ))}
      </div>
      <span className={`text-xs font-semibold ${cfg.textColor}`}>
        {cfg.label}
        {pct !== null && <span className="opacity-70"> · {pct}%</span>}
      </span>
    </div>
  );
}
