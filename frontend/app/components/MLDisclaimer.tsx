export default function MLDisclaimer() {
  return (
    <footer className="px-4 sm:px-6 pb-10 pt-2 max-w-5xl mx-auto">
      {/* Disclaimer card */}
      <div className="bg-cream border border-cream-dark rounded-2xl px-5 py-4">
        <p className="text-xs text-warm-gray leading-relaxed text-center max-w-2xl mx-auto">
          Our dog breed analysis uses sophisticated AI algorithms that examine
          the uploaded image of your dog. It identifies specific breed-defining
          features such as ear shape, muzzle length, fur pattern, and body size.
          These characteristics are compared against a large database of known
          dog breeds to accurately determine your dog&apos;s breed.
        </p>
      </div>

      {/* Copyright + privacy — outside the card, clearly visible */}
      <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-2 px-1">
        <p className="text-xs text-warm-gray font-medium">
          © {new Date().getFullYear()} iDogtify. All rights reserved.
        </p>
        <p className="text-xs text-warm-gray font-medium flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block shrink-0" />
          Your photos are never stored — processed in memory and discarded immediately.
        </p>
      </div>
    </footer>
  );
}
