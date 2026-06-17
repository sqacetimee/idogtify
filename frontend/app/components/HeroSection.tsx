import Image from "next/image";

export default function HeroSection() {
  return (
    <header className="relative overflow-hidden pt-10 pb-9 px-4 text-center bg-linear-to-b from-cream via-[#f8edd8] to-[#f0e0c4] border-b border-cream-dark/50">
      {/* Background paw watermarks */}
      <span
        className="pointer-events-none select-none absolute -top-4 -right-4 text-[160px] leading-none opacity-[0.04] rotate-12"
        aria-hidden="true"
      >
        🐾
      </span>
      <span
        className="pointer-events-none select-none absolute bottom-0 -left-4 text-[130px] leading-none opacity-[0.04] -rotate-12"
        aria-hidden="true"
      >
        🐾
      </span>

      {/* Logo lockup — stacked on mobile, horizontal on sm+ */}
      <div className="relative flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-5 mb-4">
        {/* Real logo icon */}
        <Image
          src="/logo-icon.png"
          alt="iDogtify logo"
          width={96}
          height={96}
          priority
          className="w-24 h-24 sm:w-20 sm:h-20 drop-shadow-sm shrink-0"
        />

        {/* Wordmark + primary tagline */}
        <div className="text-center sm:text-left">
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-paw-900 leading-none">
            i<span className="text-caramel-500">Dog</span>tify
          </h1>
          <p className="text-base sm:text-lg font-semibold text-paw-700 mt-2 sm:mt-2.5">
            Identify your pup in seconds.
          </p>
        </div>
      </div>

      {/* Secondary tagline */}
      <p className="text-sm sm:text-base text-warm-gray max-w-xs mx-auto leading-relaxed">
        Snap a pup. Let iDogtify do the sniffing.
      </p>

      {/* Model status badge */}
      <div className="mt-5 inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-cream-dark rounded-full px-4 py-2 shadow-sm">
        <span className="w-2 h-2 rounded-full bg-green-400 shrink-0 shadow-[0_0_6px_rgba(74,222,128,0.6)]" />
        <span className="text-xs font-semibold text-paw-700 tracking-wide">
          <span className="sm:hidden">iDogtify Vision Model</span>
          <span className="hidden sm:inline">iDogtify Vision Model · 120 breeds</span>
        </span>
      </div>
    </header>
  );
}
