import type { PredictionResult } from "@/app/types/prediction";

const _EXPLANATION =
  "Our dog breed analysis uses sophisticated AI algorithms that examine the " +
  "uploaded image of your dog. It identifies specific breed-defining features " +
  "such as ear shape, muzzle length, fur pattern, and body size. These " +
  "characteristics are compared against a large database of known dog breeds " +
  "to accurately determine your dog's breed.";

const MOCK_RESULTS: PredictionResult[] = [
  {
    predictions: [
      { breed: "Golden Retriever", probability: 0.48 },
      { breed: "Labrador Retriever", probability: 0.34 },
      { breed: "Border Collie", probability: 0.12 },
    ],
    mixed_breed_likely: true,
    confidence: "high",
    inference_time_ms: 82,
    model_version: "idogtify-mock-v1",
    explanation: _EXPLANATION,
  },
  {
    predictions: [
      { breed: "French Bulldog", probability: 0.71 },
      { breed: "Boston Terrier", probability: 0.18 },
      { breed: "Pug", probability: 0.08 },
    ],
    mixed_breed_likely: false,
    confidence: "high",
    inference_time_ms: 76,
    model_version: "idogtify-mock-v1",
    explanation: _EXPLANATION,
  },
  {
    predictions: [
      { breed: "Siberian Husky", probability: 0.52 },
      { breed: "Alaskan Malamute", probability: 0.28 },
      { breed: "German Shepherd", probability: 0.14 },
    ],
    mixed_breed_likely: true,
    confidence: "medium",
    inference_time_ms: 91,
    model_version: "idogtify-mock-v1",
    explanation: _EXPLANATION,
  },
  {
    predictions: [
      { breed: "Mixed Breed", probability: 0.38 },
      { breed: "Beagle", probability: 0.24 },
      { breed: "Cocker Spaniel", probability: 0.19 },
    ],
    mixed_breed_likely: true,
    confidence: "low",
    inference_time_ms: 88,
    model_version: "idogtify-mock-v1",
    explanation: _EXPLANATION,
  },
];

function pickRandom(): PredictionResult {
  return MOCK_RESULTS[Math.floor(Math.random() * MOCK_RESULTS.length)];
}

/** Simulates backend latency — used as upload-mode fallback. */
export async function simulatePredict(): Promise<PredictionResult> {
  await new Promise((resolve) =>
    setTimeout(resolve, 2000 + Math.random() * 600)
  );
  return pickRandom();
}

/** Returns a mock result immediately — used as live-camera fallback. */
export function mockPredictImmediate(): PredictionResult {
  return pickRandom();
}
