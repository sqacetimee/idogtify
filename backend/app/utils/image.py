import io

from PIL import Image, UnidentifiedImageError
from fastapi import HTTPException, UploadFile

from app.core.config import ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES


def validate_content_type(content_type: str | None) -> None:
    if not content_type or content_type not in ALLOWED_IMAGE_TYPES:
        readable = ", ".join(sorted(ALLOWED_IMAGE_TYPES))
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported media type '{content_type}'. Accepted: {readable}.",
        )


async def read_image(upload: UploadFile) -> Image.Image:
    validate_content_type(upload.content_type)

    data = await upload.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail="Image exceeds the 10 MB size limit.",
        )
    if not data:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        img = Image.open(io.BytesIO(data))
        return img.convert("RGB")
    except UnidentifiedImageError:
        raise HTTPException(
            status_code=400,
            detail="Could not identify image format. The file may be corrupt or unsupported.",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to process image: {exc}",
        )


def image_metadata(img: Image.Image) -> dict:
    return {"width": img.width, "height": img.height, "mode": img.mode}
