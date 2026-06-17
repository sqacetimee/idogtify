"""
Prediction service.

The pipeline is initialised once at module import time and reused across
requests.  When real PyTorch models are added, model loading happens inside
DogBreedPipeline.__init__() — no changes needed here.
"""
from __future__ import annotations

from typing import TYPE_CHECKING

from app.ml.pipeline import DogBreedPipeline
from app.models.schemas import PredictionResponse

if TYPE_CHECKING:
    from PIL.Image import Image as PILImage

# TODO: When using FastAPI lifespan events, move _pipeline instantiation
#       into the lifespan handler so startup errors surface clearly.
_pipeline = DogBreedPipeline()


def predict(image: "PILImage") -> PredictionResponse:
    """Run the full breed identification pipeline on an RGB PIL image."""
    return _pipeline.run(image)
