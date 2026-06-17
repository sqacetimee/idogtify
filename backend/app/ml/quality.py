"""
Image quality scoring.

Produces a quality_score in [0, 1] from brightness, sharpness, image size,
and aspect ratio.  The score feeds into HybridBreedScorer and
confidence calibration so low-quality images are appropriately hedged.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING

import numpy as np

if TYPE_CHECKING:
    from PIL.Image import Image as PILImage


@dataclass
class QualityResult:
    quality_score: float          # 0.0–1.0 composite
    quality_label: str            # "poor" | "fair" | "good"
    warnings: list[str] = field(default_factory=list)


class ImageQualityAnalyzer:
    """
    Scores an image across four dimensions and returns a composite quality
    score with human-readable warnings for the UI.

    Thresholds:
      good  ≥ 0.65
      fair  ≥ 0.40
      poor  < 0.40
    """

    def analyze(self, image: "PILImage") -> QualityResult:
        arr = np.array(image.resize((128, 128)), dtype=np.float32)
        r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
        brightness = (r + g + b) / 3.0
        warnings: list[str] = []

        # ── 1. Brightness (35 % weight) ───────────────────────────────────
        mean_b = float(brightness.mean())
        if mean_b < 40:
            b_score = mean_b / 40.0
            warnings.append("Image may be too dark.")
        elif mean_b > 230:
            b_score = max(0.5, 1.0 - (mean_b - 230) / 50.0)
            warnings.append("Image may be overexposed.")
        else:
            # Peak comfort zone ~115–145
            b_score = max(0.4, 1.0 - abs(mean_b - 130) / 130.0)

        # ── 2. Sharpness / blur (40 % weight) ────────────────────────────
        # Laplacian variance proxy: sum of horizontal + vertical gradient variance.
        h_diff = np.diff(brightness, axis=1)
        v_diff = np.diff(brightness, axis=0)
        lap_var = float(np.var(h_diff) + np.var(v_diff))
        # Well-focused pet photos in good light: lap_var ≈ 200–3 000+
        blur_score = min(lap_var / 400.0, 1.0)
        if blur_score < 0.30:
            warnings.append("Image may be blurry.")

        # ── 3. Resolution / size (20 % weight) ───────────────────────────
        w, h = image.size
        min_dim = min(w, h)
        if min_dim < 64:
            size_score = 0.20
            warnings.append("Dog may be too small or unclear.")
        elif min_dim < 224:
            size_score = 0.60 + 0.40 * (min_dim - 64) / 160.0
        else:
            size_score = 1.0

        # ── 4. Aspect ratio sanity (5 % weight) ──────────────────────────
        ratio = max(w, h) / max(min(w, h), 1)
        if ratio > 4.0:
            aspect_score = 0.50
            warnings.append("Try showing your dog's face and body more clearly.")
        else:
            aspect_score = 1.0

        # ── Composite ─────────────────────────────────────────────────────
        quality_score = round(
            min(
                max(
                    0.35 * b_score
                    + 0.40 * blur_score
                    + 0.20 * size_score
                    + 0.05 * aspect_score,
                    0.0,
                ),
                1.0,
            ),
            3,
        )

        if quality_score >= 0.65:
            label = "good"
        elif quality_score >= 0.40:
            label = "fair"
        else:
            label = "poor"

        return QualityResult(
            quality_score=quality_score,
            quality_label=label,
            warnings=warnings,
        )
