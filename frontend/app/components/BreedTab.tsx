"use client";

import { useState } from "react";
import { ALL_BREEDS } from "@/app/lib/breedNames";

export default function BreedTab() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? ALL_BREEDS.filter(
        (b) =>
          b.label.toLowerCase().includes(query.toLowerCase()) ||
          b.nick?.toLowerCase().includes(query.toLowerCase())
      )
    : ALL_BREEDS;

  return (
    <div className="px-4 sm:px-6 max-w-5xl mx-auto mb-1">
      {/* Trigger */}
      <button
        onClick={() => { setOpen((v) => !v); setQuery(""); }}
        className="flex items-center gap-1.5 text-xs font-semibold text-paw-600 hover:text-paw-800 transition-colors"
        aria-expanded={open}
      >
        <svg viewBox="0 0 100 100" className="w-3.5 h-3.5 text-caramel-400 shrink-0" fill="currentColor" aria-hidden="true">
          <ellipse cx="50" cy="67" rx="22" ry="18" />
          <ellipse cx="23" cy="44" rx="10" ry="13" />
          <ellipse cx="39" cy="30" rx="10" ry="13" />
          <ellipse cx="61" cy="30" rx="10" ry="13" />
          <ellipse cx="77" cy="44" rx="10" ry="13" />
        </svg>
        See all {ALL_BREEDS.length} detectable breeds
        <svg
          viewBox="0 0 20 20"
          className={`w-3 h-3 text-warm-gray transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="currentColor"
          aria-hidden="true"
        >
          <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Expanded panel */}
      {open && (
        <div className="mt-2 bg-white/90 backdrop-blur-sm border border-cream-dark rounded-2xl p-4 shadow-card">
          {/* Search */}
          <div className="relative mb-3">
            <svg
              viewBox="0 0 20 20"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-warm-gray pointer-events-none"
              fill="currentColor"
              aria-hidden="true"
            >
              <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search breeds…"
              className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-cream-dark bg-cream text-paw-800 placeholder-warm-gray-light focus:outline-2 focus:outline-caramel-400"
              aria-label="Search breeds"
            />
          </div>

          <p className="text-[11px] text-warm-gray mb-3 leading-relaxed">
            Based on Stanford Dogs. Designer breeds (Goldendoodle, Pocket Bully, Labradoodle, etc.)
            aren&apos;t included — they&apos;ll match to the closest recognized breed.
          </p>

          {filtered.length === 0 ? (
            <p className="text-xs text-warm-gray text-center py-4">No breeds match &ldquo;{query}&rdquo;</p>
          ) : (
            <div className="columns-1 sm:columns-3 lg:columns-4 gap-x-6">
              {filtered.map(({ model, label, nick }) => (
                <div key={model} className="break-inside-avoid mb-1.5">
                  <span className="text-[11px] text-paw-800 font-medium leading-snug">
                    {label}
                    {nick && <span className="text-warm-gray"> · {nick}</span>}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
