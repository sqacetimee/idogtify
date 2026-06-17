import type { PredictionResult } from "@/app/types/prediction";
import { mockPredictImmediate, simulatePredict } from "@/app/lib/mockData";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

/**
 * Send an image file to the iDogtify backend for breed prediction.
 * Falls back to mock predictions if the backend is unavailable.
 *
 * @param file - The image file to analyse.
 * @param fastFallback - When true, the mock fallback returns instantly
 *   (no simulated latency). Use for live camera mode so a downed backend
 *   does not freeze the scanning loop.
 */
export async function predictImage(
  file: File,
  fastFallback = false
): Promise<PredictionResult> {
  try {
    const body = new FormData();
    body.append("file", file);

    const res = await fetch(`${BACKEND_URL}/predict`, {
      method: "POST",
      body,
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      throw new Error((payload as { detail?: string }).detail ?? `HTTP ${res.status}`);
    }

    return (await res.json()) as PredictionResult;
  } catch {
    // Backend unavailable or returned an error — use mock fallback.
    return fastFallback ? mockPredictImmediate() : simulatePredict();
  }
}
