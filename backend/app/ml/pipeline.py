"""
Full dog breed identification pipeline.

Orchestrates all ML stages in order.  Initialised once per process; every
/predict request calls pipeline.run(image).

Replacement path (when real models are ready):
  1. Load detector model (YOLO / RT-DETR) in __init__ via torch / ultralytics.
  2. Load backbone extractor (EfficientNet / ConvNeXt) in __init__ via timm.
  3. Load classifier head (nn.Linear) in __init__ via torch.load().
  4. Rebuild BreedPrototypeDatabase from real averaged embeddings.
  5. The rest of the pipeline (scorer, confidence) is unchanged.

TODO: Wrap model loading in a FastAPI lifespan event so the pipeline is
      available before the first request and shut down cleanly on exit.
"""
from __future__ import annotations

import time
from typing import TYPE_CHECKING

import numpy as np
from PIL import Image as PILModule

from app.core.config import MODEL_VERSION
from app.ml.breed_database import BreedPrototypeDatabase
from app.ml.confidence import calibrate
from app.ml.detector import DogDetector
from app.ml.feature_extractor import FeatureExtractor
from app.ml.quality import ImageQualityAnalyzer
from app.ml.real_classifier import RealDogClassifier
from app.ml.scorer import HybridBreedScorer
from app.models.schemas import BreedPrediction, PredictionResponse

if TYPE_CHECKING:
    from PIL.Image import Image as PILImage

# Initialised once at import time; downloads EfficientNet-B0 weights (~21 MB)
# on first run, then loads from cache.
_real_classifier = RealDogClassifier()


# ── Mock classifier ──────────────────────────────────────────────────────────
# Maps breed names to colour-feature weights.
# TODO: Replace _mock_classifier() with a real PyTorch forward pass:
#       logits = classifier_head(backbone(preprocessed_image))
#       probs  = F.softmax(logits, dim=-1)

_CLASSIFIER_WEIGHTS: dict[str, dict[str, float]] = {
    "Golden Retriever":               {"golden": 3.8, "white": 0.3},
    "Labrador Retriever (Yellow)":    {"golden": 2.0, "white": 1.5},
    "Labrador Retriever (Black)":     {"black": 3.5},
    "Labrador Retriever (Chocolate)": {"brown": 3.2},
    "German Shepherd":                {"brown": 1.5, "black": 2.0, "golden": 0.4},
    "Border Collie":                  {"black": 2.0, "white": 1.5, "variance": 0.8},
    "Poodle (White)":                 {"white": 3.0},
    "Poodle (Gray)":                  {"gray": 2.8},
    "Siberian Husky":                 {"gray": 2.0, "white": 1.5, "black": 0.8},
    "Alaskan Malamute":               {"gray": 1.8, "white": 1.2, "black": 0.8},
    "Beagle":                         {"brown": 1.5, "white": 0.8, "black": 0.8},
    "Bulldog":                        {"fawn": 2.5, "white": 0.8},
    "Chihuahua":                      {"golden": 1.0, "fawn": 1.8},
    "Dachshund":                      {"brown": 2.5, "golden": 0.8, "red": 0.5},
    "Boxer":                          {"fawn": 2.3, "white": 0.6},
    "Australian Shepherd":            {"gray": 1.0, "brown": 0.8, "variance": 0.8},
    "Irish Setter":                   {"red": 4.0, "golden": 0.4},
    "Weimaraner":                     {"gray": 4.0},
    "Samoyed":                        {"white": 4.5},
    "Pomeranian":                     {"golden": 2.5, "white": 0.5},
    "Shih Tzu":                       {"white": 2.0, "golden": 0.8, "gray": 0.4},
}


def _colour_features(arr: np.ndarray) -> dict[str, float]:
    """Extract raw colour fractions used by the mock classifier."""
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    brightness = (r + g + b) / 3.0
    n = float(r.size)

    def pct(*conds) -> float:
        m = conds[0].copy()
        for c in conds[1:]:
            m = m & c
        return float(np.sum(m)) / n

    return {
        "golden":   pct(r > 165, g > 100, b < 115, r > g * 1.08, r > b * 1.5),
        "white":    pct(brightness > 195),
        "black":    pct(brightness < 50),
        "brown":    pct(r > 80, r < 170, g > 35, g < 110, b < 70, r > b * 1.4),
        "gray":     pct(brightness > 80, brightness < 168,
                        np.abs(r - g) < 28, np.abs(g - b) < 28),
        "red":      pct(r > 125, g < 85, b < 70, r > g * 1.8),
        "fawn":     pct(r > 148, r < 230, g > 95, g < 178, b < 115,
                        r > g * 1.05, r > b * 1.3),
        "variance": float(np.std(brightness)) / 80.0,
    }


def _mock_classifier(image: "PILImage") -> dict[str, float]:
    """
    Colour-logit mock classifier → breed probability distribution.

    TODO: Replace with:
        preprocessed = transform(image).unsqueeze(0).to(device)
        with torch.no_grad():
            logits = model(preprocessed)
        probs = torch.softmax(logits, dim=-1).squeeze().cpu().numpy()
        return dict(zip(BREED_NAMES, probs.tolist()))
    """
    arr = np.array(
        image.resize((96, 96), PILModule.Resampling.LANCZOS), dtype=np.float32
    )
    feats = _colour_features(arr)
    breeds = list(_CLASSIFIER_WEIGHTS.keys())

    raw = np.array(
        [
            sum(feats.get(feat, 0.0) * w for feat, w in _CLASSIFIER_WEIGHTS[b].items())
            for b in breeds
        ],
        dtype=np.float64,
    )

    # Softmax (T = 0.30 → sharp discrimination on clear colour signals)
    T = 0.30
    e = np.exp(raw / T - raw.max() / T)
    probs = e / e.sum()

    return dict(zip(breeds, probs.tolist()))


# ── Pipeline ─────────────────────────────────────────────────────────────────


class DogBreedPipeline:
    """
    Stateless prediction pipeline.  Stateful components (models, databases)
    are owned by this instance and initialised once.

    Steps
    -----
    1  Image already validated (content-type, size, RGB) by image utility.
    2  Dog detection  →  abort early if no dog found.
    3  Image quality scoring.
    4  Crop to detection bbox (mock: ~90 % of frame).
    5  Extract 28-d visual embedding.
    6  Mock breed classifier  →  {breed: probability}.
    7  Cosine similarity search against breed prototype database.
    8  Hybrid score fusion (HybridBreedScorer).
    9  Confidence calibration + mixed-breed logic.
    10 Return PredictionResponse.
    """

    def __init__(self) -> None:
        self.detector  = DogDetector()
        self.quality   = ImageQualityAnalyzer()
        self.extractor = FeatureExtractor()
        self.db        = BreedPrototypeDatabase()
        self.scorer    = HybridBreedScorer()

    def run(self, image: "PILImage") -> PredictionResponse:
        start = time.perf_counter()

        # Step 2 — Dog detection
        detection = self.detector.detect(image)

        # Step 3 — Early exit: no dog
        if not detection.dog_detected:
            return PredictionResponse(
                predictions=[],
                mixed_breed_likely=False,
                confidence="low",
                label="No pup detected yet",
                dog_detected=False,
                image_quality="poor",
                quality_warnings=["Try showing your dog's face and body more clearly."],
                inference_time_ms=int((time.perf_counter() - start) * 1000),
                model_version=MODEL_VERSION,
                explanation="No dog detected. Try a clearer photo with good lighting.",
            )

        # Step 4 — Quality scoring
        quality = self.quality.analyze(image)

        # Step 5 — Crop to bbox
        if detection.bbox:
            b = detection.bbox
            w, h = image.size
            x1, y1 = max(0, b.x1), max(0, b.y1)
            x2, y2 = min(w, b.x2), min(h, b.y2)
            if x2 > x1 and y2 > y1:
                image = image.crop((x1, y1, x2, y2))

        # Step 6 — Visual embedding
        embedding = self.extractor.extract(image)

        # Step 7 — Breed classifier
        # Uses real EfficientNet-B0 when available; falls back to colour mock.
        if _real_classifier.is_available:
            classifier_scores = _real_classifier.classify(image)
        else:
            classifier_scores = _mock_classifier(image)

        # Step 8 — Prototype similarity search
        similarity_results = self.db.find_similar(embedding, top_k=8)

        # Step 9 — Hybrid score fusion
        scored = self.scorer.score(
            classifier_scores=classifier_scores,
            similarity_results=similarity_results,
            detection_confidence=detection.detection_confidence,
            quality_score=quality.quality_score,
            top_k=4,
        )

        # Step 10 — Confidence calibration
        conf = calibrate(
            breeds=scored,
            detection_confidence=detection.detection_confidence,
            quality_score=quality.quality_score,
            quality_label=quality.quality_label,
        )

        return PredictionResponse(
            predictions=[
                BreedPrediction(
                    breed=b.breed,
                    probability=b.probability,
                    classifier_score=b.classifier_score,
                    similarity_score=b.similarity_score,
                )
                for b in scored
            ],
            mixed_breed_likely=conf.mixed_breed_likely,
            confidence=conf.confidence,
            label=conf.label,
            dog_detected=True,
            image_quality=quality.quality_label,
            quality_warnings=quality.warnings,
            inference_time_ms=int((time.perf_counter() - start) * 1000),
            model_version=MODEL_VERSION,
            explanation=conf.explanation,
        )
