from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import MODEL_VERSION, SERVICE_NAME
from app.db.database import get_db
from app.db.models import BreedMetadata
from app.models.schemas import (
    BreedMetadataOut,
    BreedPrediction,
    HealthResponse,
    PredictionResponse,
)
from app.services import predictor
from app.utils.image import read_image

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        service=SERVICE_NAME,
        model_version=MODEL_VERSION,
    )


@router.post("/predict", response_model=PredictionResponse)
async def predict(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> PredictionResponse:
    if not file.filename and not file.content_type:
        raise HTTPException(status_code=400, detail="No image file provided.")

    image  = await read_image(file)
    result = predictor.predict(image)

    # Enrich each prediction with breed metadata from the database
    enriched: list[BreedPrediction] = []
    for pred in result.predictions:
        meta = (
            db.query(BreedMetadata)
            .filter(func.lower(BreedMetadata.name) == pred.breed.lower())
            .first()
        )
        enriched.append(
            BreedPrediction(
                breed            = pred.breed,
                probability      = pred.probability,
                classifier_score = pred.classifier_score,
                similarity_score = pred.similarity_score,
                metadata         = BreedMetadataOut.model_validate(meta) if meta else None,
            )
        )

    return PredictionResponse(
        predictions       = enriched,
        mixed_breed_likely= result.mixed_breed_likely,
        confidence        = result.confidence,
        label             = result.label,
        dog_detected      = result.dog_detected,
        image_quality     = result.image_quality,
        quality_warnings  = result.quality_warnings,
        inference_time_ms = result.inference_time_ms,
        model_version     = result.model_version,
        explanation       = result.explanation,
    )
