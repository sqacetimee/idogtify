"""
Hybrid breed scorer.

Combines classifier probabilities and embedding similarity to rank breeds.

Detection confidence and image quality are intentionally excluded from the
probability distribution — adding them as a uniform floor across every breed
compresses the winner's probability without changing the ranking. Instead,
those signals feed into confidence calibration (confidence.py) which controls
the high / medium / low label and UI warnings.

Formula:
  final_score = 0.65 × classifier_probability + 0.35 × embedding_similarity
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass
class ScoredBreed:
    breed: str
    probability: float       # normalised 0–1
    classifier_score: float  # raw classifier output for this breed
    similarity_score: float  # cosine similarity to breed prototype


class HybridBreedScorer:
    """
    Merges classifier probabilities and prototype embedding similarities into
    a sharp, normalised probability distribution.

    W_CLASSIFIER is high because we now have a real trained model (90.9% top-1
    on Stanford Dogs). W_SIMILARITY provides a re-ranking boost for breeds that
    also match visually in the embedding space.
    """

    W_CLASSIFIER = 0.90
    W_SIMILARITY = 0.10

    def score(
        self,
        classifier_scores: dict[str, float],
        similarity_results: list[dict],
        detection_confidence: float,   # used by confidence.py, not here
        quality_score: float,          # used by confidence.py, not here
        top_k: int = 4,
    ) -> list[ScoredBreed]:
        """
        Args:
            classifier_scores: breed → probability mapping (sums ≈ 1.0).
            similarity_results: list of {breed, similarity_score} dicts.
            detection_confidence: passed through to caller for confidence calibration.
            quality_score: passed through to caller for confidence calibration.
            top_k: number of breeds to return.

        Returns:
            top_k ScoredBreed objects, probabilities summing to 1.0.
        """
        sim_lookup = {r["breed"]: r["similarity_score"] for r in similarity_results}
        all_breeds = set(classifier_scores) | sim_lookup.keys()

        raw: list[tuple[str, float, float, float]] = []
        for breed in all_breeds:
            cls_p = classifier_scores.get(breed, 0.0)
            sim_p = sim_lookup.get(breed, 0.0)
            final = self.W_CLASSIFIER * cls_p + self.W_SIMILARITY * sim_p
            raw.append((breed, final, cls_p, sim_p))

        raw.sort(key=lambda x: x[1], reverse=True)
        top = raw[:top_k]

        total = sum(s[1] for s in top) or 1.0
        return [
            ScoredBreed(
                breed=breed,
                probability=round(score / total, 3),
                classifier_score=round(cls_p, 3),
                similarity_score=round(sim_p, 3),
            )
            for breed, score, cls_p, sim_p in top
        ]
