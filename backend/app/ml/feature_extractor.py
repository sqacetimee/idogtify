"""
Visual feature extraction.

Produces a deterministic 28-dimensional embedding from an image.
Same image always returns the same vector — suitable for cosine similarity
against breed prototype embeddings.

TODO: Replace with a pretrained backbone:
  - EfficientNet-B3 / ConvNeXt-S (best accuracy for breed classification)
  - MobileNetV3-Large (fastest, good for live camera)
  - CLIP ViT-B/32 (zero-shot capable, rich semantic embeddings)
  Steps:
    1. Load model once in __init__ via timm or torchvision at startup.
    2. Preprocess: resize → centre-crop → normalise (ImageNet mean/std).
    3. Forward pass → extract penultimate layer activations.
    4. L2-normalise the output vector.
    5. The rest of the pipeline (similarity search, scorer) is unchanged.
"""
from __future__ import annotations

from typing import TYPE_CHECKING

import numpy as np
from PIL import Image as PILModule

if TYPE_CHECKING:
    from PIL.Image import Image as PILImage

# Embedding size: 8 bins × 3 channels = 24 colour features + 4 global stats
EMBEDDING_DIM = 28


class FeatureExtractor:
    """
    Extracts a colour-histogram + global-statistics embedding.

    Embedding layout (28 floats, L2-normalised):
      [0:8]   R channel histogram (8 bins, 0–255)
      [8:16]  G channel histogram
      [16:24] B channel histogram
      [24]    Mean brightness   (0–1)
      [25]    Brightness std    (0–2)
      [26]    Sharpness proxy   (0–1)
      [27]    Contrast          (0–2)
    """

    def extract(self, image: "PILImage") -> np.ndarray:
        """Return a normalised EMBEDDING_DIM-d float64 feature vector."""
        thumb = image.resize((64, 64), PILModule.Resampling.LANCZOS)
        arr = np.array(thumb, dtype=np.float32)
        r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
        n = float(r.size)

        def hist(ch: np.ndarray) -> np.ndarray:
            h, _ = np.histogram(ch.ravel(), bins=8, range=(0.0, 255.0))
            return h.astype(np.float32) / n

        gray = (r + g + b) / 3.0
        h_diff = np.diff(gray, axis=1)
        v_diff = np.diff(gray, axis=0)
        sharpness = min(float(np.var(h_diff) + np.var(v_diff)) / 5_000.0, 1.0)

        vec = np.concatenate([
            hist(r),
            hist(g),
            hist(b),
            [
                float(gray.mean()) / 255.0,
                float(gray.std()) / 128.0,
                sharpness,
                float(np.std(arr)) / 128.0,
            ],
        ])  # shape: (28,)

        norm = np.linalg.norm(vec)
        return (vec / norm if norm > 0 else vec).astype(np.float64)
