from typing import Literal
from pydantic import BaseModel, Field


class BreedMetadataOut(BaseModel):
    description  : str | None = None
    temperament  : str | None = None
    size         : str | None = None
    origin       : str | None = None
    lifespan     : str | None = None
    energy_level : str | None = None
    shedding     : str | None = None
    fun_fact     : str | None = None

    model_config = {"from_attributes": True}


class BreedPrediction(BaseModel):
    breed            : str
    probability      : float
    classifier_score : float = 0.0
    similarity_score : float = 0.0
    metadata         : BreedMetadataOut | None = None


class PredictionResponse(BaseModel):
    predictions      : list[BreedPrediction]
    mixed_breed_likely: bool
    confidence       : Literal["high", "medium", "low"]
    label            : str = ""
    dog_detected     : bool = True
    image_quality    : str = "good"
    quality_warnings : list[str] = Field(default_factory=list)
    inference_time_ms: int
    model_version    : str
    explanation      : str


class HealthResponse(BaseModel):
    status        : str
    service       : str
    model_version : str
