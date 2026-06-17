import HeroSection from "@/app/components/HeroSection";
import MainApp from "@/app/components/MainApp";
import BreedTab from "@/app/components/BreedTab";
import FAQ from "@/app/components/FAQ";
import MLDisclaimer from "@/app/components/MLDisclaimer";
import Reveal from "@/app/components/Reveal";

function PawIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 100 100" className={className} style={style} fill="currentColor" aria-hidden="true">
      <ellipse cx="50" cy="67" rx="22" ry="18" />
      <ellipse cx="23" cy="44" rx="10" ry="13" />
      <ellipse cx="39" cy="30" rx="10" ry="13" />
      <ellipse cx="61" cy="30" rx="10" ry="13" />
      <ellipse cx="77" cy="44" rx="10" ry="13" />
    </svg>
  );
}

/* Fixed paw columns on left + right — visible on lg screens and wider. */
function SidePaws() {
  return (
    <>
      <div
        className="fixed top-0 left-0 h-full pointer-events-none hidden lg:flex flex-col justify-around items-center w-14 z-0"
        aria-hidden="true"
      >
        <PawIcon className="w-8 h-8 text-caramel-400 opacity-30" style={{ rotate: "-18deg" }} />
        <PawIcon className="w-6 h-6 text-caramel-300 opacity-25" style={{ rotate: "12deg" }} />
        <PawIcon className="w-9 h-9 text-caramel-400 opacity-22" style={{ rotate: "-32deg" }} />
        <PawIcon className="w-7 h-7 text-caramel-300 opacity-28" style={{ rotate: "6deg" }} />
        <PawIcon className="w-5 h-5 text-caramel-400 opacity-25" style={{ rotate: "-48deg" }} />
        <PawIcon className="w-8 h-8 text-caramel-300 opacity-22" style={{ rotate: "22deg" }} />
        <PawIcon className="w-6 h-6 text-caramel-400 opacity-28" style={{ rotate: "-12deg" }} />
      </div>

      <div
        className="fixed top-0 right-0 h-full pointer-events-none hidden lg:flex flex-col justify-around items-center w-14 z-0"
        aria-hidden="true"
      >
        <PawIcon className="w-7 h-7 text-caramel-300 opacity-25" style={{ rotate: "24deg" }} />
        <PawIcon className="w-9 h-9 text-caramel-400 opacity-22" style={{ rotate: "-14deg" }} />
        <PawIcon className="w-5 h-5 text-caramel-300 opacity-30" style={{ rotate: "38deg" }} />
        <PawIcon className="w-8 h-8 text-caramel-400 opacity-25" style={{ rotate: "-28deg" }} />
        <PawIcon className="w-6 h-6 text-caramel-300 opacity-22" style={{ rotate: "10deg" }} />
        <PawIcon className="w-7 h-7 text-caramel-400 opacity-28" style={{ rotate: "-40deg" }} />
        <PawIcon className="w-5 h-5 text-caramel-300 opacity-25" style={{ rotate: "18deg" }} />
      </div>
    </>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-cream overflow-x-hidden">
      <SidePaws />
      <HeroSection />
      <MainApp />
      <Reveal><BreedTab /></Reveal>
      <Reveal><FAQ /></Reveal>
      <Reveal><MLDisclaimer /></Reveal>
    </div>
  );
}
