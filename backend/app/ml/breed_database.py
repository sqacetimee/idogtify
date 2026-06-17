"""
Breed prototype database.

Stores one embedding per breed (or per coat variant).  At query time, cosine
similarity between an incoming image embedding and each prototype ranks breeds
by visual closeness.

Current implementation:
  Prototypes are generated from synthetic colour-patch images so they inhabit
  the same embedding space as real image embeddings from FeatureExtractor.

Production implementation (post-training):
  1. Run all Stanford Dogs training images through FeatureExtractor.
  2. Average embeddings per breed → one prototype vector per breed.
  3. Optionally cluster within breeds (e.g. yellow / black / chocolate Labs).
  4. Persist as a .npy file; load once at startup.
  5. Optional FAISS index for sub-millisecond search over thousands of prototypes.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from PIL import Image as PILModule

from app.ml.feature_extractor import FeatureExtractor


@dataclass
class BreedPrototype:
    name: str
    embedding: np.ndarray   # L2-normalised, shape (EMBEDDING_DIM,)
    primary_trait: str
    description: str


# ── Breed colour profiles ────────────────────────────────────────────────────
# Each entry defines stripe colours (RGB, weight) for a synthetic 64×64 patch.
# Multi-stripe entries approximate bimodal / tricolour coat distributions.
# These act as stand-ins for real per-breed average embeddings.
_PROFILES: dict[str, dict] = {
    "Golden Retriever": {
        "stripes": [((205, 138, 58), 0.70), ((240, 185, 90), 0.30)],
        "trait": "Golden/honey coat",
        "desc": "Large, friendly breed with a distinctive golden-yellow coat.",
    },
    "Labrador Retriever (Yellow)": {
        "stripes": [((220, 180, 110), 0.80), ((245, 210, 155), 0.20)],
        "trait": "Cream/yellow coat",
        "desc": "Athletic breed with a short cream-to-yellow coat.",
    },
    "Labrador Retriever (Black)": {
        "stripes": [((35, 30, 28), 0.90), ((70, 60, 55), 0.10)],
        "trait": "Black short coat",
        "desc": "Athletic breed with a solid jet-black coat.",
    },
    "Labrador Retriever (Chocolate)": {
        "stripes": [((110, 60, 35), 0.80), ((155, 90, 55), 0.20)],
        "trait": "Chocolate-brown coat",
        "desc": "Athletic breed with a rich dark-chocolate coat.",
    },
    "German Shepherd": {
        "stripes": [((100, 70, 25), 0.50), ((35, 30, 25), 0.50)],
        "trait": "Black and tan saddle pattern",
        "desc": "Confident, large working breed with a black-and-tan pattern.",
    },
    "Border Collie": {
        "stripes": [((25, 22, 20), 0.55), ((220, 215, 210), 0.45)],
        "trait": "Black and white coat",
        "desc": "Highly intelligent herding breed, typically black and white.",
    },
    "Poodle (White)": {
        "stripes": [((230, 228, 222), 0.85), ((200, 198, 192), 0.15)],
        "trait": "White curly coat",
        "desc": "Elegant breed with a dense white curly coat.",
    },
    "Poodle (Gray)": {
        "stripes": [((140, 138, 135), 0.90), ((100, 98, 95), 0.10)],
        "trait": "Silver-gray curly coat",
        "desc": "Elegant breed with a silvery-gray curly coat.",
    },
    "Siberian Husky": {
        "stripes": [((160, 155, 150), 0.40), ((220, 218, 215), 0.40), ((40, 35, 32), 0.20)],
        "trait": "Gray, white, and black wolf-like coat",
        "desc": "Arctic breed with striking coat patterns and piercing eyes.",
    },
    "Alaskan Malamute": {
        "stripes": [((145, 140, 130), 0.45), ((215, 212, 205), 0.35), ((50, 45, 38), 0.20)],
        "trait": "Gray and white thick coat",
        "desc": "Powerful sled dog with a dense double coat.",
    },
    "Beagle": {
        "stripes": [((165, 105, 40), 0.45), ((225, 215, 200), 0.35), ((40, 35, 30), 0.20)],
        "trait": "Brown, white, and black tricolor",
        "desc": "Compact hound with a classic tricolour coat.",
    },
    "Bulldog": {
        "stripes": [((195, 155, 115), 0.60), ((225, 200, 170), 0.30), ((240, 235, 228), 0.10)],
        "trait": "Fawn and white wrinkled coat",
        "desc": "Stocky breed with loose, wrinkled skin and a broad head.",
    },
    "Chihuahua": {
        "stripes": [((195, 145, 65), 0.60), ((225, 185, 115), 0.40)],
        "trait": "Fawn/tan coat",
        "desc": "Smallest recognized breed; alert and confident.",
    },
    "Dachshund": {
        "stripes": [((130, 75, 30), 0.75), ((80, 45, 18), 0.25)],
        "trait": "Red/brown long-bodied coat",
        "desc": "Long-bodied, short-legged scent hound.",
    },
    "Boxer": {
        "stripes": [((190, 140, 70), 0.65), ((210, 195, 175), 0.25), ((35, 30, 28), 0.10)],
        "trait": "Fawn with white markings",
        "desc": "Athletic medium-large breed with a fawn or brindle coat.",
    },
    "Australian Shepherd": {
        "stripes": [((120, 95, 75), 0.35), ((45, 40, 50), 0.35), ((215, 210, 205), 0.30)],
        "trait": "Merle/tricolor herding coat",
        "desc": "Energetic herding breed with a striking merle or tricolor coat.",
    },
    "Irish Setter": {
        "stripes": [((160, 65, 25), 0.80), ((195, 90, 40), 0.20)],
        "trait": "Mahogany-red silky coat",
        "desc": "Elegant sporting breed with a rich mahogany-red coat.",
    },
    "Weimaraner": {
        "stripes": [((150, 145, 135), 0.90), ((125, 120, 112), 0.10)],
        "trait": "Silver-gray short coat",
        "desc": "Sleek athletic breed with a distinctive silver-gray coat.",
    },
    "Samoyed": {
        "stripes": [((242, 240, 236), 0.80), ((255, 253, 250), 0.20)],
        "trait": "Bright white fluffy coat",
        "desc": "Fluffy white Arctic breed with a perpetual 'Sammy smile'.",
    },
    "Pomeranian": {
        "stripes": [((215, 145, 55), 0.70), ((245, 195, 95), 0.30)],
        "trait": "Foxy golden-orange double coat",
        "desc": "Tiny spitz breed with a bold foxy face and full double coat.",
    },
    "Shih Tzu": {
        "stripes": [((210, 190, 155), 0.50), ((245, 240, 232), 0.30), ((90, 75, 60), 0.20)],
        "trait": "Long flowing multi-colour coat",
        "desc": "Toy breed with a long silky coat and distinctively flat face.",
    },
}


def _make_synthetic_image(stripes: list[tuple[tuple[int, int, int], float]]):
    """Create a 64×64 RGB image from horizontal colour stripes."""
    arr = np.zeros((64, 64, 3), dtype=np.uint8)
    row = 0
    for rgb, weight in stripes:
        nrows = max(1, int(round(64 * weight)))
        arr[row: row + nrows, :] = rgb
        row += nrows
    if row < 64:
        arr[row:, :] = stripes[-1][0]
    return PILModule.fromarray(arr)


class BreedPrototypeDatabase:
    """
    In-memory store of breed prototype embeddings.

    At initialisation, synthetic colour-patch images are generated for each
    breed and embedded via FeatureExtractor.  This ensures prototypes inhabit
    exactly the same vector space as real image embeddings.

    find_similar() returns breeds ranked by cosine similarity (dot product of
    two L2-normalised vectors).
    """

    def __init__(self) -> None:
        extractor = FeatureExtractor()
        self._prototypes: list[BreedPrototype] = [
            BreedPrototype(
                name=name,
                embedding=extractor.extract(_make_synthetic_image(p["stripes"])),
                primary_trait=p["trait"],
                description=p["desc"],
            )
            for name, p in _PROFILES.items()
        ]

    def find_similar(self, query: np.ndarray, top_k: int = 8) -> list[dict]:
        """
        Return top_k breeds sorted descending by cosine similarity.

        Returns list of dicts: {breed, similarity_score, description}.
        """
        results = [
            {
                "breed": proto.name,
                "similarity_score": round(max(float(np.dot(query, proto.embedding)), 0.0), 4),
                "description": proto.description,
            }
            for proto in self._prototypes
        ]
        results.sort(key=lambda x: x["similarity_score"], reverse=True)
        return results[:top_k]

    @property
    def breed_names(self) -> list[str]:
        return [p.name for p in self._prototypes]
