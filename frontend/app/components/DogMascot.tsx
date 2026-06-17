"use client";

import { useCallback, useEffect, useState } from "react";

/*
 * Play a dog bark.
 * Tries /woof.mp3 from the public folder first — drop any bark .mp3 there
 * and it will be used automatically. Falls back to a synthesised bark if the
 * file is missing or the browser blocks autoplay.
 */
async function playBark(): Promise<void> {
  // ── Try real audio file ──────────────────────────────────────────────────
  try {
    const audio = new Audio("/woof.mp3");
    audio.volume = 0.75;
    await audio.play();
    return;
  } catch {
    /* File missing or autoplay blocked — fall through to synthesis. */
  }

  // ── Synthesised fallback ─────────────────────────────────────────────────
  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    const woof = (t: number, baseFreq: number) => {
      const dur = 0.22;

      /* Sawtooth oscillator swept downward */
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(baseFreq * 1.6, t);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.38, t + dur);

      /* Soft-clip distortion to break up the clean electronic tone */
      const shaper = ctx.createWaveShaper();
      const curve = new Float32Array(256);
      for (let i = 0; i < 256; i++) {
        const x = (i * 2) / 256 - 1;
        curve[i] = (Math.PI + 180) * x / (Math.PI + 180 * Math.abs(x));
      }
      shaper.curve = curve;
      shaper.oversample = "2x";

      /* Bandpass formant filter — shapes the vowel quality of the bark */
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.setValueAtTime(900, t);
      bp.frequency.exponentialRampToValueAtTime(280, t + dur);
      bp.Q.value = 2.5;

      /* Volume envelope: fast attack, medium decay */
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.65, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

      osc.connect(shaper);
      shaper.connect(bp);
      bp.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.01);

      /* Noise burst at attack for the "w" consonant at the start of "woof" */
      const nbuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.045), ctx.sampleRate);
      const nd   = nbuf.getChannelData(0);
      for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

      const noise = ctx.createBufferSource();
      noise.buffer = nbuf;

      const nf = ctx.createBiquadFilter();
      nf.type = "lowpass";
      nf.frequency.value = 1400;

      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.28, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.045);

      noise.connect(nf); nf.connect(ng); ng.connect(ctx.destination);
      noise.start(t);
      noise.stop(t + 0.045);
    };

    woof(now,        200);
    woof(now + 0.30, 180); // second bark, slightly lower pitch
  } catch {
    /* Silently fail — bark is cosmetic. */
  }
}

/* ── Public type — imported by MainApp ─────────────────────────────────── */
export type MascotState =
  | "idle"
  | "hover"
  | "loading"
  | "results"
  | "lowConfidence";

type Props = {
  state: MascotState;
  className?: string;
};

/* Speech bubble copy per state (undefined = no bubble) */
const SPEECH: Partial<Record<MascotState, string>> = {
  hover: "Got a pup for me? 👀",
  loading: "Scout is sniffing…",
  results: "Found a match! 🐾",
  lowConfidence: "Hmm… try a clearer photo?",
};

/*
 * Horizontal position of Scout within the strip as a CSS `left` percentage.
 * During loading the value is the base; the run-x animation oscillates around it.
 */
const LEFT: Record<MascotState, number> = {
  idle: 14,
  hover: 18,
  loading: 40,
  results: 64,
  lowConfidence: 14,
};

/* ── Main export ────────────────────────────────────────────────────────── */

export default function DogMascot({ state, className }: Props) {
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [woofing, setWoofing] = useState(false);

  useEffect(() => {
    const text = SPEECH[state];
    if (!text) return;
    const t = setTimeout(() => setBubbleVisible(true), 220);
    return () => {
      clearTimeout(t);
      setBubbleVisible(false);
    };
  }, [state]);

  const handleBark = useCallback(() => {
    playBark();
    setWoofing(true);
    setTimeout(() => setWoofing(false), 900);
  }, []);

  const isLoading = state === "loading";
  const isIdle    = state === "idle" || state === "hover";

  return (
    <div
      className={`relative h-28 overflow-visible select-none ${className ?? ""}`}
      aria-hidden="true"
    >
      {/* ── Paw-print trail — loading only ── */}
      {isLoading && (
        <div className="absolute bottom-3 left-[6%] flex gap-4 pointer-events-none">
          {[0, 1, 2].map((i) => (
            <PawPrintSVG
              key={i}
              className="w-5 h-5 text-caramel-300 animate-scout-paw"
              style={{ animationDelay: `${i * 0.45}s` }}
            />
          ))}
        </div>
      )}

      {/* ── Sparkle burst — results only ── */}
      {state === "results" && (
        <div className="absolute bottom-14 right-[26%] flex gap-1 pointer-events-none">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="text-caramel-400 font-bold animate-scout-sparkle"
              style={{ fontSize: 13, animationDelay: `${i * 0.13}s` }}
            >
              ✦
            </span>
          ))}
        </div>
      )}

      {/*
       * Scout outer wrapper — slides horizontally via CSS `left` transition.
       * During loading, overridden by the scout-run-x keyframe.
       */}
      <div
        className="absolute bottom-0 transition-[left] duration-500 ease-in-out"
        style={{
          left: `${LEFT[state]}%`,
          ...(isLoading
            ? { animation: "scout-run-x 2.2s ease-in-out infinite" }
            : {}),
        }}
      >
        {/* Inner wrapper — adds vertical bob + waddle while running */}
        <div
          style={
            isLoading
              ? { animation: "scout-bob 0.44s ease-in-out infinite" }
              : {}
          }
        >
          {/* Idle / hover gentle float */}
          <div className={isIdle ? "animate-scout-idle" : ""}>

            {/* Speech bubble — "Woof!" on click, otherwise state-driven copy */}
            {(woofing || SPEECH[state]) && (
              <SpeechBubble
                text={woofing ? "Woof! 🐾" : SPEECH[state]!}
                visible={woofing || bubbleVisible}
              />
            )}

            {/* Scout — tap to bark */}
            <div
              role="button"
              tabIndex={0}
              aria-label="Pet Scout"
              onClick={handleBark}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleBark(); }}
              className="cursor-pointer"
            >
              <ScoutDog
                state={state}
                className="w-17.5 h-17.5 sm:w-20 sm:h-20 drop-shadow-sm"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Speech bubble ──────────────────────────────────────────────────────── */

function SpeechBubble({ text, visible }: { text: string; visible: boolean }) {
  return (
    <div
      className={`absolute bottom-full mb-2.5 left-1/2 -translate-x-1/2 pointer-events-none whitespace-nowrap transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`}
    >
      <div className="relative bg-white border border-cream-dark rounded-2xl px-3 py-1.5 shadow-card">
        <span className="text-xs font-semibold text-paw-800">{text}</span>
        {/* Downward pointer */}
        <div className="absolute -bottom-1.75 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-b border-r border-cream-dark rotate-45" />
      </div>
    </div>
  );
}

/* ── Scout dog SVG ──────────────────────────────────────────────────────── */
/*
 * Front-facing chibi dog — big round head, large expressive eyes, floppy ears.
 * Draw order (back → front):
 *   tail → body → [head group: ears, head circle, face] → paws
 *
 * The head group wraps ears + head + face so they all tilt together
 * when Scout is in the lowConfidence state.
 *
 * The tail <g> uses CSS standalone `rotate` so it wags independently
 * of any translateX/Y on parent elements.
 */

function ScoutDog({
  state,
  className,
}: {
  state: MascotState;
  className?: string;
}) {
  const isResults       = state === "results";
  const isLowConfidence = state === "lowConfidence";

  return (
    <svg
      viewBox="0 0 90 98"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* ── Tail (peeks from behind right side of body) ── */}
      <g
        style={{ transformOrigin: "63px 76px" }}
        className={isResults ? "animate-scout-wag-fast" : "animate-scout-wag"}
      >
        <path
          d="M63,76 C72,68 80,59 73,51"
          stroke="#D4956A"
          strokeWidth="10"
          strokeLinecap="round"
        />
        {/* Subtle shading on tail */}
        <path
          d="M63,76 C72,68 80,59 73,51"
          stroke="#B8784A"
          strokeWidth="10"
          strokeLinecap="round"
          opacity="0.2"
        />
      </g>

      {/* ── Body ── */}
      <ellipse cx="45" cy="83" rx="22" ry="13" fill="#D4956A" />
      <ellipse cx="45" cy="87" rx="17" ry="8"  fill="#B8784A" opacity="0.16" />

      {/*
       * ── HEAD GROUP ──
       * Wraps both ears + head + all face details so the whole head tilts
       * together during lowConfidence. Transform origin ≈ centre of the face.
       */}
      <g
        style={{ transformOrigin: "45px 50px" }}
        className={isLowConfidence ? "animate-scout-tilt" : ""}
      >
        {/* Left ear — drawn before head circle so head covers attachment */}
        <ellipse
          cx="19"
          cy="60"
          rx="11.5"
          ry="23"
          fill="#7C4A1E"
          transform="rotate(-8 19 60)"
        />
        <ellipse
          cx="19"
          cy="62"
          rx="6.5"
          ry="15"
          fill="#C27B40"
          opacity="0.26"
          transform="rotate(-8 19 62)"
        />

        {/* Right ear */}
        <ellipse
          cx="71"
          cy="60"
          rx="11.5"
          ry="23"
          fill="#7C4A1E"
          transform="rotate(8 71 60)"
        />
        <ellipse
          cx="71"
          cy="62"
          rx="6.5"
          ry="15"
          fill="#C27B40"
          opacity="0.26"
          transform="rotate(8 71 62)"
        />

        {/* Head circle — drawn over ear tops, creating a clean attachment */}
        <circle cx="45" cy="42" r="29" fill="#E8A870" />

        {/* Soft forehead highlight */}
        <ellipse cx="43" cy="36" rx="19" ry="16" fill="#F2CA82" opacity="0.48" />

        {/* ── Left eye ── white sclera + big dark pupil + shine */}
        <circle cx="33" cy="41" r="9"   fill="white" />
        <circle cx="33" cy="41" r="6"   fill="#1A0D00" />
        <circle cx="35.5" cy="38.5" r="2.3" fill="white" />

        {/* ── Right eye ── */}
        <circle cx="57" cy="41" r="9"   fill="white" />
        <circle cx="57" cy="41" r="6"   fill="#1A0D00" />
        <circle cx="59.5" cy="38.5" r="2.3" fill="white" />

        {/* ── White muzzle ── */}
        <ellipse cx="45" cy="57" rx="16" ry="12" fill="#FFF2E4" />

        {/* ── Cheek blush ── */}
        <ellipse cx="23" cy="55" rx="7"   ry="4.5" fill="#E87878" opacity="0.24" />
        <ellipse cx="67" cy="55" rx="7"   ry="4.5" fill="#E87878" opacity="0.24" />

        {/* ── Nose ── */}
        <ellipse cx="45" cy="53" rx="5.5" ry="4"   fill="#1A0D00" />

        {/* ── Mouth — happy smile or worried frown ── */}
        {isLowConfidence ? (
          <path
            d="M38,63 Q45,58 52,63"
            stroke="#7B4013"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
        ) : (
          <path
            d="M37,62 Q45,69 53,62"
            stroke="#7B4013"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
        )}
      </g>
      {/* end head group */}

      {/* ── Front paws ── */}
      <rect x="27" y="89" width="12" height="9" rx="6"   fill="#D4956A" />
      <rect x="51" y="89" width="12" height="9" rx="6"   fill="#C4845A" />
      <ellipse cx="33"   cy="97" rx="7.5" ry="3.5" fill="#B8784A" />
      <ellipse cx="57"   cy="97" rx="7.5" ry="3.5" fill="#A86A3A" />
    </svg>
  );
}

/* ── Tiny paw print for the loading trail ───────────────────────────────── */

function PawPrintSVG({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      style={style}
      fill="currentColor"
      aria-hidden="true"
    >
      <ellipse cx="50" cy="67" rx="22" ry="18" />
      <ellipse cx="23" cy="44" rx="10" ry="13" />
      <ellipse cx="39" cy="30" rx="10" ry="13" />
      <ellipse cx="61" cy="30" rx="10" ry="13" />
      <ellipse cx="77" cy="44" rx="10" ry="13" />
    </svg>
  );
}
