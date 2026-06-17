type Props = {
  className?: string;
};

export default function LogoIcon({ className }: Props) {
  return (
    <svg
      viewBox="0 0 110 125"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="iDogtify logo icon"
      role="img"
    >
      {/* ── Scanner frame — 4 rounded L-bracket corners ── */}
      <path
        d="M12,40 L12,14 L36,14"
        stroke="#3D2B1F"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M74,14 L98,14 L98,40"
        stroke="#3D2B1F"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12,88 L12,112 L36,112"
        stroke="#3D2B1F"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M74,112 L98,112 L98,88"
        stroke="#3D2B1F"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* ── Purple sparkle (4-pointed star) ── */}
      <path
        d="M55,12 L57.8,21.5 L67.5,24.2 L57.8,26.9 L55,36.5 L52.2,26.9 L42.5,24.2 L52.2,21.5 Z"
        fill="#8B7FE8"
      />

      {/* ── Left ear ── */}
      <ellipse
        cx="34"
        cy="63"
        rx="13"
        ry="20"
        fill="#7B3810"
        transform="rotate(-10 34 63)"
      />
      <ellipse
        cx="34"
        cy="64"
        rx="8"
        ry="14"
        fill="#B86530"
        opacity="0.5"
        transform="rotate(-10 34 64)"
      />

      {/* ── Right ear ── */}
      <ellipse
        cx="76"
        cy="63"
        rx="13"
        ry="20"
        fill="#9B4E20"
        transform="rotate(10 76 63)"
      />
      <ellipse
        cx="76"
        cy="64"
        rx="8"
        ry="14"
        fill="#D4956A"
        opacity="0.42"
        transform="rotate(10 76 64)"
      />

      {/* ── Head base ── */}
      <circle cx="55" cy="72" r="27" fill="#D4956A" />

      {/* ── Lighter face centre ── */}
      <ellipse cx="55" cy="67" rx="18.5" ry="16" fill="#F0C47A" />

      {/* ── Brown patch over right-eye area ── */}
      <ellipse
        cx="68"
        cy="61"
        rx="13"
        ry="11"
        fill="#9B4E20"
        opacity="0.88"
      />

      {/* ── White muzzle ── */}
      <ellipse cx="55" cy="82" rx="14.5" ry="10" fill="#FFF2E4" />

      {/* ── Left eye ── */}
      <circle cx="44" cy="66" r="5.5" fill="#1A0D00" />
      <circle cx="45.5" cy="64.5" r="1.8" fill="white" />

      {/* ── Right eye (on brown patch) ── */}
      <circle cx="66" cy="63" r="5.5" fill="#1A0D00" />
      <circle cx="67.5" cy="61.5" r="1.8" fill="white" />

      {/* ── Rosy cheeks ── */}
      <ellipse cx="39" cy="75" rx="5" ry="3.5" fill="#E87878" opacity="0.28" />
      <ellipse cx="71" cy="75" rx="5" ry="3.5" fill="#E87878" opacity="0.28" />

      {/* ── Nose ── */}
      <ellipse cx="55" cy="78" rx="4.2" ry="3" fill="#1A0D00" />

      {/* ── Tongue ── */}
      <path
        d="M50,84 Q55,93 60,84 Q58,89 55,90.5 Q52,89 50,84 Z"
        fill="#E87878"
      />

      {/* ── Scan line with purple glow ── */}
      {/* outer glow */}
      <line
        x1="8"
        y1="83"
        x2="102"
        y2="83"
        stroke="#9B8FE8"
        strokeWidth="6"
        strokeLinecap="round"
        opacity="0.15"
      />
      {/* mid glow */}
      <line
        x1="8"
        y1="83"
        x2="102"
        y2="83"
        stroke="#9B8FE8"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.65"
      />
      {/* bright core */}
      <line
        x1="8"
        y1="83"
        x2="102"
        y2="83"
        stroke="#D4CEFA"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.95"
      />
    </svg>
  );
}
