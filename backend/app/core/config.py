import os

APP_NAME     = "iDogtify"
SERVICE_NAME = "idogtify-api"
MODEL_VERSION = "idogtify-efficientnet-v1"

ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    os.getenv("FRONTEND_URL", ""),   # set in production: https://your-app.vercel.app
]

ALLOWED_IMAGE_TYPES: frozenset[str] = frozenset({
    "image/jpeg", "image/jpg", "image/png",
    "image/webp", "image/gif", "image/bmp", "image/tiff",
})

MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB

# HuggingFace Hub — set this to auto-download the trained model on startup.
# Format: "your-username/idogtify-model"
HF_MODEL_REPO = os.getenv("HF_MODEL_REPO", "")
HF_MODEL_FILE = os.getenv("HF_MODEL_FILE", "dog_breed_classifier.pth")
