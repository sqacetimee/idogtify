"""
Dog detection stage.

TODO: Replace mock detector with YOLOv8, RT-DETR, or a detection model
      fine-tuned on the Stanford Dogs bounding-box annotations.
      Steps when real model is available:
        1. Load model once in __init__ via torch.hub or ultralytics.YOLO().
        2. Resize + pad image to model input size.
        3. Run forward pass, filter class = "dog", keep highest-confidence box.
        4. Return real bbox for downstream crop.
        5. Support multiple dogs (return list of DetectionResult later).
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional

import numpy as np

if TYPE_CHECKING:
    from PIL.Image import Image as PILImage


@dataclass
class BoundingBox:
    x1: int
    y1: int
    x2: int
    y2: int

    def area(self) -> int:
        return max(0, self.x2 - self.x1) * max(0, self.y2 - self.y1)


@dataclass
class DetectionResult:
    dog_detected: bool
    detection_confidence: float   # 0.0–1.0
    bbox: Optional[BoundingBox]   # pixel coords in original image
    message: str


class DogDetector:
    """
    Mock dog detector.  Estimates whether the image likely contains a dog
    using pixel-level variation heuristics — organic subjects (fur, texture)
    produce higher local contrast than blank backgrounds or solid colours.

    A real detector (YOLO/RT-DETR) would replace detect() entirely; the
    BoundingBox / DetectionResult contract stays the same.
    """

    # Minimum variation score to declare a dog present
    _VARIATION_THRESHOLD = 0.05

    def detect(self, image: "PILImage") -> DetectionResult:
        arr = np.array(image.resize((64, 64)), dtype=np.float32)
        r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
        brightness = (r + g + b) / 3.0

        brightness_std = float(np.std(brightness))
        colour_std = float(np.mean([np.std(r), np.std(g), np.std(b)]))
        variation_score = min((brightness_std + colour_std) / 100.0, 1.0)

        w, h = image.size
        size_ok = w >= 32 and h >= 32

        if not size_ok or variation_score < self._VARIATION_THRESHOLD:
            return DetectionResult(
                dog_detected=False,
                detection_confidence=0.05,
                bbox=None,
                message="No dog detected — try a clearer photo with good lighting.",
            )

        # Confidence scales with how much natural variation the image shows.
        # Range: 0.55 (minimal variation) → 0.97 (rich organic texture).
        confidence = round(min(0.55 + 0.42 * variation_score, 0.97), 3)

        # Mock bbox: assume dog fills ~90% of the frame (typical for pet photos).
        # A real detector provides the true tight bbox.
        mx, my = int(w * 0.05), int(h * 0.05)
        bbox = BoundingBox(x1=mx, y1=my, x2=w - mx, y2=h - my)

        return DetectionResult(
            dog_detected=True,
            detection_confidence=confidence,
            bbox=bbox,
            message="Dog detected.",
        )
