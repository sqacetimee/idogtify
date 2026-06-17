"use client";

import { useState } from "react";

const FAQS = [
  {
    q: "How does iDogtify identify my dog's breed?",
    a: "iDogtify uses a ConvNeXt-Small deep learning model fine-tuned on the Stanford Dogs dataset. When you upload or scan a photo, the model looks at visual features like ear shape, muzzle length, coat texture, body proportions, and colour pattern, then compares them against 120 breed profiles. Each breed gets a probability score and the top matches are shown.",
  },
  {
    q: "How accurate is it?",
    a: "The model achieves 90.9% top-1 accuracy on the Stanford Dogs benchmark, meaning it gets the correct breed as the top result about 9 times out of 10 for purebred dogs. Accuracy is highest when the photo is clear and well-lit with the dog's face and body visible. Mixed breeds, unusual angles, and poor lighting will lower confidence.",
  },
  {
    q: "Does it work for mixed breeds?",
    a: "Yes. iDogtify shows a probability spread across the top breed matches rather than forcing a single answer. If your dog is a mix, you'll typically see multiple breeds listed with percentages. A result like \"Golden Retriever 52% and Border Collie 28%\" is the model's best guess at the mix.",
  },
  {
    q: "My dog's breed isn't listed. What will I get?",
    a: "The model is trained on 120 AKC-recognized breeds from the Stanford Dogs dataset, so designer and hybrid breeds like Goldendoodle, Labradoodle, and American Pocket Bully aren't included. iDogtify returns the closest matching recognized breed instead. A Pocket Bully will likely match to American Staffordshire Terrier or Staffordshire Bull Terrier, and a Goldendoodle will likely match to Golden Retriever or Standard Poodle.",
  },
  {
    q: "What makes a good photo?",
    a: "Use a clear, well-lit photo showing your dog's face and ideally their full body. The dog should be the main subject. Avoid busy backgrounds or photos where the dog is far away. Front-facing photos work best. In Live Scan mode, bring your dog close to the camera so the model has enough detail.",
  },
  {
    q: "Is iDogtify free?",
    a: "Yes, completely free. No account, no sign-up, no limits.",
  },
];

function PawIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="currentColor" aria-hidden="true">
      <ellipse cx="50" cy="67" rx="22" ry="18" />
      <ellipse cx="23" cy="44" rx="10" ry="13" />
      <ellipse cx="39" cy="30" rx="10" ry="13" />
      <ellipse cx="61" cy="30" rx="10" ry="13" />
      <ellipse cx="77" cy="44" rx="10" ry="13" />
    </svg>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-cream-dark last:border-b-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 py-4 px-5 text-left hover:bg-caramel-100/40 transition-colors focus-visible:outline-2 focus-visible:outline-caramel-500"
        aria-expanded={open}
      >
        <span className="font-semibold text-sm text-paw-900">{q}</span>
        <svg
          viewBox="0 0 20 20"
          className={`w-4 h-4 text-warm-gray shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="currentColor"
          aria-hidden="true"
        >
          <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>
      {open && (
        <div className="px-5 pb-5">
          <p className="text-sm text-warm-gray leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}

export default function FAQ() {
  return (
    <section className="px-4 sm:px-6 py-4 max-w-5xl mx-auto">
      <div className="bg-white rounded-3xl shadow-card border border-cream-dark overflow-hidden">
        <div className="px-5 py-4 border-b border-cream-dark flex items-center gap-3">
          <PawIcon className="w-5 h-5 text-caramel-400 shrink-0" />
          <h2 className="font-bold text-paw-900 text-base">Frequently Asked Questions</h2>
        </div>
        {FAQS.map((item) => (
          <FAQItem key={item.q} q={item.q} a={item.a} />
        ))}
      </div>
    </section>
  );
}
