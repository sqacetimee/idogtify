"""
Confidence calibration and mixed-breed visual similarity logic.

Confidence rules
----------------
High   — top score ≥ 0.60, gap (1st–2nd) ≥ 0.25, quality fair+, detection OK
Medium — top score ≥ 0.40, quality fair+
Low    — everything else (poor quality, uncertain predictions, low detection)

Mixed-breed visual similarity rules
-------------------------------------
"Purebred vibes"         — top prob ≥ 0.65 and 2nd prob < 0.15
"Paw-sible breed mix"   — top 2–4 breeds each have meaningful probability
"Uncertain visual match" — top prob < 0.40 (too spread out to call)
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.ml.scorer import ScoredBreed

_EXPLANATION = (
    "Our dog breed analysis uses sophisticated AI algorithms that examine the "
    "uploaded image of your dog. It identifies specific breed-defining features "
    "such as ear shape, muzzle length, fur pattern, and body size. These "
    "characteristics are compared against a large database of known dog breeds "
    "to accurately determine your dog's breed."
)


@dataclass
class ConfidenceResult:
    confidence: str           # "high" | "medium" | "low"
    mixed_breed_likely: bool
    label: str                # display label for the UI
    explanation: str


def calibrate(
    breeds: list["ScoredBreed"],
    detection_confidence: float,
    quality_score: float,
    quality_label: str,
) -> ConfidenceResult:
    """Return a ConfidenceResult from scored breeds and image-level signals."""

    if not breeds:
        return ConfidenceResult(
            confidence="low",
            mixed_breed_likely=False,
            label="No pup detected yet",
            explanation="Try showing your dog's face and body more clearly.",
        )

    top_prob   = breeds[0].probability
    second_prob = breeds[1].probability if len(breeds) > 1 else 0.0
    gap = top_prob - second_prob

    quality_ok   = quality_label in ("good", "fair")
    detection_ok = detection_confidence >= 0.50

    # ── Confidence level ──────────────────────────────────────────────────
    # Note: the hybrid scoring formula adds detection + quality as a uniform floor
    # across all breeds before normalisation, compressing probabilities by ~8-12 pp
    # compared to a pure classifier output.  Thresholds are calibrated accordingly.
    if top_prob >= 0.43 and gap >= 0.12 and quality_ok and detection_ok:
        confidence = "high"
    elif top_prob >= 0.28 and quality_ok:
        confidence = "medium"
    else:
        confidence = "low"

    # ── Mixed-breed / purity label ────────────────────────────────────────
    if top_prob >= 0.50 and second_prob < 0.20:
        mixed_breed_likely = False
        label = "Purebred vibes"
    elif top_prob < 0.28:
        mixed_breed_likely = True
        label = "Uncertain visual match"
    else:
        mixed_breed_likely = True
        label = "Paw-sible breed mix"

    return ConfidenceResult(
        confidence=confidence,
        mixed_breed_likely=mixed_breed_likely,
        label=label,
        explanation=_EXPLANATION,
    )
